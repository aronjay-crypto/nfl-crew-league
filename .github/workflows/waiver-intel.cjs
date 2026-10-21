// Predicts likely waiver claims from rosters, needs, trending adds, budgets and past bidding.
const POS = ['QB', 'RB', 'WR', 'TE', 'K', 'DL', 'LB', 'DB'];
const FLEX = { FLEX: ['RB', 'WR', 'TE'], WRRB_FLEX: ['RB', 'WR'], REC_FLEX: ['WR', 'TE'], SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'], IDP_FLEX: ['DL', 'LB', 'DB'] };
const OUT = ['Out', 'IR', 'PUP', 'Sus'];
const MY_TEAM = 'Aron';

async function buildWaiverIntel(ctx) {
  const { data, year, leagueId, league, rosters, players, nameByRoster, nameOf, lastWeek, sleeperJson } = ctx;
  try {
    const slots = (league.roster_positions || []).filter(s => s !== 'BN');
    const slotsFor = {}; POS.forEach(p => { slotsFor[p] = 0; });
    slots.forEach(s => { if (FLEX[s]) FLEX[s].forEach(p => { slotsFor[p] += 1 / FLEX[s].length; }); else if (slotsFor[s] !== undefined) slotsFor[s] += 1; });

    const rostered = new Set(); rosters.forEach(r => (r.players || []).forEach(id => rostered.add(id)));
    const pos = (id) => (players[id] && players[id].position) || '';
    const healthy = (id) => !OUT.includes(players[id] && players[id].injury_status);

    // Bidding history (and any pending claims Sleeper exposes)
    const profile = {}; const pending = [];
    rosters.forEach(r => { profile[r.roster_id] = { bids: [], pos: {} }; });
    for (let w = 1; w <= lastWeek + 1; w++) {
      let tx = []; try { tx = await sleeperJson(`/league/${leagueId}/transactions/${w}`); } catch (e) { continue; }
      tx.filter(t => t.type === 'waiver' && t.adds).forEach(t => {
        const pid = Object.keys(t.adds)[0], rid = t.adds[pid], bid = (t.settings && t.settings.waiver_bid) || 0;
        if (t.status === 'pending') { pending.push({ team: nameByRoster[rid], player: nameOf(pid), bid }); return; }
        if (t.status !== 'complete' || !profile[rid]) return;
        profile[rid].bids.push(bid); profile[rid].pos[pos(pid)] = (profile[rid].pos[pos(pid)] || 0) + 1;
      });
    }

    // Candidate pool: trending adds + best-ranked free agents
    let trending = []; try { trending = await sleeperJson('/players/nfl/trending/add?lookback_hours=48&limit=60'); } catch (e) { /* optional */ }
    const adds = {}; trending.forEach(t => { adds[t.player_id] = t.count; });
    const maxAdds = Math.max(1, ...Object.values(adds));
    const free = Object.keys(players).filter(id => !rostered.has(id) && POS.includes(pos(id)) && players[id].team && players[id].status === 'Active');
    const byRank = free.filter(id => players[id].search_rank).sort((a, b) => players[a].search_rank - players[b].search_rank).slice(0, 60);
    const pool = [...new Set([...free.filter(id => adds[id]), ...byRank])];
    const inj = (id) => { const s = players[id].injury_status; return s === 'Out' || s === 'IR' ? -3 : s === 'Doubtful' ? -1.5 : s === 'Questionable' ? -0.5 : 0; };
    const cands = pool.map(id => ({ id, value: (adds[id] || 0) / maxAdds * 3 + Math.max(0, 1 - (players[id].search_rank || 600) / 600) * 2 + inj(id) })).filter(c => c.value > 0.3);
    const maxValue = Math.max(1, ...cands.map(c => c.value));

    // League vs team recent starter output by position (last 3 scored weeks)
    const recent = {}; const lg = {};
    Object.entries(data[year].lineups || {}).filter(([w]) => w > lastWeek - 3).forEach(([, teams]) => Object.entries(teams).forEach(([team, l]) => l.starters.forEach(s => {
      const k = team + '|' + s.pos; (recent[k] = recent[k] || []).push(s.pts); (lg[s.pos] = lg[s.pos] || []).push(s.pts);
    })));
    const avg = (a) => a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

    const budget = (league.settings && league.settings.waiver_budget) || 100;
    const teams = rosters.map(r => {
      const name = nameByRoster[r.roster_id], pf = profile[r.roster_id], bids = pf.bids;
      const remaining = Math.max(0, budget - ((r.settings && r.settings.waiver_budget_used) || 0));
      const avgBid = bids.length ? bids.reduce((a, b) => a + b, 0) / bids.length : 0, maxBid = Math.max(0, ...bids);
      const total = Object.values(pf.pos).reduce((a, b) => a + b, 0);
      const need = {};
      POS.forEach(p => {
        const have = (r.players || []).filter(id => pos(id) === p && healthy(id)).length;
        const hurt = (r.players || []).filter(id => pos(id) === p && !healthy(id)).length;
        const ta = avg(recent[name + '|' + p]), la = avg(lg[p]);
        const weak = ta !== null && la ? Math.max(0, (la - ta) / la) : 0;
        need[p] = +(Math.max(0, slotsFor[p] + 1 - have) * 1.5 + hurt * 0.75 + weak * 2).toFixed(2);
      });
      const targets = remaining < 1 ? [] : cands.map(c => {
        const p = pos(c.id), share = total ? (pf.pos[p] || 0) / total : 0;
        const score = c.value * (need[p] + 0.3) * (0.8 + 0.4 * share);
        const est = Math.max(1, Math.round((avgBid || 3) * (0.6 + 0.8 * c.value / maxValue)));
        const reason = [need[p] >= 1 ? `needs ${p}` : null, adds[c.id] ? `${adds[c.id]} adds (48h)` : null, players[c.id].injury_status ? players[c.id].injury_status : null].filter(Boolean).join(' · ');
        return { id: c.id, player: nameOf(c.id), pos: p, nfl: players[c.id].team, score, lo: Math.max(1, Math.round(est * 0.7)), hi: Math.min(remaining, Math.round(est * 1.3) + 1), reason };
      }).sort((a, b) => b.score - a.score).slice(0, 5);
      return { name, remaining, priority: r.settings && r.settings.waiver_position, avgBid: +avgBid.toFixed(1), maxBid, claims: bids.length, needs: need, targets };
    });

    const hot = {};
    teams.forEach(t => t.targets.slice(0, 3).forEach(x => { (hot[x.id] = hot[x.id] || { player: x.player, pos: x.pos, nfl: x.nfl, adds: adds[x.id] || 0, by: [] }).by.push({ team: t.name, hi: x.hi }); }));
    const mine = (teams.find(t => t.name === MY_TEAM) || { targets: [] }).targets.map(x => {
      const others = (hot[x.id] ? hot[x.id].by : []).filter(b => b.team !== MY_TEAM);
      return { player: x.player, pos: x.pos, rivals: others.map(b => b.team), beat: others.length ? Math.max(...others.map(b => b.hi)) + 1 : 1 };
    });
    teams.forEach(t => t.targets.forEach(x => { delete x.id; }));
    data[year].waiverIntel = { generated: new Date().toISOString(), week: lastWeek + 1, teams, hot: Object.values(hot).sort((a, b) => b.by.length - a.by.length || b.adds - a.adds).slice(0, 10), mine, pending };
    console.log(`Waiver intel built (${cands.length} candidates, ${pending.length} pending claims seen).`);
  } catch (e) {
    console.warn(`Waiver intel skipped: ${e.message}`);
  }
}

module.exports = { buildWaiverIntel };
