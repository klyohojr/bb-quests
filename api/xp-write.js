// /api/xp-write.js — secure XP updater
// Use header: X-Write-Token: <your WRITE_TOKEN>
// Body can be: { "user":"kenny", "add":25 }  OR  { "user":"kenny", "set":300 }

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ error:'POST only' }); }

  const hdr = (req.headers['x-write-token'] || '').trim();
  if (!process.env.WRITE_TOKEN || hdr !== process.env.WRITE_TOKEN)
    return res.status(401).json({ error:'Invalid token' });

  const BASE  = process.env.UPSTASH_REDIS_REST_URL;
  const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!BASE || !TOKEN) return res.status(500).json({ error:'KV env vars missing' });

  const body = await readJson(req).catch(()=>null);
  const user = (body?.user || '').trim();
  if (!user) return res.status(400).json({ error:'Missing body.user' });

  const keyStats = `stats:${user}`;

  // read current stats
  const g  = await fetch(`${BASE}/get/${encodeURIComponent(keyStats)}`, { headers:{ Authorization:`Bearer ${TOKEN}` }});
  const gj = await g.json();
  const stats = safeParse(gj?.result, { xp:0, streak:0, lastDoneDate:null });

  // update XP
  if (typeof body.set === 'number') {
    stats.xp = Math.max(0, Math.floor(body.set));
  } else if (typeof body.add === 'number') {
    stats.xp = Math.max(0, Math.floor((stats.xp||0) + body.add));
  } else {
    return res.status(400).json({ error:'Provide "add" or "set" number' });
  }

  // save (value encoded into URL)
  const valueS = encodeURIComponent(JSON.stringify(stats));
  const s = await fetch(`${BASE}/set/${encodeURIComponent(keyStats)}/${valueS}`, {
    method:'POST', headers:{ Authorization:`Bearer ${TOKEN}` }
  });
  const sj = await s.json();
  if (sj.error) return res.status(500).json(sj);

  return res.status(200).json({ ok:true, user, xp: stats.xp });
}

function readJson(req){ return new Promise((resolve,reject)=>{ let s=''; req.on('data',c=>s+=c); req.on('end',()=>{ try{ resolve(JSON.parse(s||'{}')) } catch(e){ reject(e) } }); }); }
function safeParse(val, fallback){
  if (!val) return fallback;
  try { return JSON.parse(val); } catch(_){}
  try { return JSON.parse(decodeURIComponent(val)); } catch(_){}
  return fallback;
}
