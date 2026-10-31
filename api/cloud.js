// Función serverless de Vercel: guarda los archivos CIFRADOS de cada cuenta de CloudCTRL.
// El cifrado y el descifrado ocurren en el dispositivo; aquí solo llegan bloques ilegibles,
// también los nombres de los archivos. TextCTRL y SheetCTRL llaman a esta misma función desde
// sus propios dominios (CORS).
//
//   GET  /api/cloud                                       -> { configured, vars }  (comprobación)
//   POST { action: 'register', user, auth, invite }       -> crea la cuenta (requiere la clave de registro)
//   POST { action: 'login', user, auth }                  -> { ok }
//   POST { action: 'list', user, auth }                   -> { files, used, quota }
//   POST { action: 'chunk-put', …, id, gen, n, blob }     -> { ok }   (un trozo, caduca si no se confirma)
//   POST { action: 'commit', …, id, gen, chunks, size, meta, baseRev } -> { rev } | 409 { rev }
//   POST { action: 'chunk-get', …, id, gen, n }           -> { blob }
//   POST { action: 'trash' | 'restore' | 'purge', …, id } -> { ok }
//
// `user` = SHA-256 del nombre de usuario y `auth` = clave derivada de la contraseña (PBKDF2),
// ambos calculados en el dispositivo. El servidor solo guarda el SHA-256 de `auth`.
// Almacenamiento: Upstash Redis (integración de Vercel), con claves que empiezan por «cld:».

