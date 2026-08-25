/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  Mic,
  MicOff,
  Play,
  RefreshCw,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Square,
  Volume2,
  Zap
} from 'lucide-react';
import { useAuditStream } from '../hooks/useAuditStream';
import { HUDOverlay } from './HUDOverlay';
import { IncidentLogTicker } from './IncidentLogTicker';
import { AudioVisualizer } from './AudioVisualizer';
import { ComplianceChecklist } from './ComplianceChecklist';
import { ManualFlagModal } from './ManualFlagModal';
import { AuditReportModal } from './AuditReportModal';
import { HazardSeverity } from '../types/audit';

export const Dashboard: React.FC = () => {
  const [facility, setFacility] = useState('Apex Industrial Bay 4');
  const [auditorName, setAuditorName] = useState('Chief Auditor Vance');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ticker' | 'checklist'>('ticker');

  const {
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
    audioManagerRef,
    startAudit,
    stopAudit,
    toggleMute,
    switchCamera,
    manualFlag,
    updateIncidentStatus,
    clearIncidents,
  } = useAuditStream({
    facilityName: facility,
    auditorName,
  });

  const handleManualFlagSubmit = async (notes: string, severity?: HazardSeverity) => {
    await manualFlag(notes);
  };

  const unresolvedCount = incidents.filter((i) => i.status !== 'resolved').length;

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col font-sans selection:bg-[#f27d26] selection:text-black">
      {/* Top Industrial Navbar - Elegant Dark Theme */}
      <header className="border-b border-zinc-800 bg-[#0a0a0a] px-4 md:px-6 h-16 sticky top-0 z-30 flex items-center justify-between gap-3 shadow-md">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f27d26] rounded flex items-center justify-center font-bold text-black text-xs shadow-md shadow-[#f27d26]/20">
            AA
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-[#e0e0e0] flex items-center gap-1.5">
              AUDIT AIR <span className="text-[#f27d26]">AI</span>
            </h1>
            <p className="text-[11px] text-zinc-500 font-mono hidden sm:block">
              Multimodal Industrial Safety Auditor
            </p>
          </div>
        </div>

        {/* Center: Live Connection indicator & Session Chip */}
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAuditing ? 'bg-red-600 animate-pulse' : 'bg-zinc-600'}`}></div>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 hidden xs:inline">
              {isAuditing ? 'Live Connection' : 'Standby'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 rounded px-3 py-1 font-mono text-xs text-zinc-400">
            <span className="text-zinc-500">FACILITY:</span>
            <input
              type="text"
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              className="bg-transparent border-b border-zinc-800 focus:border-[#f27d26] text-zinc-200 outline-none w-36 font-mono text-xs"
            />
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-500">AUDITOR:</span>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              className="bg-transparent border-b border-zinc-800 focus:border-[#f27d26] text-zinc-200 outline-none w-32 font-mono text-xs"
            />
          </div>

          <div className="text-xs font-mono text-zinc-500 bg-zinc-900 px-3 py-1 rounded border border-zinc-800 hidden sm:block">
            SID: 882-QX-901
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[#e0e0e0] text-xs font-mono font-medium transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#f27d26]" />
            <span className="hidden sm:inline">AUDIT REPORT</span>
          </button>
        </div>
      </header>

      {/* Error Banner if any */}
      {errorMessage && (
        <div className="bg-rose-950/90 border-b border-rose-800 px-4 py-2 text-xs font-mono text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => startAudit(true)}
            className="px-2 py-0.5 rounded bg-rose-900 hover:bg-rose-800 text-white font-bold text-[11px] underline cursor-pointer"
          >
            Switch to Simulation Mode
          </button>
        </div>
      )}

      {/* Main Workspace Dashboard Grid */}
      <main className="flex-1 p-3 md:p-4 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Live Camera Feed & Viewport + Controls + Audio Visualizer (Cols 1-7) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Main Video Viewport Card with HUD */}
          <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-[#111] aspect-video md:aspect-[16/10] shadow-2xl flex items-center justify-center group">
            {/* Background radial gradient */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-500 via-transparent to-transparent"></div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/60"></div>

            {/* HTML Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover transition duration-300 ${
                isCameraActive ? 'opacity-100' : 'opacity-20'
              }`}
            />

            {/* Offline/Standby placeholder graphic */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-zinc-500 font-mono pointer-events-none">
                <div className="w-16 h-16 border-2 border-dashed border-zinc-700 rounded-full flex items-center justify-center mb-3">
                  <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
                </div>
                <h3 className="text-xs font-mono tracking-wider uppercase text-zinc-400">
                  CAMERA STREAM OFFLINE
                </h3>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                  Click 'START LIVE AUDIT' or 'DEMO SIMULATION' below to initialize 16kHz audio capture and 1 FPS visual compliance scanner.
                </p>
              </div>
            )}

            {/* HUD Overlay */}
            <HUDOverlay
              isAuditing={isAuditing}
              socketStatus={socketStatus}
              stats={stats}
              complianceScore={complianceScore}
              isAiSpeaking={isAiSpeaking}
              isMicMuted={isMicMuted}
              cameraFacing={cameraFacing}
              onSwitchCamera={switchCamera}
              unresolvedCount={unresolvedCount}
            />
          </div>

          {/* Control Panel Buttons Bar */}
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 md:px-5 md:py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            {/* Left Hardware & Audit Trigger */}
            <div className="flex items-center gap-3">
              {!isAuditing ? (
                <button
                  onClick={() => startAudit(false)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#f27d26] hover:bg-[#e06c15] text-black text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer shadow-lg shadow-[#f27d26]/20 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>START LIVE AUDIT</span>
                </button>
              ) : (
                <button
                  onClick={stopAudit}
                  title="Stop Live Audit"
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg shadow-red-900/30 transition cursor-pointer active:scale-95 shrink-0"
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-xs"></div>
                </button>
              )}

              {/* Simulation Mode Button */}
              {!isAuditing && (
                <button
                  onClick={() => startAudit(true)}
                  title="Run automated test simulation with synthetic hazard stream"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono font-semibold transition cursor-pointer active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-[#f27d26]" />
                  <span className="hidden sm:inline">DEMO SIMULATION</span>
                </button>
              )}

              <div className="h-8 w-px bg-zinc-800 hidden sm:block"></div>

              {/* Mic and Camera Buttons */}
              <button
                onClick={toggleMute}
                disabled={!isAuditing}
                className={`p-2.5 rounded-lg border text-xs font-mono transition cursor-pointer ${
                  isMicMuted
                    ? 'bg-red-950/40 border-red-500/50 text-red-400'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                } disabled:opacity-40`}
                title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={switchCamera}
                disabled={!isAuditing}
                className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-mono transition cursor-pointer disabled:opacity-40"
                title="Switch Camera (Front/Rear)"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Middle: AI State Note */}
            <div className="hidden xl:flex flex-col flex-1 mx-4">
              <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">
                AI PROCESSING STATE
              </span>
              <span className="text-xs text-zinc-300 font-medium italic truncate">
                {latestTranscript ? `"${latestTranscript}"` : '"Monitoring high-traffic corridor. Safety compliance within thresholds."'}
              </span>
            </div>

            {/* Right: Manual Flag */}
            <div>
              <button
                onClick={() => setIsManualModalOpen(true)}
                disabled={!isAuditing}
                className="flex items-center gap-1.5 px-4 md:px-5 py-2.5 bg-[#f27d26] hover:bg-[#e06c15] text-black font-bold rounded-lg text-xs tracking-widest uppercase transition cursor-pointer shadow-lg shadow-[#f27d26]/20 disabled:opacity-40 active:scale-95"
                title="Manually flag hazard on current frame"
              >
                <ShieldAlert className="w-3.5 h-3.5 fill-black" />
                <span>MANUAL FLAG</span>
              </button>
            </div>
          </div>

          {/* Audio Visualizer & Waveform Component */}
          <AudioVisualizer
            audioManager={audioManagerRef.current}
            isAuditing={isAuditing}
            isAiSpeaking={isAiSpeaking}
            isMicMuted={isMicMuted}
            latestTranscript={latestTranscript}
          />
        </section>

        {/* RIGHT COLUMN: Real-Time Incident Ticker & Compliance Index (Cols 8-12) */}
        <aside className="lg:col-span-5 flex flex-col gap-3 min-h-[500px]">
          {/* Navigation Tab Bar for Right Panel */}
          <div className="flex items-center gap-1 p-1 bg-[#0a0a0a] border border-zinc-800 rounded-xl">
            <button
              onClick={() => setActiveTab('ticker')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'ticker'
                  ? 'bg-zinc-900 text-[#e0e0e0] border border-zinc-700/60 shadow'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#f27d26]" />
              <span>INCIDENT TICKER ({incidents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('checklist')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'checklist'
                  ? 'bg-zinc-900 text-[#e0e0e0] border border-zinc-700/60 shadow'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>OSHA 1910 CHECKLIST</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col">
            {activeTab === 'ticker' ? (
              <IncidentLogTicker
                incidents={incidents}
                onUpdateStatus={updateIncidentStatus}
                onClearAll={clearIncidents}
              />
            ) : (
              <div className="flex-1 space-y-3">
                <ComplianceChecklist incidents={incidents} />
                <IncidentLogTicker
                  incidents={incidents}
                  onUpdateStatus={updateIncidentStatus}
                  onClearAll={clearIncidents}
                />
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Elegant Dark Telemetry Footer */}
      <footer className="h-8 bg-[#0a0a0a] border-t border-zinc-800 px-4 md:px-6 flex items-center justify-between text-[10px] font-mono text-zinc-500">
        <div>SYS_VER: 2.1.0-STABLE</div>
        <div className="flex gap-4">
          <span className="hidden sm:inline">PACKET_LOSS: 0.002%</span>
          <span>TOKEN_UTIL: 1,422/m</span>
          <span>SESS_ID: FA-9981</span>
        </div>
      </footer>

      {/* Manual Flag Spot-Check Modal */}
      <ManualFlagModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleManualFlagSubmit}
        currentSnapshot={null}
      />

      {/* Printable / Downloadable Compliance Audit Report Certificate */}
      <AuditReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        incidents={incidents}
        complianceScore={complianceScore}
        sessionDuration={stats.sessionDuration}
        facility={facility}
        auditorName={auditorName}
      />
    </div>
  );
};
