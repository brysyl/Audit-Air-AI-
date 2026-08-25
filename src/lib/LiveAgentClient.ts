/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  HazardSeverity,
  Incident,
  IngestIncidentRequest,
  LiveServerMessage,
  SocketStatus,
  ToolResponseMessage
} from '../types/audit';

export interface LiveAgentClientCallbacks {
  onStatusChange: (status: SocketStatus, errorMsg?: string) => void;
  onAudioChunk: (base64Audio: string) => void;
  onTranscript: (text: string) => void;
  onIncidentLogged: (incident: Incident) => void;
  onInterrupted?: () => void;
}

export interface LiveAgentClientConfig {
  apiKey?: string;
  wsUrl?: string;
  model?: string;
  systemInstruction?: string;
  enableSimulation?: boolean;
}

export class LiveAgentClient {
  private ws: WebSocket | null = null;
  private status: SocketStatus = 'disconnected';
  private callbacks: LiveAgentClientCallbacks;
  private config: LiveAgentClientConfig;
  private latestSnapshotGetter: (() => string | null) | null = null;
  private simInterval: number | null = null;
  private reconnectTimer: number | null = null;
  private framesSentCount = 0;
  private audioSentCount = 0;

  constructor(
    callbacks: LiveAgentClientCallbacks,
    config: LiveAgentClientConfig = {}
  ) {
    this.callbacks = callbacks;
    this.config = {
      model: 'models/gemini-2.0-flash-exp',
      systemInstruction:
        'You are Audit Air AI, a hands-free industrial safety compliance auditor. Monitor the camera stream continuously. When a safety or compliance hazard is detected, call the log_incident function immediately with details, then concisely notify the auditor verbally.',
      ...config,
    };
  }

  public setSnapshotGetter(getter: () => string | null): void {
    this.latestSnapshotGetter = getter;
  }

  public getStatus(): SocketStatus {
    return this.status;
  }

  public getFramesSentCount(): number {
    return this.framesSentCount;
  }

  public getAudioSentCount(): number {
    return this.audioSentCount;
  }

  /**
   * Establishes the WebSocket connection to Gemini Live or Server relay.
   */
  public async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    // If simulation mode is explicitly enabled
    if (this.config.enableSimulation) {
      this.startSimulation();
      return;
    }

    try {
      let targetWsUrl = this.config.wsUrl;

      if (!targetWsUrl) {
        if (this.config.apiKey) {
          targetWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.config.apiKey}`;
        } else {
          // Connect through local backend WebSocket relay
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          targetWsUrl = `${protocol}//${window.location.host}/ws/live`;
        }
      }

      this.ws = new WebSocket(targetWsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.sendSetupPayload();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (event: Event) => {
        console.warn('WebSocket error encountered:', event);
        this.setStatus('error', 'WebSocket connection error');
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        if (this.status !== 'disconnected') {
          this.setStatus('disconnected');
        }
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect WebSocket';
      console.warn('LiveAgentClient connection failure:', errorMsg);
      this.setStatus('error', errorMsg);
    }
  }

