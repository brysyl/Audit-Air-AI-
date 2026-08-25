/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, Camera, Check, ShieldAlert, X } from 'lucide-react';
import { HazardSeverity } from '../types/audit';

interface ManualFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (notes: string, severity?: HazardSeverity, category?: string) => Promise<void>;
  currentSnapshot: string | null;
}

export const ManualFlagModal: React.FC<ManualFlagModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentSnapshot,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('Missing PPE');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [severity, setSeverity] = useState<HazardSeverity>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const quickTags = [
    'Missing PPE (Hardhat/Goggles)',
    'Blocked Emergency Egress',
    'Liquid / Chemical Spill',
    'Unguarded Rotating Machinery',
    'Open Electrical Panel',
    'Trip / Trailing Cable Hazard',
    'Unsecured Elevated Load',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const fullNote = customNotes.trim()
      ? `${selectedTag}: ${customNotes.trim()}`
      : selectedTag;

    await onSubmit(fullNote, severity, selectedTag);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#050505] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#f27d26]/10 border border-[#f27d26]/30 text-[#f27d26]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e0e0e0]">
                MANUAL HAZARD FLAG
              </h2>
              <p className="text-[11px] text-zinc-500 font-mono">
                Trigger multimodal AI spot check on active camera frame
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Frame Preview if available */}
          {currentSnapshot && (
            <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-black h-32 flex items-center justify-center">
              <img
                src={`data:image/jpeg;base64,${currentSnapshot}`}
                alt="Frame to analyze"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-zinc-800 text-[10px] font-mono text-[#f27d26] flex items-center gap-1">
                <Camera className="w-3 h-3" />
                FRAME CAPTURED
              </div>
            </div>
          )}

          {/* Quick Tag Selector */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 font-semibold mb-2">
              SELECT HAZARD CATEGORY:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-[#f27d26]/20 border border-[#f27d26] text-[#f27d26] font-semibold'
                      : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 font-semibold mb-2">
              ESTIMATED SEVERITY:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'critical'] as HazardSeverity[]).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setSeverity(lvl)}
                  className={`py-1.5 text-xs font-mono uppercase font-bold rounded border transition cursor-pointer ${
                    severity === lvl
                      ? lvl === 'critical'
                        ? 'bg-red-950/60 text-red-400 border-red-500'
                        : lvl === 'high'
                        ? 'bg-orange-950/60 text-[#f27d26] border-[#f27d26]'
                        : lvl === 'medium'
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Notes */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 font-semibold mb-1">
              OBSERVATION NOTES (OPTIONAL):
            </label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Near lathe #4, employee unclipped safety harness during overhead work..."
              rows={2}
              className="w-full text-xs bg-[#050505] border border-zinc-800 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#f27d26]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-mono font-bold bg-[#f27d26] hover:bg-[#e06c15] text-black tracking-wider uppercase transition cursor-pointer disabled:opacity-50 shadow-lg shadow-[#f27d26]/20"
            >
              <AlertTriangle className="w-3.5 h-3.5 fill-black" />
              <span>{isSubmitting ? 'LOGGING...' : 'FLAG HAZARD NOW'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
