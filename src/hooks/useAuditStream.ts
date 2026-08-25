/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioStreamManager } from '../lib/AudioProcessor';
import { LiveAgentClient } from '../lib/LiveAgentClient';
import {
  HazardSeverity,
  Incident,
  IncidentStatus,
  SocketStatus,
  StreamStats
} from '../types/audit';

export interface UseAuditStreamOptions {
  apiKey?: string;
  wsUrl?: string;
  facilityName?: string;
  auditorName?: string;
}

export function useAuditStream(options: UseAuditStreamOptions = {}) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [latestTranscript, setLatestTranscript] = useState<string>(
    'Audit Air AI standby. Ready to initiate safety compliance stream.'
  );
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  const [stats, setStats] = useState<StreamStats>({
    fps: 0,
    framesSent: 0,
    audioChunksSent: 0,
    audioChunksReceived: 0,
    sessionDuration: 0,
    latencyMs: 18,
  });

  // DOM and Instance references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioManagerRef = useRef<AudioStreamManager | null>(null);
  const clientRef = useRef<LiveAgentClient | null>(null);

  // Timers and metrics references
  const frameIntervalRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const frameCountWindowRef = useRef<number>(0);
  const lastFpsCalcTimeRef = useRef<number>(Date.now());
  const latestFrameBase64Ref = useRef<string | null>(null);

  /**
   * Captures a 1-FPS frame from the active video feed into base64 JPEG (quality: 0.5).
   */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      return null;
    }

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    const width = 640;
    const height = Math.round((video.videoHeight / video.videoWidth) * width) || 360;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);

    // Extract JPEG data URL at quality 0.5
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

    latestFrameBase64Ref.current = base64Data;
    return base64Data;
  }, []);

  /**
   * Helper getter for latest snapshot
   */
  const getLatestSnapshot = useCallback((): string | null => {
    if (latestFrameBase64Ref.current) {
      return latestFrameBase64Ref.current;
    }
    return captureFrame();
  }, [captureFrame]);

  /**
   * Initializes or updates camera & microphone streams.
   */
  const initHardwareStreams = useCallback(async (): Promise<MediaStream | null> => {
    try {
      // Release previous tracks if any
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }

      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn(`Could not get camera with facingMode=${cameraFacing}, falling back to default video constraints:`, err);
        constraints = {
          video: true,
          audio: true,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch((e) => console.log('Video play error:', e));
      }

      setIsCameraActive(true);

      // Start Audio Stream Manager
      if (!audioManagerRef.current) {
        audioManagerRef.current = new AudioStreamManager();
      }

      // Resume context on user action
      await audioManagerRef.current.initOutputContext();

      // Start capturing 16kHz PCM chunks and pipe to WebSocket
      await audioManagerRef.current.startMicCapture(stream, (base64Pcm) => {
        if (clientRef.current && (clientRef.current.getStatus() === 'connected' || clientRef.current.getStatus() === 'simulated')) {
          clientRef.current.sendAudioChunk(base64Pcm);
          setStats((prev) => ({
            ...prev,
            audioChunksSent: prev.audioChunksSent + 1,
          }));
        }
      });

      return stream;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera and microphone access denied';
      setErrorMessage(msg);
      console.error('Failed to initialize media stream:', err);
      return null;
    }
  }, [cameraFacing]);

  /**
   * Starts the full multimodal audit session.
   */
  const startAudit = useCallback(
    async (simulated = false) => {
      setErrorMessage(null);
      setIsAuditing(true);
      sessionStartTimeRef.current = Date.now();

      // Initialize hardware
      const stream = await initHardwareStreams();

      // Initialize client
      const client = new LiveAgentClient(
        {
          onStatusChange: (status, errorMsg) => {
            setSocketStatus(status);
            if (errorMsg) setErrorMessage(errorMsg);
          },
          onAudioChunk: (base64Audio) => {
            if (audioManagerRef.current) {
              audioManagerRef.current.playPcmChunk(base64Audio);
              setIsAiSpeaking(true);
              setTimeout(() => {
                if (audioManagerRef.current) {
                  setIsAiSpeaking(audioManagerRef.current.isAiSpeaking());
                }
              }, 500);
            }
            setStats((prev) => ({
              ...prev,
              audioChunksReceived: prev.audioChunksReceived + 1,
            }));
          },
          onTranscript: (text) => {
            setLatestTranscript(text);
          },
          onIncidentLogged: (incident) => {
            setIncidents((prev) => [incident, ...prev]);
          },
          onInterrupted: () => {
            if (audioManagerRef.current) {
              audioManagerRef.current.stopPlayback();
            }
            setIsAiSpeaking(false);
          },
        },
        {
          apiKey: options.apiKey,
          wsUrl: options.wsUrl,
          enableSimulation: simulated,
        }
      );

      client.setSnapshotGetter(getLatestSnapshot);
      clientRef.current = client;

      await client.connect();

      // Start 1 FPS video snapshot loop (precisely 1000ms)
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      frameCountWindowRef.current = 0;
      lastFpsCalcTimeRef.current = Date.now();

      frameIntervalRef.current = window.setInterval(() => {
        const base64 = captureFrame();
        if (base64 && clientRef.current) {
          clientRef.current.sendImageFrame(base64);
          frameCountWindowRef.current++;
          setStats((prev) => ({
            ...prev,
            framesSent: prev.framesSent + 1,
          }));
        }

        // Calculate accurate FPS
        const now = Date.now();
        const deltaSec = (now - lastFpsCalcTimeRef.current) / 1000;
        if (deltaSec >= 2) {
          const computedFps = Number((frameCountWindowRef.current / deltaSec).toFixed(1));
          setStats((prev) => ({ ...prev, fps: computedFps }));
          frameCountWindowRef.current = 0;
          lastFpsCalcTimeRef.current = now;
        }
      }, 1000);

      // Start session elapsed time ticker
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        setStats((prev) => ({ ...prev, sessionDuration: elapsed }));
      }, 1000);
    },
    [initHardwareStreams, captureFrame, getLatestSnapshot, options.apiKey, options.wsUrl]
  );

  /**
   * Stops the audit session and cleans up resources.
   */
  const stopAudit = useCallback(() => {
    setIsAuditing(false);
    setIsAiSpeaking(false);

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }

    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }

    if (audioManagerRef.current) {
      audioManagerRef.current.cleanup();
      audioManagerRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setSocketStatus('disconnected');
  }, []);

  /**
   * Toggles microphone mute state.
   */
  const toggleMute = useCallback(() => {
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);
    if (audioManagerRef.current) {
      audioManagerRef.current.setMute(nextMuted);
    }
  }, [isMicMuted]);

  /**
   * Switches camera facing mode (environment <-> user).
   */
  const switchCamera = useCallback(async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isAuditing) {
      await initHardwareStreams();
    }
  }, [cameraFacing, isAuditing, initHardwareStreams]);

  /**
   * Triggers manual hazard flag.
   */
  const manualFlag = useCallback(
    async (notes?: string) => {
      if (clientRef.current) {
        return await clientRef.current.triggerManualAudit(notes);
      }
      return null;
    },
    []
  );

  /**
   * Updates an incident status (flagged -> reviewed -> resolved).
   */
  const updateIncidentStatus = useCallback((id: string, newStatus: IncidentStatus) => {
    setIncidents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  }, []);

  /**
   * Clears the current session incident log.
   */
  const clearIncidents = useCallback(() => {
    setIncidents([]);
  }, []);

  /**
   * Computes dynamic safety compliance score (0-100).
   */
  const complianceScore = Math.max(
    10,
    100 -
      incidents.filter((i) => i.status !== 'resolved').reduce((acc, inc) => {
        if (inc.severity === 'critical') return acc + 25;
        if (inc.severity === 'high') return acc + 15;
        if (inc.severity === 'medium') return acc + 8;
        return acc + 3;
      }, 0)
  );

  // Teardown on hook unmount
  useEffect(() => {
    return () => {
      stopAudit();
    };
  }, [stopAudit]);

  return {
    isAuditing,
    socketStatus,
    errorMessage,
    isCameraActive,
    isMicMuted,
    isAiSpeaking,
    incidents,
    latestTranscript,
    stats,
    complianceScore,
    cameraFacing,
    videoRef,
    canvasRef,
    audioManagerRef,
    startAudit,
    stopAudit,
    toggleMute,
    switchCamera,
    manualFlag,
    updateIncidentStatus,
    clearIncidents,
  };
}
