/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HazardSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'flagged' | 'reviewed' | 'resolved';

export interface Incident {
  id: string;
  timestamp: number;
  hazard_type: string;
  description: string;
  severity: HazardSeverity;
  snapshotBase64?: string;
  status: IncidentStatus;
  location?: string;
  oshaStandard?: string;
  confidence?: number;
  notes?: string;
}

export interface IngestIncidentRequest {
  hazard_type: string;
  description: string;
  severity: HazardSeverity;
  snapshotBase64?: string;
  location?: string;
  oshaStandard?: string;
}

export interface IngestIncidentResponse {
  success: boolean;
  incident: Incident;
  message: string;
}

export interface AuditSession {
  id: string;
  title: string;
  facility: string;
  auditorName: string;
  startTime: number;
  endTime?: number;
  isActive: boolean;
  totalFramesAnalyzed: number;
  complianceScore: number;
  incidents: Incident[];
}

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'simulated';

export interface BidiGenerateContentSetup {
  setup: {
    model: string;
    generationConfig?: {
      responseModalities?: string[];
      speechConfig?: {
        voiceConfig?: {
          prebuiltVoiceConfig?: {
            voiceName: string;
          };
        };
      };
    };
    systemInstruction: {
      parts: Array<{ text: string }>;
    };
    tools: Array<{
      functionDeclarations: Array<{
        name: string;
        description: string;
        parameters: {
          type: string;
          properties: Record<string, {
            type: string;
            description?: string;
            enum?: string[];
          }>;
          required: string[];
        };
      }>;
    }>;
  };
}

export interface RealtimeInputPayload {
  realtimeInput?: {
    mediaChunks?: Array<{
      mimeType: string;
      data: string;
    }>;
  };
  audio?: {
    mimeType: string;
    data: string;
  };
  video?: {
    mimeType: string;
    data: string;
  };
}

export interface ToolCallMessage {
  toolCall?: {
    functionCalls: Array<{
      id: string;
      name: string;
      args: {
        hazard_type: string;
        description: string;
        severity: HazardSeverity;
        [key: string]: unknown;
      };
    }>;
  };
}

export interface ToolResponseMessage {
  toolResponse: {
    functionResponses: Array<{
      response: {
        output: Record<string, unknown>;
      };
      id: string;
    }>;
  };
}

export interface LiveServerMessage {
  serverContent?: {
    modelTurn?: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
  toolCall?: {
    functionCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };
}

export interface StreamStats {
  fps: number;
  framesSent: number;
  audioChunksSent: number;
  audioChunksReceived: number;
  sessionDuration: number;
  latencyMs: number;
}
