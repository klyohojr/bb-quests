// /api/xp.js — read current XP & stats
export default async function handler(req, res) {
  const user = (req.query.user || '').trim();
  if (!user) return res.status(400).json({ error: 'Missing ?user=' });

  const BASE  = process.env.UPSTASH_REDIS_REST_URL;
  const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!BASE || !TOKEN) return res.status(500).json({ error:'KV env vars missing' });

  const keyStats = `stats:${user}`;

  const r  = await fetch(`${BASE}/get/${encodeURIComponent(keyStats)}`, {
    headers:{ Authorization:`Bearer ${TOKEN}` }
  });
  const j  = await r.json();
  const stats = safeParse(j?.result, { xp:0, streak:0, lastDoneDate:null });

  return res.status(200).json({ ok:true, user, xp: stats.xp||0, stats });
}

function safeParse(val, fallback){
  if (!val) return fallback;
  try { return JSON.parse(val); } catch(_){}
  try { return JSON.parse(decodeURIComponent(val)); } catch(_){}
  return fallback;
}
