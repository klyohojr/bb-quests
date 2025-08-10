// /api/xp-bump.js — temporary tester for iPhone (uses ?token=... in URL)
// Example: /api/xp-bump?user=kenny&add=10&token=YOUR_WRITE_TOKEN
export default async function handler(req,res){
  const user  = (req.query.user  || '').trim();
  const add   = req.query.add   ? Number(req.query.add) : null;
  const set   = req.query.set   ? Number(req.query.set) : null;
  const token = (req.query.token||'').trim();

  if (!user) return res.status(400).json({error:'Missing ?user='});
  if (!token || token !== process.env.WRITE_TOKEN) return res.status(401).json({error:'Invalid token'});

  // forward to xp-write:
  const r = await fetch(`${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}/api/xp-write`,{
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'X-Write-Token': token },
    body: JSON.stringify(set!=null ? {user, set} : {user, add})
  });
  const j = await r.json();
  res.status(r.status).json(j);
}
