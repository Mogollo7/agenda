// server.js — Servidor REST de inspecciones · Node 24, cero dependencias externas
// SQLite (node:sqlite), HTTP (node:http), crypto (node:crypto)
'use strict';

const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.DATA_DIR || '/data';
const API_TOKEN = process.env.API_TOKEN || '';
const MAX_BODY = 16 * 1024; // 16 KB
const RATE_LIMIT = 60;      // peticiones/min por IP
const RATE_WINDOW = 60_000; // 1 minuto

// ── Base de datos ───────────────────────────────────────────────────────────
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'inspecciones.db'));
db.exec(`CREATE TABLE IF NOT EXISTS inspecciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_local TEXT UNIQUE,
  espacio TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  prioridad TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Pendiente',
  creada TEXT NOT NULL,
  actualizada TEXT NOT NULL
)`);

// ── Constantes de validación ────────────────────────────────────────────────
const ESPACIOS = ['Aula', 'Laboratorio', 'Sala', 'Zona común'];
const TIPOS = ['Eléctrica', 'Estructural', 'Limpieza', 'Equipamiento', 'Seguridad', 'Otra'];
const PRIORIDADES = ['Baja', 'Media', 'Alta'];
const ESTADOS = ['Pendiente', 'Resuelta'];

// ── Rate limiting en memoria ────────────────────────────────────────────────
const hits = new Map(); // ip → { count, resetAt }

function rateOk(ip) {
  const now = Date.now();
  let entry = hits.get(ip);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    hits.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    const retry = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, retry };
  }
  return { ok: true };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const iso = () => new Date().toISOString();

function row2json(r) {
  return {
    id: r.id, idLocal: r.id_local, espacio: r.espacio, tipo: r.tipo,
    descripcion: r.descripcion, prioridad: r.prioridad, estado: r.estado,
    creada: r.creada, actualizada: r.actualizada
  };
}

function send(res, code, body) {
  const json = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  });
  res.end(json);
}

function send204(res) {
  res.writeHead(204, {
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let aborted = false;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY && !aborted) {
        aborted = true;
        req.resume(); // drain remaining data
        reject('TOO_LARGE');
        return;
      }
      if (!aborted) chunks.push(chunk);
    });
    req.on('end', () => { if (!aborted) resolve(Buffer.concat(chunks).toString()); });
    req.on('error', (e) => { if (!aborted) reject(e); });
  });
}

function checkAuth(req) {
  if (!API_TOKEN) return false; // sin token configurado no se permiten escrituras
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Bearer ')) return false;
  const token = header.slice(7);
  if (token.length !== API_TOKEN.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(API_TOKEN));
  } catch { return false; }
}

function validar(body, parcial = false) {
  const errores = {};
  if (!parcial || body.espacio !== undefined) {
    if (!ESPACIOS.includes(body.espacio)) errores.espacio = `Debe ser uno de: ${ESPACIOS.join(', ')}`;
  }
  if (!parcial || body.tipo !== undefined) {
    if (!TIPOS.includes(body.tipo)) errores.tipo = `Debe ser uno de: ${TIPOS.join(', ')}`;
  }
  if (!parcial || body.prioridad !== undefined) {
    if (!PRIORIDADES.includes(body.prioridad)) errores.prioridad = `Debe ser uno de: ${PRIORIDADES.join(', ')}`;
  }
  if (!parcial || body.descripcion !== undefined) {
    if (typeof body.descripcion !== 'string' || body.descripcion.length < 10 || body.descripcion.length > 300)
      errores.descripcion = 'Debe tener entre 10 y 300 caracteres';
  }
  if (!parcial || body.estado !== undefined) {
    if (body.estado !== undefined && !ESTADOS.includes(body.estado))
      errores.estado = `Debe ser uno de: ${ESTADOS.join(', ')}`;
  }
  return Object.keys(errores).length ? errores : null;
}

// ── Prepared statements ─────────────────────────────────────────────────────
const stmts = {
  insert: db.prepare(`INSERT INTO inspecciones (id_local, espacio, tipo, descripcion, prioridad, estado, creada, actualizada)
                      VALUES (?, ?, ?, ?, ?, 'Pendiente', ?, ?)`),
  byLocal: db.prepare(`SELECT * FROM inspecciones WHERE id_local = ?`),
  byId: db.prepare(`SELECT * FROM inspecciones WHERE id = ?`),
  del: db.prepare(`DELETE FROM inspecciones WHERE id = ?`),
  count: db.prepare(`SELECT count(*) as total FROM inspecciones`),
  countF: db.prepare(`SELECT count(*) as total FROM inspecciones WHERE (:estado IS NULL OR estado = :estado) AND (:espacio IS NULL OR espacio = :espacio)`),
  listF: db.prepare(`SELECT * FROM inspecciones WHERE (:estado IS NULL OR estado = :estado) AND (:espacio IS NULL OR espacio = :espacio) ORDER BY id DESC LIMIT :limit OFFSET :offset`),
};

// ── Router ──────────────────────────────────────────────────────────────────
const PREFIX = '/api/v1';

