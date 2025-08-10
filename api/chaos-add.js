// Adds a random chaos drop directly to your quests (GET)
// Usage: /api/chaos-add?user=kenny
export default async function handler(req,res){
  const user = (req.query.user||'').trim();
  if(!user) return res.status(400).json({error:'Missing ?user='});

  // build base URL of this deployment
  const base = (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host;

  // get a random drop
  const r = await fetch(`${base}/api/chaos`);
  const pick = await r.json();

  // add it via addQuest
  const q = await fetch(`${base}/api/addQuest?user=${encodeURIComponent(user)}&title=${encodeURIComponent(pick.title)}`);
  const j = await q.json();
  return res.status(200).json({ ok:true, added: pick.title, result: j });
}