// Minimal quests API using Upstash/Vercel KV (path-style REST)
export default async function handler(req, res) {
  const user = (req.query.user || '').trim();
  if (!user) return res.status(400).json({ error: 'Missing ?user=' });

  const BASE  = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;
  if (!BASE || !TOKEN) return res.status(500).json({ error: 'KV env vars missing' });

  const key = `quests:${user}`;

  try {
    if (req.method === 'GET') {
      const g = await fetch(`${BASE}/get/${encodeURIComponent(key)}`, { headers:{Authorization:`Bearer ${TOKEN}` }});
      const gj = await g.json();
      const arr = gj.result ? JSON.parse(gj.result) : [];
      return res.status(200).json({ quests: arr });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const g = await fetch(`${BASE}/get/${encodeURIComponent(key)}`, { headers:{Authorization:`Bearer ${TOKEN}` }});
      const gj = await g.json();
      const arr = gj.result ? JSON.parse(gj.result) : [];

      if (body && body.id) {
        // toggle done/undone
        const idx = arr.findIndex(q=>q.id===body.id);
        if (idx>=0) arr[idx].done = !!body.done;
      } else if (body && body.title) {
        arr.unshift({ id: cryptoId(), title: String(body.title), due: (body.due||'').slice(0,10), done:false, createdAt: new Date().toISOString() });
      } else {
        return res.status(400).json({ error:'Missing title or id' });
      }

      const s = await fetch(`${BASE}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(arr))}`, {
        method:'POST', headers:{Authorization:`Bearer ${TOKEN}`}
      });
      const sj = await s.json();
      if (sj.error) return res.status(500).json(sj);
      return res.status(200).json({ ok:true });
    }

    res.setHeader('Allow','GET, POST'); return res.status(405).json({ error:'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

function readJson(req){ return new Promise((resolve,reject)=>{ let s=''; req.on('data',c=>s+=c); req.on('end',()=>{ try{ resolve(JSON.parse(s||'{}')) } catch(e){ reject(e) } }); }); }
function cryptoId(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
