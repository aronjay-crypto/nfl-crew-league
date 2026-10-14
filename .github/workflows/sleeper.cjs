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


// Official NFL injury reports (free, via nflverse). Returns { week: { gsis_id: {status, injury} } } or null.
async function loadInjuries(year) {
  try {
    const res = await fetch(`https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_${year}.csv`, { redirect: 'follow' });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const lines = (await res.text()).trim().split('\n');
    const parse = (line) => {
      const out = []; let cur = ''; let q = false;
      for (const ch of line) {
        if (ch === '"') q = !q;
        else if (ch === ',' && !q) { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out;
    };
    const head = parse(lines[0]);
    const col = (n) => head.indexOf(n);
    const iWeek = col('week'), iId = col('gsis_id'), iStat = col('report_status'), iInj = col('report_primary_injury'), iType = col('season_type');
    if (iWeek < 0 || iId < 0 || iStat < 0) throw new Error('unexpected columns');
    const map = {};
    lines.slice(1).forEach(line => {
      const r = parse(line);
      if (iType >= 0 && r[iType] && r[iType] !== 'REG') return;
      const status = (r[iStat] || '').trim();
      if (!status || status === 'NA') return;
      const w = parseInt(r[iWeek]);
      if (!map[w]) map[w] = {};
      map[w][r[iId]] = { status, injury: (r[iInj] || '').trim() };
    });
    console.log(`Injury reports loaded for ${year} (${Object.keys(map).length} weeks).`);
    return map;
  } catch (e) {
    console.warn(`Injury reports skipped for ${year}: ${e.message}`);
    return null;
  }
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

      const startSlots = slots.filter(sl => sl !== 'BN');
      const nameOf = (id) => {
        const p = players[id];
        if (!p) return id;
        return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || id;
      };
      data[year].lineups = {};
      const injuries = await loadInjuries(year);
      data[year].injuryData = !!injuries;

      const injuryTag = (week, id) => {
        const gsis = players[id] && players[id].gsis_id;
        const rec = injuries && injuries[week] && gsis && injuries[week][gsis];
        return rec ? { status: rec.status, injury: rec.injury } : null;
      };

      for (let week = 1; week <= lastWeek; week++) {
        const row = data[year].weeks.find(w => w.week === week);
        const matchups = await sleeperJson(`/league/${leagueId}/matchups/${week}`);
        const results = [];
        matchups.forEach(m => {
          const score = m.points || 0;
          if (!score || !m.players_points) return;
          const perfect = Math.max(perfectScore(slots, m.players_points, positionOf), score);
          const team = nameByRoster[m.roster_id];
          results.push({ name: team, score, perfect, pct: score / perfect });

          const pp = m.players_points;
          const starterIds = m.starters || [];
          const starters = starterIds.map((id, i) => ({
            slot: startSlots[i] || '', name: nameOf(id), pos: positionOf(id) || (id.length <= 3 ? 'DEF' : ''), pts: pp[id] || 0,
            inj: injuryTag(week, id)
          })).filter((_, i) => starterIds[i] && starterIds[i] !== '0');
          const bench = Object.keys(pp)
            .filter(id => !starterIds.includes(id))
            .map(id => ({ name: nameOf(id), pos: positionOf(id), pts: pp[id] || 0 }))
            .sort((a, b) => b.pts - a.pts);
          if (!data[year].lineups[week]) data[year].lineups[week] = {};
          data[year].lineups[week][team] = { points: score, perfect, starters, bench };
        });
        if (!row || !results.length) continue;
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
