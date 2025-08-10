// Adds a random chaos drop directly to your quests (GET)
// Usage: /api/chaos-add?user=kenny
import chaos from './chaos.js';

export default async function handler(req,res){
  const user = (req.query.user||'').trim();
  if(!user) return res.status(400).json({error:'Missing ?user='});

  // get a random drop
  const pick = await (async()=> {
    const r = await fetch(`${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}/api/chaos`);
    return r.json();
  })();

  // reuse addQuest endpoint
  const q = await fetch(`${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}/api/addQuest?user=${encodeURIComponent(user)}&title=${encodeURIComponent(pick.title)}`);
  const j = await q.json();
  res.status(200).json({ ok:true, added: pick.title, result: j });
}
