export default async function handler(req, res) {
  const { secret, amount } = req.query;

  // Only allow if secret matches
  if (secret !== process.env.CHAT_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const bump = await fetch(
      `${process.env.SITE_URL}/api/xp-bump?user=kenny&add=${amount}&token=${process.env.WRITE_TOKEN}`
    );
    const data = await bump.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