function findRedisEnv(env = process.env) {
  const known = [['KV_REST_API_URL', 'KV_REST_API_TOKEN'], ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']];
  for (const [u, t] of known) if (env[u] && env[t]) return { url: env[u], token: env[t] };
  for (const k of Object.keys(env)) {
    const m = k.match(/^(.*)(REST_API_URL|REDIS_REST_URL)$/);
    if (!m || !/^https:\/\//.test(env[k] || '')) continue;
    const tk = m[1] + m[2].replace('URL', 'TOKEN');
    if (env[tk]) return { url: env[k], token: env[tk] };
  }
  return { url: null, token: null };
}
const { url: REDIS_URL, token: REDIS_TOKEN } = findRedisEnv();

const ORIGINS = ['https://text-app-olive.vercel.app', 'https://sheet-app-lake.vercel.app'];
const LOCAL_ORIGIN = /^http:\/\/localhost(:\d+)?$/;
const MAX_CHUNK = 3100000;            // cada trozo cifrado (base64); Vercel admite 4,5 MB por petición
const MAX_CHUNKS = 12;                // ≈ 36 MB por archivo
const MAX_META = 8192;
const QUOTA = 200 * 1024 * 1024;      // por cuenta; el plan gratuito de Upstash guarda 256 MB
const TRASH_DAYS = 30;
const CHUNK_TTL_S = 60 * 60;          // los trozos sin confirmar desaparecen solos
const FILE_ID = /^[A-Za-z0-9-]{6,48}$/;
const GEN = /^[a-f0-9]{16}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const MAX_FAILS = 10;                 // intentos fallidos de contraseña…
const FAIL_WINDOW_S = 15 * 60;        // …por cada 15 minutos
// Clave de registro: la misma que en las demás apps. Se puede cambiar con la variable SIGNUP_CODE.
const SIGNUP_CODE_SHA256 = 'ac1d2e03863dfb13990eb55aff6af1041c1b837f64c9f9fd5926bc7347c5c3db';
const MAX_SIGNUP_FAILS = 10;
// Confirmación condicionada a la revisión: evita pisar cambios de otro dispositivo.
const COMMIT_SCRIPT = `
local rev = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')
if rev ~= tonumber(ARGV[2]) then return {0, rev} end
redis.call('HSET', KEYS[1], ARGV[1], rev + 1)
redis.call('HSET', KEYS[2], ARGV[1], ARGV[3])
return {1, rev + 1}`;

async function redis(...command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Comparación en tiempo constante.
function sameHex(a, b) {
  if (typeof a !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// HGETALL llega como lista plana [campo, valor, campo, valor…]
function pairs(flat) {
  const out = {};
  for (let i = 0; i + 1 < (flat || []).length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

const chunkKey = (user, id, gen, n) => `cld:chunk:${user}:${id}:${gen}:${n}`;
const chunkKeys = (user, id, entry) => Array.from({ length: entry.chunks }, (_, n) => chunkKey(user, id, entry.gen, n));

function setCors(req, res) {
  const origin = req.headers?.origin;
  if (origin && (ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  // Comprobación (abrir /api/cloud en el navegador): solo los nombres de las variables, nunca sus valores.
  if (req.method === 'GET') {
    return res.status(200).json({
      configured: !!(REDIS_URL && REDIS_TOKEN),
      vars: Object.keys(process.env).filter((k) => /KV|REDIS|UPSTASH|REST_API/.test(k)).sort(),
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'not-configured' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { action, user, auth, id, gen } = body;
  if (!HEX64.test(user || '') || !HEX64.test(auth || '')) return res.status(400).json({ error: 'bad-request' });

  const key = `cld:acct:${user}`;
  const failKey = `cld:fail:${user}`;
  const idxKey = `cld:idx:${user}`;
  const revKey = `cld:rev:${user}`;

  try {
    const verifier = await sha256hex(auth);

    if (action === 'register') {
      // Límite por IP para que la clave de registro no se pueda adivinar probando.
      const ip = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'desconocida').split(',')[0].trim();
      const ipKey = `cld:signupfail:${await sha256hex(ip)}`;
      if ((Number(await redis('GET', ipKey)) || 0) >= MAX_SIGNUP_FAILS) return res.status(429).json({ error: 'too-many' });
      const expected = process.env.SIGNUP_CODE ? await sha256hex(process.env.SIGNUP_CODE) : SIGNUP_CODE_SHA256;
      const given = await sha256hex(String(body.invite ?? '').trim());
      if (!sameHex(given, expected)) {
        await redis('INCR', ipKey);
        await redis('EXPIRE', ipKey, FAIL_WINDOW_S);
        return res.status(403).json({ error: 'invite' });
      }
      const created = await redis('HSETNX', key, 'verifier', verifier);
      if (!created) return res.status(409).json({ error: 'exists' });
      await redis('HSET', key, 'created', Date.now());
      return res.status(200).json({ ok: true });
    }

    // Límite de intentos para frenar ataques de fuerza bruta a la contraseña.
    const fails = Number(await redis('GET', failKey)) || 0;
    if (fails >= MAX_FAILS) return res.status(429).json({ error: 'too-many' });

    const stored = await redis('HGET', key, 'verifier');
    if (!stored || !sameHex(stored, verifier)) {
      await redis('INCR', failKey);
      await redis('EXPIRE', failKey, FAIL_WINDOW_S);
      return res.status(401).json({ error: 'auth' }); // mismo error si no existe: no revela usuarios
    }
    if (fails) await redis('DEL', failKey);

    if (action === 'login') return res.status(200).json({ ok: true });

    const readEntry = async () => {
      const raw = await redis('HGET', idxKey, id);
      return raw ? JSON.parse(raw) : null;
    };
    const dropFile = async (entry) => {
      await redis('DEL', ...chunkKeys(user, id, entry));
      await redis('HDEL', idxKey, id);
      await redis('HDEL', revKey, id);
    };

    if (action === 'list') {
      const idx = pairs(await redis('HGETALL', idxKey));
      const revs = pairs(await redis('HGETALL', revKey));
      const limit = Date.now() - TRASH_DAYS * 864e5;
      const files = [];
      let used = 0;
      for (const [fileId, raw] of Object.entries(idx)) {
        const entry = JSON.parse(raw);
        if (entry.trashed && entry.trashed < limit) {
          await redis('DEL', ...chunkKeys(user, fileId, entry));
          await redis('HDEL', idxKey, fileId);
          await redis('HDEL', revKey, fileId);
          continue;
        }
        used += entry.size;
        files.push({ id: fileId, rev: Number(revs[fileId]) || 0, ...entry });
      }
      return res.status(200).json({ files, used, quota: QUOTA });
    }

    if (action === 'chunk-put') {
      const { n, blob } = body;
      if (!FILE_ID.test(id || '') || !GEN.test(gen || '') || !Number.isInteger(n) || n < 0 || n >= MAX_CHUNKS
        || typeof blob !== 'string' || !blob || blob.length > MAX_CHUNK) return res.status(400).json({ error: 'bad-request' });
      await redis('SET', chunkKey(user, id, gen, n), blob, 'EX', CHUNK_TTL_S);
      return res.status(200).json({ ok: true });
    }

    if (action === 'commit') {
      const { chunks, size, meta, baseRev } = body;
      if (!FILE_ID.test(id || '') || !GEN.test(gen || '') || !Number.isInteger(chunks) || chunks < 1 || chunks > MAX_CHUNKS
        || !Number.isInteger(size) || size < 0 || size > chunks * MAX_CHUNK
        || typeof meta !== 'string' || !meta || meta.length > MAX_META || !Number.isInteger(baseRev)) {
        return res.status(400).json({ error: 'bad-request' });
      }
      const idx = pairs(await redis('HGETALL', idxKey));
      let used = 0;
      for (const [fileId, raw] of Object.entries(idx)) if (fileId !== id) used += JSON.parse(raw).size;
      if (used + size > QUOTA) return res.status(413).json({ error: 'quota' });
      const previous = idx[id] ? JSON.parse(idx[id]) : null;
      const entry = { gen, chunks, size, meta, at: Date.now() };
      const [ok, rev] = await redis('EVAL', COMMIT_SCRIPT, 2, revKey, idxKey, id, baseRev, JSON.stringify(entry));
      if (!ok) return res.status(409).json({ error: 'conflict', rev });
      const keys = chunkKeys(user, id, entry);
      const kept = await Promise.all(keys.map((k) => redis('PERSIST', k)));
      if (kept.some((v) => !v)) { // falta algún trozo: el archivo no se puede dar por guardado
        await redis('HSET', revKey, id, rev);
        if (previous) await redis('HSET', idxKey, id, JSON.stringify(previous));
        else await redis('HDEL', idxKey, id);
        return res.status(400).json({ error: 'missing-chunk' });
      }
      if (previous && previous.gen !== gen) await redis('DEL', ...chunkKeys(user, id, previous));
      return res.status(200).json({ rev });
    }

    if (action === 'chunk-get') {
      if (!FILE_ID.test(id || '') || !GEN.test(gen || '') || !Number.isInteger(body.n)) return res.status(400).json({ error: 'bad-request' });
      const blob = await redis('GET', chunkKey(user, id, gen, body.n));
      if (!blob) return res.status(404).json({ error: 'not-found' });
      return res.status(200).json({ blob });
    }

    if (action === 'trash' || action === 'restore' || action === 'purge') {
      if (!FILE_ID.test(id || '')) return res.status(400).json({ error: 'bad-request' });
      const entry = await readEntry();
      if (!entry) return res.status(200).json({ ok: true }); // ya no está
      if (action === 'purge') {
        await dropFile(entry);
        return res.status(200).json({ ok: true });
      }
      if (action === 'trash') entry.trashed = Date.now();
      else delete entry.trashed;
      await redis('HSET', idxKey, id, JSON.stringify(entry));
      await redis('HINCRBY', revKey, id, 1);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'bad-action' });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'storage' });
  }
};
