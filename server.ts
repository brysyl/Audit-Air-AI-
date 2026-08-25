/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI SDK lazily on server
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// In-memory store for session incidents
interface StoredIncident {
  id: string;
  timestamp: number;
  hazard_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  snapshotBase64?: string;
  status: 'flagged' | 'reviewed' | 'resolved';
  oshaStandard?: string;
}

let storedIncidents: StoredIncident[] = [];

// Helper to determine OSHA standard based on hazard description
function mapOshaStandard(hazard: string): string {
  const lower = hazard.toLowerCase();
  if (lower.includes('ppe') || lower.includes('eye') || lower.includes('head') || lower.includes('glove')) {
    return 'OSHA 1910.132 (PPE General)';
  }
  if (lower.includes('exit') || lower.includes('egress') || lower.includes('door') || lower.includes('block')) {
    return 'OSHA 1910.36 (Exit Routes)';
  }
  if (lower.includes('spill') || lower.includes('liquid') || lower.includes('oil') || lower.includes('slip')) {
    return 'OSHA 1910.22 (Walking-Working Surfaces)';
  }
  if (lower.includes('guard') || lower.includes('machine') || lower.includes('blade') || lower.includes('crush')) {
    return 'OSHA 1910.212 (Machinery & Machine Guarding)';
  }
  if (lower.includes('electric') || lower.includes('wire') || lower.includes('cord') || lower.includes('volt')) {
    return 'OSHA 1910.303 (Electrical Wiring)';
  }
  if (lower.includes('trip') || lower.includes('fall') || lower.includes('ladder') || lower.includes('stair')) {
    return 'OSHA 1910.28 (Fall Protection)';
  }
  return 'OSHA 1910 General Duty Clause';
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    activeIncidents: storedIncidents.length,
  });
});

/**
 * Ingestion endpoint called by Gemini Live client toolCall
 */
app.post('/api/ingest', (req, res) => {
  try {
    const { hazard_type, description, severity, snapshotBase64, oshaStandard } = req.body;

    if (!hazard_type || !description) {
      return res.status(400).json({ error: 'Missing hazard_type or description' });
    }

    const incident: StoredIncident = {
      id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      hazard_type: String(hazard_type),
      description: String(description),
      severity: (severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
      snapshotBase64: snapshotBase64 || undefined,
      status: 'flagged',
      oshaStandard: oshaStandard || mapOshaStandard(hazard_type + ' ' + description),
    };

    storedIncidents.unshift(incident);

    // Keep up to 200 recent incidents in memory
    if (storedIncidents.length > 200) {
      storedIncidents = storedIncidents.slice(0, 200);
    }

    console.log(`[AUDIT INGEST] Flagged: ${incident.hazard_type} (${incident.severity})`);

    res.json({
      success: true,
      incident,
      message: 'Hazard violation successfully logged to compliance ledger',
    });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: 'Failed to ingest incident' });
  }
});

/**
 * Fetch all incidents
 */
app.get('/api/incidents', (req, res) => {
  res.json({
    incidents: storedIncidents,
    total: storedIncidents.length,
  });
});

/**
 * Clear all incidents
 */
app.delete('/api/incidents', (req, res) => {
  storedIncidents = [];
  res.json({ success: true, message: 'Incident ledger reset' });
});

/**
 * Multimodal Frame Audit via Server-Side Gemini 3.7 Flash
 */
app.post('/api/audit-frame', async (req, res) => {
  try {
    const { snapshotBase64, notes } = req.body;
    const ai = getAi();

    if (!ai) {
      // Return simulated hazard if API key is not yet set
      const fallbackIncident: StoredIncident = {
        id: `inc_${Date.now()}`,
        timestamp: Date.now(),
        hazard_type: notes || 'Manual Safety Inspection Flag',
        description: 'Auditor recorded safety spot check in current workspace zone.',
        severity: 'medium',
        snapshotBase64: snapshotBase64 || undefined,
        status: 'flagged',
        oshaStandard: 'OSHA 1910 General Safety',
      };
      storedIncidents.unshift(fallbackIncident);
      return res.json({
        incident: fallbackIncident,
        transcript: 'Manual hazard inspection recorded in session ledger.',
      });
    }

    if (!snapshotBase64) {
      return res.status(400).json({ error: 'Missing snapshotBase64' });
    }

    const cleanBase64 = snapshotBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `You are Audit Air AI, a hands-free industrial safety compliance auditor. Inspect this workspace camera image rigorously for safety or regulatory violations under OSHA 1910 standards (e.g. missing PPE, blocked emergency exits, chemical or liquid spills, unguarded machines, trip hazards, open electrical panels). Context note: "${notes || 'Routine 1 FPS optical scan'}".
If any safety violation or potential hazard is observed, set hazard_detected to true, and provide concise hazard_type, description, severity (low, medium, high, critical), oshaStandard, and a crisp verbal_notification sentence suitable for hands-free audio alert. If no hazard is found, set hazard_detected to false.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hazard_detected: { type: Type.BOOLEAN },
            hazard_type: { type: Type.STRING },
            description: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] },
            oshaStandard: { type: Type.STRING },
            verbal_notification: { type: Type.STRING },
          },
          required: ['hazard_detected'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    if (parsed.hazard_detected && parsed.hazard_type) {
      const incident: StoredIncident = {
        id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        hazard_type: parsed.hazard_type,
        description: parsed.description || 'Observed regulatory violation',
        severity: parsed.severity || 'medium',
        snapshotBase64: snapshotBase64,
        status: 'flagged',
        oshaStandard: parsed.oshaStandard || mapOshaStandard(parsed.hazard_type),
      };

      storedIncidents.unshift(incident);

      return res.json({
        incident,
        transcript: parsed.verbal_notification || `Hazard identified: ${incident.hazard_type}. Violation logged.`,
      });
    } else {
      return res.json({
        incident: null,
        transcript: 'Frame scanned. No acute safety violation observed in field of view.',
      });
    }
  } catch (err) {
    console.error('Audit frame error:', err);
    res.status(500).json({ error: 'Failed to analyze frame' });
  }
});

// -------------------------------------------------------------
// HTTP SERVER & WEBSOCKET SETUP
// -------------------------------------------------------------

async function start() {
  const server = http.createServer(app);

  // Attach WebSocket Server on /ws/live
  const wss = new WebSocketServer({ server, path: '/ws/live' });

  wss.on('connection', (clientWs: WebSocket) => {
    console.log('[WS] Client connected to Audit Air Live Stream');

    clientWs.on('message', async (data: Buffer | string) => {
      try {
        const text = data.toString();
        const msg = JSON.parse(text);

        // Echo back heartbeat or handle client frame
        if (msg.setup) {
          clientWs.send(
            JSON.stringify({
              serverContent: {
                modelTurn: {
                  parts: [
                    {
                      text: 'Audit Air AI Live connection initialized. Ready to inspect visual frames.',
                    },
                  ],
                },
              },
            })
          );
        }
      } catch (err) {
        console.error('[WS] Error processing message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('[WS] Client disconnected');
    });
  });

  // Vite middleware in dev, static dist in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Audit Air AI Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
