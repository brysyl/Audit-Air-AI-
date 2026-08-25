/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { AudioStreamManager } from '../lib/AudioProcessor';
import { Cpu, HardDrive, Mic, Volume2 } from 'lucide-react';

interface AudioVisualizerProps {
  audioManager: AudioStreamManager | null;
  isAuditing: boolean;
  isAiSpeaking: boolean;
  isMicMuted: boolean;
  latestTranscript?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioManager,
  isAuditing,
  isAiSpeaking,
  isMicMuted,
  latestTranscript,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 128;
    const micData = new Uint8Array(bufferLength);
    const outputData = new Uint8Array(bufferLength);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // Subtle grid lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#18181b';
      ctx.beginPath();
      for (let x = 0; x < width; x += 32) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 16) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Center baseline
      ctx.strokeStyle = '#27272a';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (audioManager && isAuditing) {
        audioManager.getMicWaveformData(micData);
        audioManager.getOutputWaveformData(outputData);

        // 1. Draw Mic Waveform (Safety Orange #f27d26)
        ctx.lineWidth = 2;
        ctx.strokeStyle = isMicMuted ? '#52525b' : '#f27d26';
        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = micData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();

        // 2. Draw AI Output Voice Waveform (Amber / Orange glow when speaking)
        if (isAiSpeaking) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#f27d26';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#f27d26';
          ctx.beginPath();

          let ox = 0;
          for (let i = 0; i < bufferLength; i++) {
            const v = outputData[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(ox, y);
            } else {
              ctx.lineTo(ox, y);
            }
            ox += sliceWidth;
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }
      } else {
        // Flatline idle wave
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#27272a';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [audioManager, isAuditing, isAiSpeaking, isMicMuted]);

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
      {/* Visualizer Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isAiSpeaking ? 'bg-[#f27d26]/20 text-[#f27d26]' : 'bg-zinc-800 text-zinc-300'}`}>
            {isAiSpeaking ? <Volume2 className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#e0e0e0] font-mono tracking-wider">
                AUDIO TELEMETRY
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                16kHz PCM IN / 24kHz OUT
              </span>
            </div>
          </div>
        </div>

        {/* Channel Indicators */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-[#f27d26]"></span>
            <span>AUDITOR MIC</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className={`w-2 h-2 rounded-full ${isAiSpeaking ? 'bg-[#f27d26] animate-ping' : 'bg-zinc-600'}`}></span>
            <span>AI VOICE</span>
          </div>
        </div>
      </div>

      {/* Waveform Canvas & Telemetry Overlay */}
      <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-[#050505] h-16 w-full">
        <canvas
          ref={canvasRef}
          width={500}
          height={64}
          className="w-full h-full block"
        />
        <div className="absolute top-1.5 left-2 text-[9px] font-mono text-zinc-600">
          OSCILLOSCOPE 128-FFT
        </div>

        {/* Resource usage bars in bottom right of oscilloscope */}
        <div className="absolute bottom-1.5 right-2 flex items-center gap-3 text-[9px] font-mono text-zinc-500">
          <div className="flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5 text-blue-400" />
            <span>CPU 42%</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-2.5 h-2.5 text-purple-400" />
            <span>VRAM 1.2G</span>
          </div>
        </div>
      </div>

      {/* Live AI Transcript / Verbal Feedback Readout */}
      {latestTranscript && (
        <div className="p-2.5 rounded-lg bg-[#050505] border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2">
          <span className="text-[#f27d26] font-mono font-bold text-[10px] shrink-0 uppercase tracking-wider">
            AI AUDITOR:
          </span>
          <p className="font-mono text-xs text-zinc-200 leading-relaxed italic">
            "{latestTranscript}"
          </p>
        </div>
      )}
    </div>
  );
};
