// Monsoon Market — one place for every number the game balances on:
// weapons, utility, economy, rounds, teams and bot names. Nothing else
// in the code invents a price, a damage or a timer.
export const TEAMS = {
  ATTACK: { id: 'attack', name: 'RAINRUNNERS', short: 'RAIN', color: '#ff2e88' },
  DEFEND: { id: 'defend', name: 'STALLKEEPERS', short: 'STALL', color: '#22d3ee' },
};

// damage is per body hit; head multiplies. spread is radians of cone half-angle.
export const WEAPONS = {
  p9: {
    id: 'p9', name: 'PETRICHOR P9', kind: 'pistol', price: 0,
    damage: 34, headMult: 4, mag: 12, reserve: 36, fireGap: 0.16, reload: 1.4,
    spreadStill: 0.004, spreadMove: 0.02, auto: false, kick: 0.006, range: 60,
  },
  drizzle: {
    id: 'drizzle', name: 'DRIZZLE SMG', kind: 'smg', price: 1500,
    damage: 26, headMult: 4, mag: 30, reserve: 120, fireGap: 0.075, reload: 1.7,
    spreadStill: 0.006, spreadMove: 0.03, auto: true, kick: 0.005, range: 55,
  },
  monsoon: {
    id: 'monsoon', name: 'MONSOON AR', kind: 'rifle', price: 2700,
    damage: 33, headMult: 4, mag: 25, reserve: 100, fireGap: 0.096, reload: 1.9,
    spreadStill: 0.0022, spreadMove: 0.028, auto: true, kick: 0.009, range: 80,
  },
  longrain: {
    id: 'longrain', name: 'LONG RAIN DMR', kind: 'dmr', price: 3500,
    damage: 80, headMult: 4, mag: 10, reserve: 30, fireGap: 0.9, reload: 2.4,
    spreadStill: 0.0012, spreadMove: 0.04, auto: false, kick: 0.02, range: 100,
  },
  stallbreaker: {
    id: 'stallbreaker', name: 'STALLBREAKER', kind: 'shotgun', price: 1800,
    damage: 22, headMult: 3, mag: 6, reserve: 24, fireGap: 0.8, reload: 2.6,
    spreadStill: 0.03, spreadMove: 0.05, auto: false, kick: 0.022, range: 25,
    pellets: 6,
  },
  knife: {
    id: 'knife', name: 'RAIN KNIFE', kind: 'knife', price: 0,
    damage: 40, headMult: 1, mag: Infinity, reserve: 0, fireGap: 0.5, reload: 0,
    spreadStill: 0, spreadMove: 0, auto: false, kick: 0, range: 2.2,
  },
};

export const UTILITY = {
  frag: { id: 'frag', name: 'FRAG', price: 300 },
  smoke: { id: 'smoke', name: 'SMOKE', price: 300 },
  flash: { id: 'flash', name: 'FLASH', price: 200 },
  kit: { id: 'kit', name: 'DEFUSE KIT', price: 400 },
};

export const ECONOMY = {
  start: 800,
  win: 3000,
  loss: 1900,
  kill: 300,
  plant: 300,
  defuse: 300,
  armor: 650,
  helm: 350,
};

export const ROUND = {
  freeze: 8, // seconds of buy phase
  live: 100, // round timer
  fuse: 40, // stormcell fuse after plant
  plantTime: 3, // seconds holding E to plant
  defuseTime: 5,
  defuseKitTime: 2.5,
  maxRounds: 12,
  winRounds: 7,
  halfAt: 6,
};

export const BOT_NAMES = [
  { name: 'Rani', role: 'Entry' },
  { name: 'Budi', role: 'Support' },
  { name: 'Sari', role: 'Anchor' },
  { name: 'Agus', role: 'Lurk' },
  { name: 'Dewi', role: 'AWP' },
  { name: 'Joko', role: 'Entry' },
  { name: 'Maya', role: 'Support' },
  { name: 'Rizky', role: 'Anchor' },
  { name: 'Lestari', role: 'Lurk' },
  { name: 'Fajar', role: 'AWP' },
];

// One store for all match state. Modules read and write this object only;
// nothing keeps a second copy of the score, the timer or the round.
export function createGameState() {
  return {
    phase: 'freeze', // freeze | live | planted | roundEnd | matchEnd
    round: 1,
    half: 1,
    scoreAttack: 0,
    scoreDefend: 0,
    timer: ROUND.freeze,
    time: 0,
    winner: null, // 'attack' | 'defend' | null
    matchWinner: null,
    stormcell: {
      carrierId: null, // actor id carrying it
      planted: false,
      site: null, // 'A' | 'B'
      fuse: 0,
      plantProgress: 0,
      defuseProgress: 0,
      defuserId: null,
    },
    actors: [], // player + bots, in team order
    playerId: 'you',
    plan: null, // { text, site, role } shown in the top bar
    feed: [], // kill feed entries { text, kind }
    radio: [], // radio/chat lines { who, text, mine }
    noises: [], // { x, z, radius, ttl } gunshots bots can hear
    roundLog: [],
  };
}
