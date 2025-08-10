// /api/chaos.js — returns a random micro-quest with suggested XP
const DROPS = [
  { title:'Send a ridiculous meme to an old friend', xp:8 },
  { title:'No-spend hour: dodge every impulse', xp:9 },
  { title:'Teach Donnie a new trick attempt', xp:12 },
  { title:'Compliment a stranger (genuine)', xp:6 },
  { title:'Organize one chaotic corner (5 min)', xp:7 },
  { title:'Dance for 30 seconds like nobody’s watching', xp:6 },
  { title:'Hide a wholesome sticky note for Corey', xp:7 }
];

export default async function handler(req,res){
  const pick = DROPS[Math.floor(Math.random()*DROPS.length)];
  res.status(200).json(pick);
}