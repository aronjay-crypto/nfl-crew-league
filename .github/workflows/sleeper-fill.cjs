// Fills 2026 weeks, matchups, standings and waivers from Sleeper.
// Anything already typed in the Google Sheet always wins; Sleeper only fills blanks.
const blank = (s) => !s || !String(s).split(',')[0].trim() || String(s).trim() === '-';
const num = (n) => parseFloat(Number(n).toFixed(2));

async function bracketRounds(ctx, playoffStart) {
  const { leagueId, sleeperJson, nameByRoster } = ctx;
  const out = {}; // "week|a|b" -> round label
  let champion = null;
  try {
    const win = await sleeperJson(`/league/${leagueId}/winners_bracket`);
    const lose = await sleeperJson(`/league/${leagueId}/losers_bracket`);
    const add = (bracket, labels, isWinners) => (bracket || []).forEach(b => {
      const ids = [b.t1, b.t2].every(Number.isFinite) ? [b.t1, b.t2] : [b.w, b.l].every(Number.isFinite) ? [b.w, b.l] : null;
      if (!ids) return;
      const label = b.p === 1 ? labels[1] : b.p === 3 ? labels[3] : b.r === 1 ? labels[0] : null;
      if (!label) return;
      out[`${playoffStart + b.r - 1}|${Math.min(...ids)}|${Math.max(...ids)}`] = label;
      if (isWinners && b.p === 1 && Number.isFinite(b.w)) champion = nameByRoster[b.w];
    });
    add(win, ['Semi-Final', 'Final', '3rd Place'], true);
    add(lose, ['Losers Semi', 'Losers Final', '7th Place'], false);
  } catch (e) {
    console.warn(`Sleeper brackets skipped: ${e.message}`);
  }
  return { out, champion };
}

async function fillFromSleeper(ctx) {
  const { data, year, leagueId, league, rosters, nameByRoster, nameOf, rawByWeek, managers, lastWeek, sleeperJson } = ctx;
  const d = data[year];
  const playoffStart = (league.settings && league.settings.playoff_week_start) || 99;
  const br = lastWeek >= playoffStart ? await bracketRounds(ctx, playoffStart) : { out: {}, champion: null };
  if (!d.matchups) d.matchups = [];

  for (let week = 1; week <= lastWeek; week++) {
    const teams = (rawByWeek[week] || []).filter(m => m.points > 0 && m.players_points)
      .map(m => ({ id: m.roster_id, name: nameByRoster[m.roster_id], pts: m.points, mid: m.matchup_id, starters: m.starters || [], pp: m.players_points }));
    if (!teams.length) continue;

    let row = d.weeks.find(w => w.week === week);
    if (!row) {
      row = { week, highScore: '', lowScore: '', highPlayer: '', lowPlayer: '', waiver: '-', worstManager: '', bestManager: '' };
      d.weeks.push(row);
    }

    const byPts = [...teams].sort((a, b) => b.pts - a.pts);
    if (blank(row.highScore)) row.highScore = `${byPts[0].name}, ${num(byPts[0].pts)}`;
    if (blank(row.lowScore)) row.lowScore = `${byPts[byPts.length - 1].name}, ${num(byPts[byPts.length - 1].pts)}`;

    let hi = null, lo = null; // starters only; zero-point starters (didn't play) ignored for the low
    teams.forEach(t => t.starters.forEach(id => {
      if (!id || id === '0') return;
      const p = t.pp[id] || 0;
      if (!hi || p > hi.p) hi = { team: t.name, id, p };
      if (p !== 0 && (!lo || p < lo.p)) lo = { team: t.name, id, p };
    }));
    if (hi && blank(row.highPlayer)) row.highPlayer = `${hi.team}, ${nameOf(hi.id)}, ${num(hi.p)}`;
    if (lo && blank(row.lowPlayer)) row.lowPlayer = `${lo.team}, ${nameOf(lo.id)}, ${num(lo.p)}`;

    if (managers[week]) {
      if (!row.worstManager) row.worstManager = managers[week].worst;
      if (!row.bestManager) row.bestManager = managers[week].best;
    }

    if (blank(row.waiver)) {
      try {
        const tx = await sleeperJson(`/league/${leagueId}/transactions/${week}`);
        let best = null;
        tx.filter(t => t.type === 'waiver' && t.status === 'complete' && t.adds).forEach(t => {
          const bid = (t.settings && t.settings.waiver_bid) || 0;
          const pid = Object.keys(t.adds)[0];
          if (!best || bid > best.bid) best = { bid, pid, rid: t.adds[pid] };
        });
        if (best) row.waiver = `${nameByRoster[best.rid]}, ${nameOf(best.pid)}, ${best.bid}`;
      } catch (e) {
        console.warn(`Sleeper transactions week ${week} skipped: ${e.message}`);
      }
    }

    if (!d.matchups.some(m => m.week === week)) {
      const groups = {};
      teams.forEach(t => { if (t.mid) (groups[t.mid] = groups[t.mid] || []).push(t); });
      Object.values(groups).filter(g => g.length === 2).forEach(([a, b]) => {
        const key = `${week}|${Math.min(a.id, b.id)}|${Math.max(a.id, b.id)}`;
        const round = week < playoffStart ? 'Regular' : (br.out[key] || 'Playoffs');
        d.matchups.push({ week, round, red: a.name, redScore: num(a.pts), blue: b.name, blueScore: num(b.pts) });
      });
    }
  }
  d.weeks.sort((a, b) => a.week - b.week);

  if (!d.standings || !d.standings.length) {
    d.standings = rosters.map(r => {
      const s = r.settings || {};
      return {
        player: nameByRoster[r.roster_id], wins: s.wins || 0,
        record: `${s.wins || 0}-${s.losses || 0}${s.ties ? '-' + s.ties : ''}`,
        pf: (s.fpts || 0) + (s.fpts_decimal || 0) / 100, pa: (s.fpts_against || 0) + (s.fpts_against_decimal || 0) / 100
      };
    }).sort((a, b) => b.wins - a.wins || b.pf - a.pf)
      .map((r, i) => ({ rank: i + 1, player: r.player, record: r.record, pf: num(r.pf), pa: num(r.pa) }));
  }
  if (!d.champion && league.status === 'complete' && br.champion) d.champion = br.champion;
}

module.exports = { fillFromSleeper };
