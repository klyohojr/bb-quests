// /api/xp-from-chat.js — secure bridge I can call from chat
// Call like: /api/xp-from-chat?secret=YOUR_CHAT_SECRET&amount=25
export default async function handler(req, res) {
  const secret = (req.query.secret || '').trim();
  const amount = Number(req.query.amount || 0);

  if (!secret || secret !== process.env.CHAT_SECRET)
    return res.status(403).json({ error: 'Unauthorized' });
  if (!amount || !Number.isFinite(amount))
    return res.status(400).json({ error: 'Bad amount' });

  // Build your own base URL (no SITE_URL env needed)
  const base =
    (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host;

  // Call the internal xp-bump using your WRITE_TOKEN (kept server-side)
  const r = await fetch(
    `${base}/api/xp-bump?user=kenny&add=${amount}&token=${encodeURIComponent(
      process.env.WRITE_TOKEN || ''
    )}`
  );
  const j = await r.json();
  return res.status(r.status).json(j);
}