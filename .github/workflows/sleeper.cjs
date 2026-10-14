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
      console.log(`Fetching Sleeper ${year}...`);
      const league = await sleeperJson(`/league/${leagueId}`);
      const users = await sleeperJson(`/league/${leagueId}/users`);
      const rosters = await sleeperJson(`/league/${leagueId}/rosters`);
      const players = await sleeperJson('/players/nfl');
      const slots = league.roster_positions || [];
      const lastWeek = (league.settings && league.settings.last_scored_leg) || 0;

      const nameByUser = {};
      users.forEach(u => { nameByUser[u.user_id] = SLEEPER_NAMES[u.display_name] || u.display_name; });
      const nameByRoster = {};
      rosters.forEach(r => { nameByRoster[r.roster_id] = nameByUser[r.owner_id] || `Team ${r.roster_id}`; });
      const positionOf = (id) => (players[id] && players[id].position) || '';

      for (let week = 1; week <= lastWeek; week++) {
        const row = data[year].weeks.find(w => w.week === week);
        if (!row) continue;
        const matchups = await sleeperJson(`/league/${leagueId}/matchups/${week}`);
        const results = [];
        matchups.forEach(m => {
          const score = m.points || 0;
          if (!score || !m.players_points) return;
          const perfect = Math.max(perfectScore(slots, m.players_points, positionOf), score);
          results.push({ name: nameByRoster[m.roster_id], score, perfect, pct: score / perfect });
        });
        if (!results.length) continue;
        results.sort((a, b) => a.pct - b.pct);
        const fmt = r => `${r.name}, ${r.score.toFixed(2)}, ${r.perfect.toFixed(2)}`;
        if (!row.worstManager) row.worstManager = fmt(results[0]);
        if (!row.bestManager) row.bestManager = fmt(results[results.length - 1]);
      }
      console.log(`Sleeper ${year} done (weeks 1-${lastWeek}).`);
    } catch (e) {
      console.warn(`Sleeper ${year} skipped: ${e.message}`);
    }
  }
}

module.exports = { syncSleeper };
