// /api/quests.js — quests API with Auto-XP, Snooze, Streaks (Upstash KV path REST)
export default async function handler(req, res) {
  const user = (req.query.user || '').trim();
  if (!user) return res.status(400).json({ error: 'Missing ?user=' });

  const BASE  = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;
  if (!BASE || !TOKEN) return res.status(500).json({ error:'KV env vars missing' });

  const keyQuests = `quests:${user}`;
  const keyStats  = `stats:${user}`; // {xp, streak, lastDoneDate}

  try {
    if (req.method === 'GET') {
      const [qj, sj] = await Promise.all([
        fetch(`${BASE}/get/${encodeURIComponent(keyQuests)}`, { headers:{Authorization:`Bearer ${TOKEN}`}}).then(r=>r.json()),
        fetch(`${BASE}/get/${encodeURIComponent(keyStats)}`,  { headers:{Authorization:`Bearer ${TOKEN}`}}).then(r=>r.json())
      ]);
      const quests = qj.result ? JSON.parse(qj.result) : [];
      const stats  = sj.result ? JSON.parse(sj.result) : { xp:0, streak:0, lastDoneDate:null };
      return res.status(200).json({ quests, stats });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const qj = await fetch(`${BASE}/get/${encodeURIComponent(keyQuests)}`, { headers:{Authorization:`Bearer ${TOKEN}`}}).then(r=>r.json());
      const sj = await fetch(`${BASE}/get/${encodeURIComponent(keyStats)}`,  { headers:{Authorization:`Bearer ${TOKEN}`}}).then(r=>r.json());
      const quests = qj.result ? JSON.parse(qj.result) : [];
      const stats  = sj.result ? JSON.parse(sj.result) : { xp:0, streak:0, lastDoneDate:null };

      // Actions:
      // - add: { title, due }
      // - toggle done: { id, done: true/false }
      // - snooze: { id, snooze: 'tonight' | 'tomorrow' }
      if (body && body.title) {
        quests.unshift({
          id: rid(),
          title: String(body.title),
          due: (body.due || new Date().toISOString().slice(0,10)).slice(0,10),
          done: false,
          createdAt: new Date().toISOString()
        });
      } else if (body && body.id && typeof body.done === 'boolean') {
        const i = quests.findIndex(q=>q.id===body.id);
        if (i>=0) {
          const wasDone = !!quests[i].done;
          quests[i].done = !!body.done;

          // Auto-XP + Streaks on first completion
          if (!wasDone && body.done) {
            const today = new Date().toISOString().slice(0,10);
            const y = new Date(); y.setDate(y.getDate()-1);
            const yesterday = y.toISOString().slice(0,10);

            // streak logic
            if (stats.lastDoneDate === today) {
              // same-day completion: keep streak as is
            } else if (stats.lastDoneDate === yesterday) {
              stats.streak = (stats.streak||0) + 1;
            } else {
              stats.streak = 1;
            }
            stats.lastDoneDate = today;

            // XP award (simple): +10 per quest
            stats.xp = (stats.xp||0) + 10;
          }
        }
      } else if (body && body.id && body.snooze) {
        const i = quests.findIndex(q=>q.id===body.id);
        if (i>=0) {
          const today = new Date();
          if (body.snooze === 'tonight') {
            // keep due as today (make sure it's set)
            quests[i].due = new Date().toISOString().slice(0,10);
          } else { // 'tomorrow'
            const t = new Date(); t.setDate(t.getDate()+1);
            quests[i].due = t.toISOString().slice(0,10);
          }
        }
      } else {
        return res.status(400).json({ error:'Missing title, or id+done/snooze' });
      }

      // Save quests
      const saveQ = await fetch(`${BASE}/set/${encodeURIComponent(keyQuests)}/${encodeURIComponent(JSON.stringify(quests))}`, {
        method:'POST', headers:{Authorization:`Bearer ${TOKEN}` }
      }).then(r=>r.json());

      // Save stats
      const saveS = await fetch(`${BASE}/set/${encodeURIComponent(keyStats)}/${encodeURIComponent(JSON.stringify(stats))}`, {
        method:'POST', headers:{Authorization:`Bearer ${TOKEN}` }
      }).then(r=>r.json());

      if (saveQ.error || saveS.error) return res.status(500).json({ saveQ, saveS });
      return res.status(200).json({ ok:true, stats });
    }

    res.setHeader('Allow','GET, POST'); return res.status(405).json({ error:'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error:String(e) });
  }
}

function readJson(req){ return new Promise((resolve,reject)=>{ let s=''; req.on('data',c=>s+=c); req.on('end',()=>{ try{ resolve(JSON.parse(s||'{}')) } catch(e){ reject(e) } }); }); }
function rid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }