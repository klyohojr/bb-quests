// /api/addQuest.js — simple "add only" tester (path-style SET key/value)
export default async function handler(req, res) {
  const user  = (req.query.user  || '').trim();
  const title = (req.query.title || '').trim();
  const due   = (req.query.due   || new Date().toISOString().slice(0,10)).slice(0,10);
  if (!user || !title) return res.status(400).json({ error:'Missing user or title' });

  const BASE  = process.env.UPSTASH_REDIS_REST_URL;
  const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!BASE || !TOKEN) return res.status(500).json({ error:'KV env vars missing' });

  const keyQuests = `quests:${user}`;

  // read current array
  const g  = await fetch(`${BASE}/get/${encodeURIComponent(keyQuests)}`, {
    headers:{ Authorization:`Bearer ${TOKEN}` }
  });
  const gj = await g.json();
  const arr = safeParse(gj?.result, []);

  // add new item
  arr.unshift({ id: rid(), title, due, done:false, createdAt:new Date().toISOString() });

  // SAVE: value must be in the URL (encoded)
  const value = encodeURIComponent(JSON.stringify(arr));
  const s = await fetch(`${BASE}/set/${encodeURIComponent(keyQuests)}/${value}`, {
    method:'POST', headers:{ Authorization:`Bearer ${TOKEN}` }
  });
  const sj = await s.json();
  if (sj.error) return res.status(500).json(sj);

  return res.status(200).json({ ok:true, count:arr.length });
}

function rid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function safeParse(val, fallback){
  if (!val) return fallback;
  try { return JSON.parse(val); } catch(_){}
  try { return JSON.parse(decodeURIComponent(val)); } catch(_){}
  return fallback;
}