/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, FileText, Printer, Shield, X } from 'lucide-react';
import { Incident } from '../types/audit';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: Incident[];
  complianceScore: number;
  sessionDuration: number;
  facility: string;
  auditorName: string;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  incidents,
  complianceScore,
  sessionDuration,
  facility,
  auditorName,
}) => {
  if (!isOpen) return null;

  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
  const highCount = incidents.filter((i) => i.severity === 'high').length;
  const mediumCount = incidents.filter((i) => i.severity === 'medium').length;
  const lowCount = incidents.filter((i) => i.severity === 'low').length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const reportData = {
      title: 'Audit Air AI - Industrial Safety & Compliance Audit Report',
      timestamp: new Date().toISOString(),
      facility,
      auditor: auditorName,
      sessionDurationSec: sessionDuration,
      complianceScore,
      summary: {
        totalIncidents: incidents.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        resolved: resolvedCount,
      },
      incidents,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `OSHA_Safety_Audit_Report_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header */}
        <div className="p-4 bg-[#050505] border-b border-zinc-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#f27d26]/10 text-[#f27d26] border border-[#f27d26]/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e0e0e0] font-mono">
                OSHA 1910 COMPLIANCE AUDIT CERTIFICATE
              </h2>
              <p className="text-[11px] text-zinc-500 font-mono">
                Automated Multimodal Inspection Summary
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

        {/* Certificate Body */}
        <div className="p-6 space-y-6 print:p-8 font-sans">
          {/* Certificate Header Banner */}
          <div className="border-b border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-[#f27d26] uppercase tracking-widest block font-bold">
                AUDIT AIR AI COMPLIANCE SYSTEM
              </span>
              <h1 className="text-xl font-black text-[#e0e0e0] print:text-black mt-1">
                FACILITY SAFETY AUDIT SUMMARY
              </h1>
              <p className="text-xs text-zinc-400 print:text-zinc-600 font-mono mt-0.5">
                GENERATED: {new Date().toLocaleString()} | FACILITY: {facility}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right font-mono">
                <span className="text-xs text-zinc-400 block">COMPLIANCE INDEX</span>
                <span className={`text-2xl font-black ${
                  complianceScore >= 85 ? 'text-emerald-400' : complianceScore >= 65 ? 'text-[#f27d26]' : 'text-red-500'
                }`}>
                  {complianceScore}%
                </span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                <Shield className="w-8 h-8 text-[#f27d26]" />
              </div>
            </div>
          </div>

          {/* Audit Metrics Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 rounded-lg bg-[#050505] border border-zinc-800 print:border-zinc-300">
              <span className="text-[10px] text-zinc-500 block">TOTAL HAZARDS</span>
              <span className="text-lg font-bold text-[#e0e0e0] print:text-black">{incidents.length}</span>
            </div>
            <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/40 print:border-red-300">
              <span className="text-[10px] text-red-400 block">CRITICAL</span>
              <span className="text-lg font-bold text-red-400">{criticalCount}</span>
            </div>
            <div className="p-3 rounded-lg bg-orange-950/20 border border-orange-900/40 print:border-orange-300">
              <span className="text-[10px] text-[#f27d26] block">HIGH SEVERITY</span>
              <span className="text-lg font-bold text-[#f27d26]">{highCount}</span>
            </div>
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 print:border-emerald-300">
              <span className="text-[10px] text-emerald-400 block">RESOLVED</span>
              <span className="text-lg font-bold text-emerald-400">{resolvedCount}</span>
            </div>
          </div>

          {/* Incident Ledger Table */}
          <div>
            <h3 className="text-xs font-mono font-bold text-zinc-300 print:text-black mb-2 uppercase">
              Flagged Violations & Recommendations:
            </h3>
            {incidents.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#050505] border border-zinc-800 text-center text-xs font-mono text-emerald-400">
                Full compliance. Zero infractions observed during this auditing cycle.
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#050505] text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">Hazard & Description</th>
                      <th className="p-2.5">Standard</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 bg-[#0a0a0a]">
                    {incidents.map((i) => (
                      <tr key={i.id} className="hover:bg-zinc-900/40">
                        <td className="p-2.5 font-bold uppercase">
                          <span className={
                            i.severity === 'critical' ? 'text-red-500' :
                            i.severity === 'high' ? 'text-[#f27d26]' :
                            i.severity === 'medium' ? 'text-zinc-400' : 'text-emerald-400'
                          }>
                            {i.severity}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-[#e0e0e0] print:text-black">{i.hazard_type}</div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">{i.description}</div>
                        </td>
                        <td className="p-2.5 text-[#f27d26] whitespace-nowrap">
                          {i.oshaStandard || 'OSHA 1910'}
                        </td>
                        <td className="p-2.5 uppercase text-zinc-400">
                          {i.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Signoff block */}
          <div className="pt-4 border-t border-zinc-800 flex justify-between items-end text-xs font-mono text-zinc-400 print:text-black">
            <div>
              <p>Auditor Signature: <span className="underline font-bold text-zinc-200">{auditorName}</span></p>
              <p className="mt-1">System: Audit Air AI v2.4 (Gemini Multimodal Live Engine)</p>
            </div>
            <div className="text-right">
              <p>Seal of Compliance Inspection</p>
              <p className="text-[10px] text-zinc-500">ISO 45001 / OSHA 1910 Validated</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#050505] border-t border-zinc-800 flex items-center justify-end gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT REPORT</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-mono font-bold bg-[#f27d26] hover:bg-[#e06c15] text-black tracking-wider uppercase transition cursor-pointer shadow-lg shadow-[#f27d26]/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT JSON DATA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
