/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Radio,
  Shield,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { SocketStatus, StreamStats } from '../types/audit';

interface HUDOverlayProps {
  isAuditing: boolean;
  socketStatus: SocketStatus;
  stats: StreamStats;
  complianceScore: number;
  isAiSpeaking: boolean;
  isMicMuted: boolean;
  cameraFacing: 'environment' | 'user';
  onSwitchCamera?: () => void;
  unresolvedCount: number;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  isAuditing,
  socketStatus,
  stats,
  complianceScore,
  isAiSpeaking,
  isMicMuted,
  cameraFacing,
  onSwitchCamera,
  unresolvedCount,
}) => {
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const ms = Math.floor((stats.framesSent * 33) % 99);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  const getSocketBadge = () => {
    switch (socketStatus) {
      case 'connected':
        return (
          <span className="px-2 py-1 bg-black/80 border border-zinc-700 text-[10px] font-mono rounded flex items-center gap-1.5 text-zinc-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>BIDI_LIVE</span>
          </span>
        );
      case 'simulated':
        return (
          <span className="px-2 py-1 bg-black/80 border border-zinc-700 text-[10px] font-mono rounded flex items-center gap-1 text-[#f27d26]">
            <Zap className="w-3 h-3 text-[#f27d26]" />
            <span>SIMULATION</span>
          </span>
        );
      case 'connecting':
        return (
          <span className="px-2 py-1 bg-black/80 border border-zinc-700 text-[10px] font-mono rounded flex items-center gap-1 text-amber-400">
            <Activity className="w-3 h-3 animate-spin" />
            <span>CONNECTING</span>
          </span>
        );
      case 'error':
        return (
          <span className="px-2 py-1 bg-red-950/80 border border-red-500/50 text-[10px] font-mono rounded text-red-400">
            WS_OFFLINE
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-black/80 border border-zinc-700 text-[10px] font-mono rounded text-zinc-500">
            STANDBY
          </span>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-zinc-700 bg-black/80';
    if (score >= 65) return 'text-[#f27d26] border-zinc-700 bg-black/80';
    return 'text-red-400 border-red-500/40 bg-red-950/40';
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 font-mono select-none">
      {/* Top HUD Header Bar */}
      <div className="flex items-start justify-between gap-2">
        {/* Left Status Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Camera ID Badge */}
          <span className="px-2 py-1 bg-black/80 border border-zinc-700 text-[10px] font-mono rounded text-zinc-300">
            {cameraFacing === 'environment' ? 'CAM_01 / REAR_ENV' : 'CAM_02 / USER_LENS'}
          </span>

          {/* 1.0 FPS Ingest */}
          <span className="px-2 py-1 bg-black/80 border border-zinc-700 text-[10px] font-mono rounded text-[#f27d26] font-semibold">
            {stats.fps > 0 ? stats.fps.toFixed(1) : '1.0'} FPS
          </span>

          {/* Socket State */}
          {getSocketBadge()}
        </div>

        {/* Right Stats Group */}
        <div className="flex items-center gap-2">
          {/* REC Status */}
          {isAuditing ? (
            <span className="px-2 py-1 bg-red-900/40 border border-red-500/50 text-[10px] font-mono rounded text-red-400 font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              REC
            </span>
          ) : (
            <span className="px-2 py-1 bg-black/80 border border-zinc-700 text-[10px] font-mono rounded text-zinc-500">
              IDLE
            </span>
          )}

          {/* Session Timer */}
          <span className="px-2 py-1 bg-black/80 border border-zinc-700 text-[10px] font-mono rounded text-zinc-300">
            {formatTime(stats.sessionDuration)}
          </span>

          {/* Compliance Score Pill */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold shadow-md ${getScoreColor(complianceScore)}`}>
            <Shield className="w-3 h-3 text-[#f27d26]" />
            <span>{complianceScore}%</span>
          </div>
        </div>
      </div>

      {/* Center Reticle & Optical Targeting Overlay */}
      <div className="relative flex-1 flex items-center justify-center pointer-events-none">
        {isAuditing ? (
          <div className="flex flex-col items-center opacity-70">
            {/* Center target circle */}
            <div className="w-16 h-16 border-2 border-dashed border-zinc-600 rounded-full flex items-center justify-center mb-3">
              <div className="w-1.5 h-1.5 bg-[#f27d26] rounded-full shadow-sm shadow-[#f27d26]"></div>
            </div>
            <span className="text-[11px] font-mono tracking-tighter text-zinc-400 bg-black/60 px-2 py-0.5 rounded border border-zinc-800">
              REAL-TIME INGESTION ACTIVE
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center opacity-30">
            <div className="w-16 h-16 border-2 border-dashed border-zinc-700 rounded-full flex items-center justify-center mb-3">
              <div className="w-1 h-1 bg-zinc-500 rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom HUD Status & Multimodal Stream Bar */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* Multimodal Stream Mini Waveform bars */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
            Multimodal Stream
          </span>
          <div className="flex gap-1 h-7 items-end">
            <div className={`w-1 transition-all duration-150 ${isAuditing ? 'bg-[#f27d26] h-[65%]' : 'bg-zinc-700 h-[20%]'}`}></div>
            <div className={`w-1 transition-all duration-150 ${isAuditing ? 'bg-[#f27d26] h-[40%]' : 'bg-zinc-700 h-[15%]'}`}></div>
            <div className={`w-1 transition-all duration-150 ${isAuditing ? 'bg-[#f27d26] h-[85%]' : 'bg-zinc-700 h-[30%]'}`}></div>
            <div className={`w-1 transition-all duration-150 ${isAuditing ? 'bg-[#f27d26] h-[30%]' : 'bg-zinc-700 h-[10%]'}`}></div>
            <div className={`w-1 transition-all duration-150 ${isAuditing ? 'bg-[#f27d26] h-[95%]' : 'bg-zinc-700 h-[25%]'}`}></div>
            <div className={`w-1 transition-all duration-150 ${isAuditing ? 'bg-[#f27d26] h-[55%]' : 'bg-zinc-700 h-[15%]'}`}></div>
            <div className="w-1 bg-zinc-700 h-[20%]"></div>
            <div className="w-1 bg-zinc-700 h-[15%]"></div>
            <div className="w-1 bg-zinc-700 h-[25%]"></div>
            <div className="w-1 bg-zinc-700 h-[10%]"></div>
          </div>
        </div>

        {/* Center: Active Hazard Count */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {unresolvedCount > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/80 border border-red-500/50 text-red-400 text-xs font-bold rounded">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>{unresolvedCount} HAZARDS FLAGGED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/80 border border-zinc-700 text-emerald-400 text-xs rounded">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CLEAR</span>
            </div>
          )}

          {onSwitchCamera && (
            <button
              onClick={onSwitchCamera}
              title="Switch camera lens"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs transition cursor-pointer active:scale-95"
            >
              <Camera className="w-3 h-3" />
              <span className="hidden sm:inline">FLIP</span>
            </button>
          )}
        </div>

        {/* Right: Latency & Health Bar */}
        <div className="text-right flex flex-col items-end">
          <div className="text-[10px] font-mono text-zinc-400 mb-1">
            LATENCY: {isAuditing ? '42ms' : '0ms'}
          </div>
          <div className="h-1.5 w-28 md:w-32 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isAuditing ? 'bg-emerald-500 w-[88%]' : 'bg-zinc-600 w-[10%]'
              }`}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

