// /api/quests.js — safe JSON storage with Upstash Redis REST (no double encoding)
// Uses env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

export default async function handler(req, res) {
  const user = (req.query.user || '').trim();
  if (!user) return res.status(400).json({ error: 'Missing ?user=' });

  const BASE  = process.env.UPSTASH_REDIS_REST_URL;
  const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!BASE || !TOKEN) return res.status(500).json({ error:'KV env vars missing' });

  const keyQuests = `quests:${user}`;
  const keyStats  = `stats:${user}`;

  try {
    if (req.method === 'GET') {
      const [qRaw, sRaw] = await Promise.all([
        fetch(`${BASE}/get/${encodeURIComponent(keyQuests)}`, { headers:{ Authorization:`Bearer ${TOKEN}` } }).then(r=>r.json()),
        fetch(`${BASE}/get/${encodeURIComponent(keyStats)}`,  { headers:{ Authorization:`Bearer ${TOKEN}` } }).then(r=>r.json())
      ]);

      const quests = safeParse(qRaw?.result, []);
      const stats  = safeParse(sRaw?.result, { xp:0, streak:0, lastDoneDate:null });

      return res.status(200).json({ ok:true, quests, stats });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);

      // read current
      const [qRaw, sRaw] = await Promise.all([
        fetch(`${BASE}/get/${encodeURIComponent(keyQuests)}`, { headers:{ Authorization:`Bearer ${TOKEN}` } }).then(r=>r.json()),
        fetch(`${BASE}/get/${encodeURIComponent(keyStats)}`,  { headers:{ Authorization:`Bearer ${TOKEN}` } }).then(r=>r.json())
      ]);

      let quests = safeParse(qRaw?.result, []);
      let stats  = safeParse(sRaw?.result, { xp:0, streak:0, lastDoneDate:null });

      // Actions:
      // add:    { title, due? }
      // toggle: { id, done: true|false }
      // snooze: { id, snooze: 'tonight'|'tomorrow' }
      if (body?.title) {
        quests.unshift({
          id: rid(),
          title: String(body.title),
          due: (body.due || today()).slice(0,10),
          done: false,
          createdAt: new Date().toISOString()
        });

      } else if (body?.id && typeof body.done === 'boolean') {
        const i = quests.findIndex(q=>q.id===body.id);
        if (i>=0) {
          const wasDone = !!quests[i].done;
          quests[i].done = !!body.done;

          if (!wasDone && body.done) {
            // XP + streak
            const t  = today();
            const y  = yesterday();
            if (stats.lastDoneDate === y) stats.streak = (stats.streak||0) + 1;
            else if (stats.lastDoneDate !== t) stats.streak = 1;
            stats.lastDoneDate = t;
            stats.xp = (stats.xp||0) + 10;
          }
        }

      } else if (body?.id && body.snooze) {
        const i = quests.findIndex(q=>q.id===body.id);
        if (i>=0) {
          quests[i].due = (body.snooze === 'tomorrow') ? addDays(1) : today();
        }
      } else {
        return res.status(400).json({ error:'Missing title, or id+done/snooze' });
      }

      // Save (send RAW JSON in body; do NOT encode)
      const [saveQ, saveS] = await Promise.all([
        fetch(`${BASE}/set/${encodeURIComponent(keyQuests)}`, {
          method:'POST', headers:{ Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json' },
          body: JSON.stringify(quests)
        }).then(r=>r.json()),
        fetch(`${BASE}/set/${encodeURIComponent(keyStats)}`, {
          method:'POST', headers:{ Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json' },
          body: JSON.stringify(stats)
        }).then(r=>r.json())
      ]);

      if (saveQ.error || saveS.error) return res.status(500).json({ saveQ, saveS });
      return res.status(200).json({ ok:true, stats });
    }

    res.setHeader('Allow','GET, POST'); 
    return res.status(405).json({ error:'Method not allowed' });

  } catch (e) {
    return res.status(500).json({ error:String(e) });
  }
}

/* helpers */
function readJson(req){ return new Promise((resolve,reject)=>{ let s=''; req.on('data',c=>s+=c); req.on('end',()=>{ try{ resolve(JSON.parse(s||'{}')) } catch(e){ reject(e) } }); }); }
function rid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function today(){ return new Date().toISOString().slice(0,10); }
function addDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function yesterday(){ const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }

// Safely parse value returned by Upstash (may be raw JSON or %encoded)
function safeParse(val, fallback){
  if (!val) return fallback;
  try { return JSON.parse(val); } catch{}
  try { return JSON.parse(decodeURIComponent(val)); } catch{}
  return fallback;
}