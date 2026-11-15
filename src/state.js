// Yardline — one place for every number the game balances on: weapons,
// utility, economy, rounds, teams and bot names. Nothing else in the code
// invents a price, a damage or a timer. All names are original.
export const TEAMS = {
  ATTACK: { id: 'attack', name: 'RUSTJACKS', short: 'RUST', color: '#c96a3b' },
  DEFEND: { id: 'defend', name: 'YARD CREW', short: 'YARD', color: '#3e6b8c' },
};

// damage is per body hit; head multiplies. spread is radians of cone half-angle.
// bloomPerShot is how much the cone grows per shot while held (SMG punishes holding).
export const WEAPONS = {
  p9: {
    id: 'p9', name: 'P9 SIDEARM', kind: 'pistol', price: 0,
    damage: 34, headMult: 4, mag: 12, reserve: 36, fireGap: 0.16, reload: 1.4,
    spreadStill: 0.003, spreadMove: 0.018, auto: false, kick: 0.005, range: 60,
    bloomPerShot: 0.002,
  },
  yard: {
    id: 'yard', name: 'YARD SMG', kind: 'smg', price: 1500,
    damage: 24, headMult: 4, mag: 32, reserve: 128, fireGap: 0.07, reload: 1.7,
    spreadStill: 0.007, spreadMove: 0.032, auto: true, kick: 0.004, range: 55,
    bloomPerShot: 0.006,
  },
  longhaul: {
    id: 'longhaul', name: 'LONGHAUL AR', kind: 'rifle', price: 2700,
    damage: 33, headMult: 4, mag: 25, reserve: 100, fireGap: 0.1, reload: 1.9,
    spreadStill: 0.0022, spreadMove: 0.028, auto: true, kick: 0.011, range: 80,
    bloomPerShot: 0.004,
  },
  crane: {
    id: 'crane', name: 'CRANE DMR', kind: 'dmr', price: 3500,
    damage: 80, headMult: 4, mag: 10, reserve: 30, fireGap: 0.9, reload: 2.4,
    spreadStill: 0.0012, spreadMove: 0.04, auto: false, kick: 0.02, range: 100,
    bloomPerShot: 0.001,
  },
  dockbreaker: {
    id: 'dockbreaker', name: 'DOCK BREAKER', kind: 'shotgun', price: 1800,
    damage: 22, headMult: 3, mag: 6, reserve: 24, fireGap: 0.8, reload: 2.6,
    spreadStill: 0.03, spreadMove: 0.05, auto: false, kick: 0.024, range: 25,
    pellets: 6, bloomPerShot: 0.004,
  },
  knife: {
    id: 'knife', name: 'SCRAP KNIFE', kind: 'knife', price: 0,
    damage: 40, headMult: 1, mag: Infinity, reserve: 0, fireGap: 0.5, reload: 0,
    spreadStill: 0, spreadMove: 0, auto: false, kick: 0, range: 2.2,
    bloomPerShot: 0,
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
  fuse: 40, // charge fuse after plant
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
  { name: 'Dewi', role: 'Marksman' },
  { name: 'Joko', role: 'Entry' },
  { name: 'Maya', role: 'Support' },
  { name: 'Rizky', role: 'Anchor' },
  { name: 'Lestari', role: 'Lurk' },
  { name: 'Fajar', role: 'Marksman' },
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