async function handler(req, res) {
  const ip = req.socket.remoteAddress || '0.0.0.0';
  const rate = rateOk(ip);
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retry));
    return send(res, 429, { error: 'Demasiadas peticiones' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  const method = req.method;

  // ── Salud ──
  if (p === `${PREFIX}/salud` && method === 'GET') {
    return send(res, 200, { ok: true });
  }

  // ── Colección ──
  if (p === `${PREFIX}/inspecciones` && method === 'GET') {
    const estado = url.searchParams.get('estado') || null;
    const espacio = url.searchParams.get('espacio') || null;
    let limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);
    if (limit < 1) limit = 20;
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const rows = stmts.listF.all({ ':estado': estado, ':espacio': espacio, ':limit': limit, ':offset': offset });
    const { total } = stmts.countF.get({ ':estado': estado, ':espacio': espacio });
    return send(res, 200, { datos: rows.map(row2json), total, limit, offset });
  }

  // ── Recurso individual (GET / PATCH / DELETE) ──
  const match = p.match(new RegExp(`^${PREFIX}/inspecciones/(\\d+)$`));
  if (match) {
    const id = parseInt(match[1], 10);

    if (method === 'GET') {
      const row = stmts.byId.get(id);
      return row ? send(res, 200, row2json(row)) : send(res, 404, { error: 'No encontrado' });
    }

    if (method === 'PATCH') {
      if (!checkAuth(req)) return send(res, 401, { error: 'No autorizado' });
      const ct = (req.headers['content-type'] || '').split(';')[0].trim();
      if (ct !== 'application/json') return send(res, 415, { error: 'Content-Type debe ser application/json' });
      let raw;
      try { raw = await readBody(req); } catch (e) {
        if (e === 'TOO_LARGE') return send(res, 413, { error: 'Cuerpo demasiado grande' });
        return send(res, 400, { error: 'Error leyendo cuerpo' });
      }
      let body;
      try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'JSON inválido' }); }

      const errs = validar(body, true);
      if (errs) return send(res, 400, { error: 'validacion', campos: errs });

      const existing = stmts.byId.get(id);
      if (!existing) return send(res, 404, { error: 'No encontrado' });

      // Control de versión optimista
      if (body.actualizada) {
        const clientDate = new Date(body.actualizada).getTime();
        const serverDate = new Date(existing.actualizada).getTime();
        if (clientDate < serverDate) {
          return send(res, 409, { error: 'conflicto', servidor: row2json(existing) });
        }
      }

      const now = iso();
      const updates = [];
      const vals = [];
      for (const col of ['espacio', 'tipo', 'descripcion', 'prioridad', 'estado']) {
        if (body[col] !== undefined) { updates.push(`${col} = ?`); vals.push(body[col]); }
      }
      if (updates.length === 0) return send(res, 200, row2json(existing));
      updates.push('actualizada = ?'); vals.push(now);
      vals.push(id);
      db.prepare(`UPDATE inspecciones SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
      return send(res, 200, row2json(stmts.byId.get(id)));
    }

    if (method === 'DELETE') {
      if (!checkAuth(req)) return send(res, 401, { error: 'No autorizado' });
      const existing = stmts.byId.get(id);
      if (!existing) return send(res, 404, { error: 'No encontrado' });
      stmts.del.run(id);
      return send204(res);
    }

    return send(res, 405, { error: 'Método no permitido' });
  }

  // ── Crear ──
  if (p === `${PREFIX}/inspecciones` && method === 'POST') {
    if (!checkAuth(req)) return send(res, 401, { error: 'No autorizado' });
    const ct = (req.headers['content-type'] || '').split(';')[0].trim();
    if (ct !== 'application/json') return send(res, 415, { error: 'Content-Type debe ser application/json' });
    let raw;
    try { raw = await readBody(req); } catch (e) {
      if (e === 'TOO_LARGE') return send(res, 413, { error: 'Cuerpo demasiado grande' });
      return send(res, 400, { error: 'Error leyendo cuerpo' });
    }
    let body;
    try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'JSON inválido' }); }

    const errs = validar(body);
    if (errs) return send(res, 400, { error: 'validacion', campos: errs });

    // Idempotencia por idLocal
    if (body.idLocal) {
      const dup = stmts.byLocal.get(body.idLocal);
      if (dup) return send(res, 200, row2json(dup));
    }

    const now = iso();
    const creada = body.creada || now;
    const idLocal = body.idLocal || null;
    const info = stmts.insert.run(idLocal, body.espacio, body.tipo, body.descripcion, body.prioridad, creada, now);
    const created = stmts.byId.get(info.lastInsertRowid);
    res.setHeader('Location', `${PREFIX}/inspecciones/${created.id}`);
    return send(res, 201, row2json(created));
  }

  send(res, 404, { error: 'Ruta no encontrada' });
}

// ── Servidor ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  try { await handler(req, res); }
  catch (e) { if (!res.headersSent) send(res, 500, { error: 'Error interno' }); }
});
server.listen(PORT, () => console.log(`✔ Servidor escuchando en :${PORT}`));
