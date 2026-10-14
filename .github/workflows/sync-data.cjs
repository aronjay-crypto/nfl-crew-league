const fs = require('fs');

const SHEET_ID = '1XSztc0Pp9sIjZImnRQBfA_zPymtdMJr0ekuVFG1CLuE';

// Add a new season by adding one line here with its two GIDs.
const SEASONS = {
  '2026': { weeks: 1412784562, standings: null },
  '2025': { weeks: 142810151, standings: 593825938 },
  '2024': { weeks: 733256198, standings: 869048924 },
  '2023': { weeks: 1919173883, standings: 290329594 }
};

const HALL_OF_FAME_GID = 514323247;
const CHAMPIONSHIPS_GID = 286305454;

// Matchup tabs by year (add older years here as you backfill)
const MATCHUPS = {
  '2026': 963768362,
  '2025': 1738901299,
  '2024': 487381305,
  '2023': 711669497
};

async function fetchSheet(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    redirect: 'follow'
  });
  const text = await res.text();
  console.log(`Fetched ${text.length} bytes from gid ${gid} (status ${res.status})`);
  return text;
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });
}


// ---------- Sleeper (2026 league) ----------
const SLEEPER_LEAGUES = { '2026': '1403696235939966976' };
const SLEEPER_NAMES = {
  AronJay: 'Aron', jupjamie: 'Jamie', zgelbz: 'Zak', BryceBryceBaby1: 'Lance',
  Sewellster: 'Ben', JF1997: 'James', NathanD1997: 'Nathan', ethanwong000: 'Ethan'
};
const FLEX_ELIGIBLE = {
  FLEX: ['RB', 'WR', 'TE'], WRRB_FLEX: ['RB', 'WR'], REC_FLEX: ['WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'], IDP_FLEX: ['DL', 'LB', 'DB']
};

async function sleeperJson(path) {
  const res = await fetch(`https://api.sleeper.app/v1${path}`);
  if (!res.ok) throw new Error(`Sleeper ${path} -> ${res.status}`);
  return res.json();
}

// Best legal lineup: fixed-position slots take the top players at that position,
// then flex slots take the best remaining eligible players.
function perfectScore(slots, playerPoints, positionOf) {
  const used = new Set();
  const ids = Object.keys(playerPoints);
  let total = 0;
  const take = (eligible) => {
    let best = null;
    ids.forEach(id => {
      if (used.has(id) || !eligible.includes(positionOf(id))) return;
      if (best === null || playerPoints[id] > playerPoints[best]) best = id;
    });
    if (best !== null) { used.add(best); total += playerPoints[best]; }
  };
  slots.filter(sl => !FLEX_ELIGIBLE[sl] && sl !== 'BN').forEach(sl => take([sl]));
  slots.filter(sl => FLEX_ELIGIBLE[sl]).forEach(sl => take(FLEX_ELIGIBLE[sl]));
  return total;
}

async function syncSleeper(data) {
  for (const [year, leagueId] of Object.entries(SLEEPER_LEAGUES)) {
    if (!data[year]) continue;
    try {