  /**
   * Disconnects the socket and cleans up all timers.
   */
  public disconnect(): void {
    this.stopSimulation();
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Sends the initial BidiGenerateContentSetup configuration.
   */
  private sendSetupPayload(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupPayload = {
      setup: {
        model: this.config.model || 'models/gemini-2.0-flash-exp',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck',
              },
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text:
                this.config.systemInstruction ||
                'You are Audit Air AI, a hands-free industrial safety compliance auditor. Monitor the camera stream continuously. When a safety or compliance hazard is detected, call the log_incident function immediately with details, then concisely notify the auditor verbally.',
            },
          ],
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: 'log_incident',
                description: 'Logs a compliance or safety violation detected in the video stream.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    hazard_type: {
                      type: 'STRING',
                      description: 'e.g., Missing PPE, Blocked Fire Exit, Liquid Spill, Unguarded Machine, Trip Hazard',
                    },
                    description: {
                      type: 'STRING',
                      description: 'Concise detail on the observed violation and location/context',
                    },
                    severity: {
                      type: 'STRING',
                      enum: ['low', 'medium', 'high', 'critical'],
                      description: 'OSHA / ISO hazard severity category',
                    },
                  },
                  required: ['hazard_type', 'description', 'severity'],
                },
              },
            ],
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(setupPayload));
  }

  /**
   * Streams a single 1 FPS base64 JPEG image frame.
   */
  public sendImageFrame(base64ImageWithoutPrefix: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.framesSentCount++;

    const payload = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'image/jpeg',
            data: base64ImageWithoutPrefix,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Streams a 16kHz PCM audio chunk.
   */
  public sendAudioChunk(base64Pcm: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.audioSentCount++;

    const payload = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Handles incoming WebSocket messages from the Gemini Live server.
   */
  private async handleMessage(rawData: string | Blob | ArrayBuffer): Promise<void> {
    try {
      let textData = '';
      if (typeof rawData === 'string') {
        textData = rawData;
      } else if (rawData instanceof Blob) {
        textData = await rawData.text();
      } else if (rawData instanceof ArrayBuffer) {
        textData = new TextDecoder().decode(rawData);
      }

      if (!textData) return;

      const data: LiveServerMessage = JSON.parse(textData);

      // Check for audio / transcript in model turn
      if (data.serverContent?.modelTurn?.parts) {
        for (const part of data.serverContent.modelTurn.parts) {
          if (part.inlineData?.data) {
            this.callbacks.onAudioChunk(part.inlineData.data);
          }
          if (part.text) {
            this.callbacks.onTranscript(part.text);
          }
        }
      }

      // Check for interruption
      if (data.serverContent?.interrupted && this.callbacks.onInterrupted) {
        this.callbacks.onInterrupted();
      }

      // Intercept toolCall for log_incident
      if (data.toolCall?.functionCalls) {
        for (const call of data.toolCall.functionCalls) {
          if (call.name === 'log_incident') {
            await this.handleLogIncidentToolCall(
              call.id,
              call.args as { hazard_type: string; description: string; severity: HazardSeverity }
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }

  /**
   * Ingests the incident via POST /api/ingest and returns the tool response.
   */
  private async handleLogIncidentToolCall(
    callId: string,
    args: { hazard_type: string; description: string; severity: HazardSeverity }
  ): Promise<void> {
    const currentSnapshot = this.latestSnapshotGetter ? this.latestSnapshotGetter() : null;

    const ingestPayload: IngestIncidentRequest = {
      hazard_type: args.hazard_type || 'Safety Hazard',
      description: args.description || 'Compliance anomaly detected in visual stream',
      severity: args.severity || 'medium',
      snapshotBase64: currentSnapshot || undefined,
    };

    let createdIncident: Incident;

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingestPayload),
      });

      if (response.ok) {
        const json = await response.json();
        createdIncident = json.incident;
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch {
      // Fallback local incident creation if server offline
      createdIncident = {
        id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        hazard_type: ingestPayload.hazard_type,
        description: ingestPayload.description,
        severity: ingestPayload.severity,
        snapshotBase64: ingestPayload.snapshotBase64,
        status: 'flagged',
        oshaStandard: this.getOshaStandard(ingestPayload.hazard_type),
      };
    }

    this.callbacks.onIncidentLogged(createdIncident);

    // Send tool response back to WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const toolResponsePayload: ToolResponseMessage = {
        toolResponse: {
          functionResponses: [
            {
              id: callId,
              response: {
                output: {
                  status: 'logged',
                  incident_id: createdIncident.id,
                  timestamp: createdIncident.timestamp,
                },
              },
            },
          ],
        },
      };

      this.ws.send(JSON.stringify(toolResponsePayload));
    }
  }

  /**
   * Helper to map hazard categories to OSHA standard reference codes.
   */
  private getOshaStandard(hazardType: string): string {
    const lower = hazardType.toLowerCase();
    if (lower.includes('ppe') || lower.includes('helmet') || lower.includes('glasses') || lower.includes('glove')) {
      return 'OSHA 1910.132 (PPE)';
    }
    if (lower.includes('exit') || lower.includes('fire') || lower.includes('door') || lower.includes('egress')) {
      return 'OSHA 1910.36 (Exit Routes)';
    }
    if (lower.includes('spill') || lower.includes('liquid') || lower.includes('chemical') || lower.includes('wet')) {
      return 'OSHA 1910.22 (Walking-Working Surfaces)';
    }
    if (lower.includes('guard') || lower.includes('machine') || lower.includes('pinch')) {
      return 'OSHA 1910.212 (Machinery Guarding)';
    }
    if (lower.includes('electric') || lower.includes('wire') || lower.includes('cord')) {
      return 'OSHA 1910.303 (Electrical Systems)';
    }
    if (lower.includes('trip') || lower.includes('slip') || lower.includes('fall')) {
      return 'OSHA 1910.28 (Fall Protection)';
    }
    return 'OSHA 1910 General Duty Clause';
  }

  /**
   * Starts a simulation engine for instant testing and demonstrations.
   */
  public startSimulation(): void {
    this.stopSimulation();
    this.setStatus('simulated');

    const sampleHazards: Array<{
      hazard_type: string;
      description: string;
      severity: HazardSeverity;
      transcript: string;
    }> = [
      {
        hazard_type: 'Missing PPE (Hardhat / Eye Protection)',
        description: 'Personnel detected inside high-impact fabrication bay without certified headgear or safety goggles.',
        severity: 'high',
        transcript: 'Warning: Operator in Zone 2 is working without required safety eyewear and hardhat. Logging violation.',
      },
      {
        hazard_type: 'Blocked Fire Egress Route',
        description: 'Two wooden shipping pallets and cardboard boxes obstructing emergency exit pathway by 85%.',
        severity: 'critical',
        transcript: 'Critical hazard: Emergency exit corridor 4-B is severely obstructed by shipping materials.',
      },
      {
        hazard_type: 'Uncontained Coolant Spill',
        description: 'Hydraulic/coolant fluid slick approximately 1.5m wide expanding near machining cell #3.',
        severity: 'medium',
        transcript: 'Attention: Liquid accumulation detected near milling center. Slips and falls risk.',
      },
      {
        hazard_type: 'Exposed High-Voltage Junction',
        description: 'Enclosure panel open with unshielded 480V terminal blocks accessible to pedestrian traffic.',
        severity: 'critical',
        transcript: 'Immediate action required: 480V power distribution panel door is unsecured and open.',
      },
      {
        hazard_type: 'Trailing Power Cable Trip Hazard',
        description: 'High-amperage extension cord running across main forklift and pedestrian transit aisle.',
        severity: 'low',
        transcript: 'Notice: Extension lead across transit aisle requires cable ramp protector.',
      },
    ];

    let hazardIdx = 0;

    // Send an initial welcome transcript
    setTimeout(() => {
      this.callbacks.onTranscript('Audit Air AI active. Visual compliance scanner initialized at 1 frame per second.');
    }, 600);

    this.simInterval = window.setInterval(async () => {
      if (this.status !== 'simulated') return;

      const sample = sampleHazards[hazardIdx % sampleHazards.length];
      hazardIdx++;

      this.callbacks.onTranscript(sample.transcript);

      // Synthesize audio tone / verbal pulse if browser speech synthesis available
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(sample.transcript);
        utterance.rate = 1.05;
        utterance.pitch = 0.95;
        window.speechSynthesis.speak(utterance);
      }

      await this.handleLogIncidentToolCall(`sim_call_${Date.now()}`, {
        hazard_type: sample.hazard_type,
        description: sample.description,
        severity: sample.severity,
      });
    }, 12000);
  }

  public stopSimulation(): void {
    if (this.simInterval) {
      window.clearInterval(this.simInterval);
      this.simInterval = null;
    }
  }

  /**
   * Allows manually triggering an incident analysis on the current frame.
   */
  public async triggerManualAudit(notes?: string): Promise<Incident | null> {
    const currentSnapshot = this.latestSnapshotGetter ? this.latestSnapshotGetter() : null;

    // Call server multimodal analysis
    try {
      const res = await fetch('/api/audit-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotBase64: currentSnapshot,
          notes: notes || 'Manual audit trigger request by inspector',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.incident) {
          this.callbacks.onIncidentLogged(json.incident);
          if (json.transcript) {
            this.callbacks.onTranscript(json.transcript);
          }
          return json.incident;
        }
      }
    } catch (err) {
      console.warn('Manual audit server call failed, creating local flag:', err);
    }

    // Local fallback
    const localIncident: Incident = {
      id: `manual_${Date.now()}`,
      timestamp: Date.now(),
      hazard_type: 'Manual Safety Flag',
      description: notes || 'Auditor initiated manual spot inspection for compliance check.',
      severity: 'medium',
      snapshotBase64: currentSnapshot || undefined,
      status: 'flagged',
      oshaStandard: 'OSHA 1910 General Safety',
    };

    this.callbacks.onIncidentLogged(localIncident);
    this.callbacks.onTranscript('Manual hazard record logged to session compliance ledger.');
    return localIncident;
  }

  private setStatus(status: SocketStatus, errorMsg?: string): void {
    this.status = status;
    this.callbacks.onStatusChange(status, errorMsg);
  }
}
