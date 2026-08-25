/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Incident } from '../types/audit';

interface ComplianceChecklistProps {
  incidents: Incident[];
}

interface ChecklistItem {
  id: string;
  code: string;
  title: string;
  category: string;
  keywordMatch: string[];
}

export const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({ incidents }) => {
  const standards: ChecklistItem[] = [
    {
      id: 'ppe',
      code: 'OSHA 1910.132',
      title: 'PPE & Eye/Face/Head Protection',
      category: 'PPE',
      keywordMatch: ['ppe', 'hard', 'helmet', 'glass', 'glove', 'mask', 'visor', 'footwear', 'vest'],
    },
    {
      id: 'egress',
      code: 'OSHA 1910.36',
      title: 'Emergency Egress & Exit Routes',
      category: 'Egress',
      keywordMatch: ['exit', 'egress', 'door', 'hallway', 'block', 'corridor', 'fire door'],
    },
    {
      id: 'surfaces',
      code: 'OSHA 1910.22',
      title: 'Walking-Working Surfaces & Spills',
      category: 'Housekeeping',
      keywordMatch: ['spill', 'liquid', 'oil', 'chemical', 'wet', 'slick', 'floor', 'drain'],
    },
    {
      id: 'machinery',
      code: 'OSHA 1910.212',
      title: 'Machine Point of Operation Guarding',
      category: 'Machinery',
      keywordMatch: ['guard', 'machine', 'blade', 'pinch', 'rotating', 'crush', 'interlock'],
    },
    {
      id: 'electrical',
      code: 'OSHA 1910.303',
      title: 'Electrical Wiring & Panel Clearance',
      category: 'Electrical',
      keywordMatch: ['electric', 'wire', 'cord', 'panel', 'junction', 'shock', 'volt', '480v'],
    },
    {
      id: 'fall',
      code: 'OSHA 1910.28',
      title: 'Fall Protection & Elevated Platforms',
      category: 'Fall Hazard',
      keywordMatch: ['trip', 'fall', 'ladder', 'stair', 'scaffold', 'guardrail', 'platform', 'cable'],
    },
  ];

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#f27d26]/10 text-[#f27d26] border border-[#f27d26]/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-[#e0e0e0] font-mono tracking-wider">
            OSHA 1910 COMPLIANCE INDEX
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">
          AUTOMATED VERIFICATION
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
        {standards.map((item) => {
          const matchingViolations = incidents.filter((inc) => {
            const text = `${inc.hazard_type} ${inc.description} ${inc.oshaStandard || ''}`.toLowerCase();
            return item.keywordMatch.some((k) => text.includes(k));
          });

          const isFlagged = matchingViolations.some((v) => v.status !== 'resolved');
          const hasResolved = matchingViolations.length > 0 && !isFlagged;

          return (
            <div
              key={item.id}
              className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 transition ${
                isFlagged
                  ? 'bg-red-950/20 border-l-4 border-l-red-500 border-t border-r border-b border-zinc-800 text-red-300'
                  : hasResolved
                  ? 'bg-blue-950/20 border-l-4 border-l-blue-500 border-t border-r border-b border-zinc-800 text-blue-300'
                  : 'bg-[#111] border-l-4 border-l-zinc-700 border-t border-r border-b border-zinc-800 text-zinc-300'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-[#f27d26] border border-zinc-800">
                    {item.code}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-200 mt-1 truncate">
                  {item.title}
                </p>
                {matchingViolations.length > 0 && (
                  <p className="text-[10px] font-mono mt-0.5 text-red-400">
                    {matchingViolations.length} violation(s) flagged
                  </p>
                )}
              </div>

              <div>
                {isFlagged ? (
                  <div className="p-1 rounded bg-red-900/40 text-red-400 animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-1 rounded bg-black/60 text-emerald-400 border border-zinc-800">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
