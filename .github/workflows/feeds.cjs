// External data feeds (free, via nflverse). Each loader fails soft and returns null.
function csvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function loadCsv(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const lines = (await res.text()).trim().split('\n').map(l => l.replace(/\r$/, ''));
  const head = csvLine(lines[0]);
  return lines.slice(1).map(l => {
    const v = csvLine(l); const o = {};
    head.forEach((h, i) => { o[h] = v[i]; });
    return o;
  });
}

// Official NFL injury reports -> { week: { gsis_id: {status, injury} } }
async function loadInjuries(year) {
  try {
    const rows = await loadCsv(`https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_${year}.csv`);
    const map = {};
    rows.forEach(r => {
      if (r.season_type && r.season_type !== 'REG') return;
      const status = (r.report_status || '').trim();
      if (!status || status === 'NA') return;
      const w = parseInt(r.week);
      if (!map[w]) map[w] = {};
      map[w][r.gsis_id] = { status, injury: (r.report_primary_injury || '').trim() };
    });
    console.log(`Injury reports loaded for ${year} (${Object.keys(map).length} weeks).`);
    return map;
  } catch (e) {
    console.warn(`Injury reports skipped for ${year}: ${e.message}`);
    return null;
  }
}

// Snap counts -> { pfr_id: { week: { off, def } } } (fractions 0-1), plus Sleeper id -> pfr id
async function loadSnaps(year) {
  try {
    const rows = await loadCsv(`https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_${year}.csv`);
    const ids = await loadCsv('https://github.com/dynastyprocess/data/raw/master/files/db_playerids.csv');
    const pfrBySleeper = {};
    ids.forEach(r => { if (r.sleeper_id && r.pfr_id) pfrBySleeper[r.sleeper_id] = r.pfr_id; });
    const scale = rows.some(r => parseFloat(r.offense_pct) > 1.5 || parseFloat(r.defense_pct) > 1.5) ? 100 : 1;
    const snaps = {};
    rows.forEach(r => {
      if (r.game_type && r.game_type !== 'REG') return;
      const id = r.pfr_player_id; if (!id) return;
      if (!snaps[id]) snaps[id] = {};
      snaps[id][parseInt(r.week)] = { off: (parseFloat(r.offense_pct) || 0) / scale, def: (parseFloat(r.defense_pct) || 0) / scale };
    });
    console.log(`Snap counts loaded for ${year} (${Object.keys(snaps).length} players).`);
    return { snaps, pfrBySleeper };
  } catch (e) {
    console.warn(`Snap counts skipped for ${year}: ${e.message}`);
    return null;
  }
}

// Possible in-game injury: this week's snap share is <= half the player's average in earlier weeks.
function snapDrop(snapData, sleeperId, pos, week) {
  if (!snapData || pos === 'K') return null;
  const key = ['DL', 'LB', 'DB'].includes(pos) ? 'def' : 'off';
  const weeks = snapData.snaps[snapData.pfrBySleeper[sleeperId]];
  if (!weeks) return null;
  const prior = Object.keys(weeks).map(Number).filter(w => w < week).map(w => weeks[w][key]).filter(p => p > 0);
  if (prior.length < 2) return null;
  const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
  const now = weeks[week] ? weeks[week][key] : 0;
  if (avg >= 0.5 && now > 0 && now <= avg * 0.5) return { pct: Math.round(now * 100), avg: Math.round(avg * 100) };
  return null;
}

module.exports = { loadInjuries, loadSnaps, snapDrop };
