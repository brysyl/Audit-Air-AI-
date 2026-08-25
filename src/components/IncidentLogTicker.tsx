/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Info,
  Layers,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { HazardSeverity, Incident, IncidentStatus } from '../types/audit';

interface IncidentLogTickerProps {
  incidents: Incident[];
  onUpdateStatus: (id: string, newStatus: IncidentStatus) => void;
  onClearAll?: () => void;
}

export const IncidentLogTicker: React.FC<IncidentLogTickerProps> = ({
  incidents,
  onUpdateStatus,
  onClearAll,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewIncident, setPreviewIncident] = useState<Incident | null>(null);

  const getSeverityBadge = (severity: HazardSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-red-500/10 text-red-500 border border-red-500/20">
            <AlertOctagon className="w-3 h-3 text-red-500" />
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-[#f27d26]/10 text-[#f27d26] border border-[#f27d26]/20">
            <AlertTriangle className="w-3 h-3 text-[#f27d26]" />
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium font-mono uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
            <AlertTriangle className="w-3 h-3 text-zinc-400" />
            MEDIUM
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium font-mono uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Info className="w-3 h-3 text-zinc-400" />
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-700/60">
            <CheckCircle className="w-2.5 h-2.5" />
            RESOLVED
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-950/70 text-blue-300 border border-blue-700/60">
            <Eye className="w-2.5 h-2.5" />
            REVIEWED
          </span>
        );
      case 'flagged':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
            FLAGGED
          </span>
        );
    }
  };

  const filteredIncidents = incidents.filter((item) => {
    if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) return false;
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.hazard_type.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.oshaStandard && item.oshaStandard.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(incidents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `audit_air_incidents_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportToCsv = () => {
    const headers = ['ID', 'Timestamp', 'Hazard Type', 'Severity', 'Status', 'OSHA Standard', 'Description'];
    const rows = incidents.map((i) => [
      i.id,
      new Date(i.timestamp).toISOString(),
      `"${i.hazard_type.replace(/"/g, '""')}"`,
      i.severity,
      i.status,
      `"${(i.oshaStandard || '').replace(/"/g, '""')}"`,
      `"${i.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `audit_air_compliance_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="p-3.5 border-b border-zinc-800 bg-[#0a0a0a] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#f27d26]/10 border border-[#f27d26]/30 text-[#f27d26]">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#e0e0e0] flex items-center gap-2">
              HAZARD DETECTIONS
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[#f27d26] text-xs font-mono font-bold">
                {incidents.length}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono">Continuous OSHA / ISO violation stream</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={exportToJson}
            disabled={incidents.length === 0}
            title="Export JSON Incident Ledger"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-zinc-300 text-xs font-mono transition cursor-pointer"
          >
            <Download className="w-3 h-3 text-zinc-400" />
            <span>JSON</span>
          </button>
          <button
            onClick={exportToCsv}
            disabled={incidents.length === 0}
            title="Export CSV Audit Ledger"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-zinc-300 text-xs font-mono transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3 h-3 text-[#f27d26]" />
            <span>CSV</span>
          </button>
          {onClearAll && incidents.length > 0 && (
            <button
              onClick={onClearAll}
              title="Clear Incident History"
              className="p-1.5 rounded hover:bg-red-950/50 text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-900 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-2.5 border-b border-zinc-800 bg-[#050505] flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[140px]">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hazard or standard..."
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#0a0a0a] border border-zinc-800 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#f27d26]"
          />
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-zinc-500" />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="text-xs bg-[#0a0a0a] border border-zinc-800 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-[#f27d26] font-mono"
          >
            <option value="all">ALL SEVERITIES</option>
            <option value="critical">CRITICAL ONLY</option>
            <option value="high">HIGH ONLY</option>
            <option value="medium">MEDIUM ONLY</option>
            <option value="low">LOW ONLY</option>
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs bg-[#0a0a0a] border border-zinc-800 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-[#f27d26] font-mono"
        >
          <option value="all">ALL STATUS</option>
          <option value="flagged">FLAGGED</option>
          <option value="reviewed">REVIEWED</option>
          <option value="resolved">RESOLVED</option>
        </select>
      </div>

      {/* Incident Stream Table / Feed */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredIncidents.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-zinc-500 font-mono text-xs">
            <Layers className="w-8 h-8 text-zinc-600 mb-2 opacity-60" />
            <p className="text-zinc-400 font-semibold">NO HAZARDS FLAGGED</p>
            <p className="text-[11px] text-zinc-600 mt-1 max-w-xs">
              Continuous 1 FPS visual auditor is scanning. Detected safety violations will log automatically.
            </p>
          </div>
        ) : (
          filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className={`group relative p-3 rounded-lg border transition duration-150 ${
                incident.severity === 'critical'
                  ? 'bg-red-950/20 border-l-4 border-l-red-500 border-t border-r border-b border-zinc-800'
                  : incident.severity === 'high'
                  ? 'bg-orange-950/20 border-l-4 border-l-[#f27d26] border-t border-r border-b border-zinc-800'
                  : 'bg-[#111] border-l-4 border-l-zinc-700 border-t border-r border-b border-zinc-800'
              }`}
            >
              {/* Top Row: Severity + Standard + Timestamp */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {getSeverityBadge(incident.severity)}
                  {getStatusBadge(incident.status)}
                  {incident.oshaStandard && (
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-900 text-[#f27d26] border border-zinc-800">
                      {incident.oshaStandard}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-zinc-400 whitespace-nowrap">
                  {new Date(incident.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>

              {/* Middle Row: Hazard Title & Description */}
              <div className="flex items-start gap-3">
                {/* Snapshot Thumbnail (if available) */}
                {incident.snapshotBase64 && (
                  <div
                    onClick={() => setPreviewIncident(incident)}
                    className="relative w-16 h-12 rounded border border-zinc-800 overflow-hidden shrink-0 cursor-pointer group/thumb shadow-sm"
                  >
                    <img
                      src={`data:image/jpeg;base64,${incident.snapshotBase64}`}
                      alt="Incident Snapshot"
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                      <Eye className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-[#e0e0e0] tracking-tight">
                    {incident.hazard_type}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {incident.description}
                  </p>
                </div>
              </div>

              {/* Bottom Row: Quick Triage Controls */}
              <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-zinc-500">
                  ID: {incident.id.substring(0, 12)}...
                </span>

                <div className="flex items-center gap-1.5">
                  {incident.snapshotBase64 && (
                    <button
                      onClick={() => setPreviewIncident(incident)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer"
                    >
                      VIEW SNAPSHOT
                    </button>
                  )}

                  {incident.status === 'flagged' && (
                    <button
                      onClick={() => onUpdateStatus(incident.id, 'reviewed')}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800 transition cursor-pointer"
                    >
                      ACKNOWLEDGE
                    </button>
                  )}

                  {incident.status !== 'resolved' ? (
                    <button
                      onClick={() => onUpdateStatus(incident.id, 'resolved')}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 transition cursor-pointer"
                    >
                      RESOLVE
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(incident.id, 'flagged')}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 transition cursor-pointer"
                    >
                      RE-OPEN
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Full-Screen Snapshot Zoom Modal */}
      {previewIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="p-3.5 bg-[#050505] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getSeverityBadge(previewIncident.severity)}
                <h3 className="text-sm font-bold text-[#e0e0e0]">
                  {previewIncident.hazard_type}
                </h3>
              </div>
              <button
                onClick={() => setPreviewIncident(null)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {previewIncident.snapshotBase64 ? (
                <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-black aspect-video flex items-center justify-center">
                  <img
                    src={`data:image/jpeg;base64,${previewIncident.snapshotBase64}`}
                    alt="Captured Violation"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/80 font-mono text-[11px] text-[#f27d26] border border-zinc-800">
                    CAPTURE TIMESTAMP: {new Date(previewIncident.timestamp).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                  No visual frame captured for this record.
                </div>
              )}

              <div className="p-3 rounded bg-[#050505] border border-zinc-800 text-xs text-zinc-300">
                <p className="font-semibold text-zinc-200 mb-1">Violation Details:</p>
                <p>{previewIncident.description}</p>
                {previewIncident.oshaStandard && (
                  <p className="mt-2 text-[#f27d26] font-mono">
                    Regulatory Reference: {previewIncident.oshaStandard}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 bg-[#050505] border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setPreviewIncident(null)}
                className="px-4 py-1.5 rounded text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
