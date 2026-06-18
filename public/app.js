const app = document.getElementById('app');

let allData = {};
let currentPage = 'weekly';
let selectedYear = 2025;
let availableYears = [];
let selectedPlayer = null;

async function fetchData() {
  try {
    const response = await fetch('/data.json');
    allData = await response.json();

    availableYears = Object.keys(allData)
      .filter(k => k !== 'hallOfFame')
      .map(k => parseInt(k))
      .sort((a, b) => b - a);

    selectedYear = availableYears[0] || 2025;
    render();
  } catch (error) {
    console.error('Error:', error);
    app.innerHTML = '<div style="max-width: 1100px; margin: 2rem auto; padding: 1rem; text-align: center; color: #ef4444;">Error loading data</div>';
  }
}

function extractScore(str) {
  if (!str) return 0;
  const match = str.match(/,\s*(-?\d+\.?\d*)\s*$/);
  return match ? parseFloat(match[1]) : 0;
}

function extractPlayerPoints(str) {
  if (!str) return 0;
  const match = str.match(/,\s*(-?\d+\.?\d*)[^,]*$/);
  return match ? parseFloat(match[1]) : 0;
}

// Extract the league member's name from the start of a "Name, ..." string
function extractName(str) {
  if (!str) return '';
  return str.split(',')[0].trim();
}

// Get full list of league members across all data
function getAllPlayers() {
  const players = new Set();
  Object.keys(allData).forEach(key => {
    if (key === 'hallOfFame') return;
    const data = allData[key];
    (data.standings || []).forEach(s => { if (s.player) players.add(s.player); });
  });
  // Also include anyone in championships
  if (allData.hallOfFame && allData.hallOfFame.championships) {
    Object.keys(allData.hallOfFame.championships).forEach(p => players.add(p));
  }
  return Array.from(players).sort();
}

// Build a profile object for one player
function getPlayerProfile(player) {
  const profile = {
    name: player,
    championships: 0,
    titleYears: [],
    finishes: [],
    bestWeek: null,
    worstWeek: null
  };

  // Championships
  if (allData.hallOfFame) {
    if (allData.hallOfFame.championships && allData.hallOfFame.championships[player] != null) {
      profile.championships = allData.hallOfFame.championships[player];
    }
    (allData.hallOfFame.champions || []).forEach(c => {
      // champion field can be "Aron + Ben" so check inclusion
      if (c.champion && c.champion.split('+').map(s => s.trim()).includes(player)) {
        profile.titleYears.push(c.year);
      }
    });
  }

  // Season finishes
  availableYears.forEach(year => {
    const data = allData[year];
    if (!data || !data.standings) return;
    const standing = data.standings.find(s => s.player === player);
    if (standing) {
      profile.finishes.push({ year, rank: standing.rank, record: standing.record });
    }
  });
  profile.finishes.sort((a, b) => b.year - a.year);

  // Best/worst weeks across all years (using high/low score fields where this player was the scorer)
  let best = { value: -Infinity };
  let worst = { value: Infinity };

  availableYears.forEach(year => {
    const data = allData[year];
    if (!data || !data.weeks) return;
    data.weeks.forEach(w => {
      // High score line
      if (extractName(w.highScore) === player) {
        const v = extractScore(w.highScore);
        if (v > best.value) best = { value: v, year, week: w.week };
      }
      // Low score line
      if (extractName(w.lowScore) === player) {
        const v = extractScore(w.lowScore);
        if (v < worst.value) worst = { value: v, year, week: w.week };
      }
    });
  });

  if (best.value !== -Infinity) profile.bestWeek = best;
  if (worst.value !== Infinity) profile.worstWeek = worst;

  // Head-to-head across all seasons that have matchup data
  const h2h = {}; // opponent -> { wins, losses, ties }
  availableYears.forEach(year => {
    const data = allData[year];
    if (!data || !data.matchups) return;
    data.matchups.forEach(m => {
      let me, opp, myScore, oppScore;
      if (m.red === player) {
        me = m.red; opp = m.blue; myScore = m.redScore; oppScore = m.blueScore;
      } else if (m.blue === player) {
        me = m.blue; opp = m.red; myScore = m.blueScore; oppScore = m.redScore;
      } else {
        return; // player not in this matchup
      }
      if (!h2h[opp]) h2h[opp] = { wins: 0, losses: 0, ties: 0 };
      if (myScore > oppScore) h2h[opp].wins++;
      else if (myScore < oppScore) h2h[opp].losses++;
      else h2h[opp].ties++;
    });
  });
  profile.headToHead = Object.entries(h2h)
    .map(([opponent, rec]) => ({ opponent, ...rec }))
    .sort((a, b) => a.opponent.localeCompare(b.opponent));

  return profile;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Turn a matchup round into a short readable game-type tag
function roundLabel(round) {
  if (!round || round === 'Regular') return 'Regular Season';
  return round; // e.g. "Semi-Final", "Final", "Losers Final", "3rd Place"
}

function renderWeekly() {
  const data = allData[selectedYear];
  if (!data || !data.weeks.length) {
    return `<div style="max-width: 1100px; margin: 2rem auto; padding: 1rem; text-align: center; color: #64748b;">No week data available for ${selectedYear}</div>`;
  }

  const records = getSeasonRecords(data);

  const weekCard = (w) => `
    <div style="background: #383D44; border-radius: 8px; padding: 1rem; color: #e2e8f0;">
      <p style="font-size: 11px; font-weight: 500; color: #5B9BD5; margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Week ${w.week}</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div>
          <p style="font-size: 11px; color: #a8b0bd; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">High Score</p>
          <p style="font-size: 15px; font-weight: 500; margin: 0;">${w.highScore}</p>
        </div>
        <div>
          <p style="font-size: 11px; color: #a8b0bd; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Low Score</p>
          <p style="font-size: 15px; font-weight: 500; margin: 0;">${w.lowScore}</p>
        </div>
      </div>
      <div style="border-top: 0.5px solid #4b515a; padding-top: 12px;">
        <div style="margin-bottom: 8px;">
          <p style="font-size: 11px; color: #a8b0bd; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Highest Player</p>
          <p style="font-size: 12px; margin: 0;">${w.highPlayer}</p>
        </div>
        <div style="margin-bottom: 8px;">
          <p style="font-size: 11px; color: #a8b0bd; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Lowest Player</p>
          <p style="font-size: 12px; margin: 0;">${w.lowPlayer}</p>
        </div>
        <div>
          <p style="font-size: 11px; color: #a8b0bd; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Most Expensive Waiver</p>
          <p style="font-size: 12px; margin: 0;">${w.waiver}</p>
        </div>
      </div>
    </div>
  `;

  const recordCard = (label, value, sublabel) => `
    <div style="background: #383D44; border-radius: 8px; padding: 1rem; margin-bottom: 12px; color: #e2e8f0;">
      <p style="font-size: 10px; color: #5B9BD5; text-transform: uppercase; margin: 0 0 6px; letter-spacing: 0.5px; font-weight: 500;">${label}</p>
      <p style="font-size: 14px; font-weight: 500; margin: 0 0 2px;">${value}</p>
      <p style="font-size: 11px; color: #a8b0bd; margin: 0;">${sublabel}</p>
    </div>
  `;

  return `
    <div style="max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 1.5rem; color: #011A36;">NFL Crew League</h1>

      <div class="home-grid">

        <div class="weeks-grid">
          ${data.weeks.map(weekCard).join('')}
        </div>

        <div class="records-sidebar">
          <h2 style="font-size: 12px; font-weight: 500; color: #011A36; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">${selectedYear} Season Records</h2>
          ${records ? `
            ${recordCard('Highest Score', records.highestScore.label, `Week ${records.highestScore.week}`)}
            ${recordCard('Highest Scoring Player', records.highestPlayer.label, `Week ${records.highestPlayer.week}`)}
            ${recordCard('Lowest Scoring Player', records.lowestPlayer.label, `Week ${records.lowestPlayer.week}`)}
            ${recordCard('Most Expensive Waiver', records.expensiveWaiver.label, `Week ${records.expensiveWaiver.week}`)}
            ${records.unluckiest ? `
              <div class="unlucky-tile" style="position: relative; background: #383D44; border-radius: 8px; padding: 1rem; margin-bottom: 12px; color: #e2e8f0; cursor: pointer;">
                <p style="font-size: 10px; color: #5B9BD5; text-transform: uppercase; margin: 0 0 6px; letter-spacing: 0.5px; font-weight: 500;">Unluckiest Player <span style="color: #8a97a8;">ⓘ</span></p>
                <p style="font-size: 14px; font-weight: 500; margin: 0 0 2px;">${records.unluckiest.player}</p>
                <p style="font-size: 11px; color: #a8b0bd; margin: 0 0 8px;">${records.unluckiest.count} loss${records.unluckiest.count !== 1 ? 'es' : ''} by under ${records.unluckiest.margin} points</p>
                <p style="font-size: 11px; color: #8a97a8; margin: 0; font-style: italic; line-height: 1.4;">Awarded to the player who lost the most games by a margin of under ${records.unluckiest.margin} points across the season.</p>
                <div class="unlucky-tooltip" style="display: none; position: absolute; top: 8px; right: 8px; left: 8px; background: #011A36; border: 0.5px solid #5B9BD5; border-radius: 8px; padding: 12px; z-index: 20; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
                  <p style="font-size: 10px; color: #5B9BD5; text-transform: uppercase; margin: 0 0 8px; letter-spacing: 0.5px; font-weight: 500;">Narrow Losses (under ${records.unluckiest.margin})</p>
                  ${records.unluckiest.breakdown.map(b => `
                    <div style="display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px;">
                      <span style="color: #e2e8f0;">${b.player}</span>
                      <span style="color: #a8b0bd;">${b.count}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          ` : '<p style="color: #64748b; font-size: 13px;">No records yet</p>'}
        </div>

      </div>
    </div>
  `;
}

function getSeasonRecords(data) {
  if (!data || !data.weeks.length) return null;

  let highestScore = { value: -Infinity, label: '', week: 0 };
  let highestPlayer = { value: -Infinity, label: '', week: 0 };
  let lowestPlayer = { value: Infinity, label: '', week: 0 };
  let expensiveWaiver = { value: -Infinity, label: '', week: 0 };

  data.weeks.forEach(w => {
    const hs = extractScore(w.highScore);
    if (hs > highestScore.value) {
      highestScore = { value: hs, label: w.highScore, week: w.week };
    }

    const hp = extractPlayerPoints(w.highPlayer);
    if (hp > highestPlayer.value) {
      highestPlayer = { value: hp, label: w.highPlayer, week: w.week };
    }

    const lp = extractPlayerPoints(w.lowPlayer);
    if (w.lowPlayer && lp < lowestPlayer.value) {
      lowestPlayer = { value: lp, label: w.lowPlayer, week: w.week };
    }

    if (w.waiver && w.waiver !== '-') {
      const costMatch = w.waiver.match(/,\s*(\d+)\s*$/);
      const cost = costMatch ? parseInt(costMatch[1]) : 0;
      if (cost > expensiveWaiver.value) {
        expensiveWaiver = { value: cost, label: w.waiver, week: w.week };
      }
    }
  });

  // Unluckiest player: most narrow losses (margin under threshold) across all games this season
  const NARROW_MARGIN = 5;
  let unluckiest = null;
  if (data.matchups && data.matchups.length) {
    const narrowLosses = {}; // player -> count
    data.matchups.forEach(m => {
      if (m.redScore === 0 && m.blueScore === 0) return; // skip empty rows
      const margin = Math.abs(m.redScore - m.blueScore);
      if (margin === 0 || margin >= NARROW_MARGIN) return; // ties or non-narrow games don't count
      const loser = m.redScore < m.blueScore ? m.red : m.blue;
      narrowLosses[loser] = (narrowLosses[loser] || 0) + 1;
    });

    const ranked = Object.entries(narrowLosses).sort((a, b) => b[1] - a[1]);
    if (ranked.length) {
      unluckiest = {
        player: ranked[0][0],
        count: ranked[0][1],
        margin: NARROW_MARGIN,
        breakdown: ranked.map(([player, count]) => ({ player, count }))
      };
    }
  }

  return { highestScore, highestPlayer, lowestPlayer, expensiveWaiver, unluckiest };
}

function renderStandings() {
  const data = allData[selectedYear];
  if (!data || !data.standings.length) {
    return `<div style="max-width: 1100px; margin: 2rem auto; padding: 1rem; text-align: center; color: #64748b;">No standings data available</div>`;
  }

  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 0.5rem; color: #011A36;">NFL Crew League</h1>
      <p style="font-size: 14px; color: #64748b; margin: 0 0 2rem;">${selectedYear} Season</p>

      <div style="background: #383D44; border-radius: 12px; padding: 1.5rem; text-align: center; margin-bottom: 2rem; color: #e2e8f0;">
        <p style="font-size: 11px; color: #a8b0bd; text-transform: uppercase; margin: 0 0 0.5rem; letter-spacing: 0.5px;">${selectedYear} Champion</p>
        <p style="font-size: 32px; font-weight: 500; color: #5B9BD5; margin: 0;">${data.champion || 'TBD'}</p>
      </div>

      <h2 style="font-size: 12px; font-weight: 500; color: #011A36; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Standings</h2>
      <div style="display: grid; gap: 8px;">
        ${data.standings.map(s => `
          <div style="background: #383D44; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; color: #e2e8f0;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 14px; font-weight: 500; color: #a8b0bd; min-width: 24px;">${s.rank}</span>
              <span style="font-size: 16px; font-weight: 500;">${s.player}</span>
            </div>
            <div style="display: flex; gap: 16px; font-size: 13px; color: #a8b0bd;">
              <span>${s.record}</span>
              <span>${Math.round(s.pf)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Compute all-time records across every season
function getAllTimeRecords() {
  let highestWeek = { value: -Infinity, who: '', year: 0, week: 0 };
  let lowestWeek = { value: Infinity, who: '', year: 0, week: 0 };
  let highestPlayerWeek = { value: -Infinity, label: '', year: 0, week: 0 };
  let biggestWaiver = { value: -Infinity, label: '', year: 0, week: 0 };
  let biggestBlowout = { value: -Infinity, winner: '', loser: '', year: 0, week: 0 };
  let closestGame = { value: Infinity, winner: '', loser: '', year: 0, week: 0 };

  // Career aggregates
  const career = {}; // player -> { pf, wins, losses, seasons, bestFinish }

  availableYears.forEach(year => {
    const data = allData[year];
    if (!data) return;

    (data.weeks || []).forEach(w => {
      const hs = extractScore(w.highScore);
      if (hs > highestWeek.value) highestWeek = { value: hs, who: extractName(w.highScore), year, week: w.week };

      const ls = extractScore(w.lowScore);
      if (w.lowScore && ls < lowestWeek.value) lowestWeek = { value: ls, who: extractName(w.lowScore), year, week: w.week };

      const hp = extractPlayerPoints(w.highPlayer);
      if (hp > highestPlayerWeek.value) highestPlayerWeek = { value: hp, label: w.highPlayer, year, week: w.week };

      if (w.waiver && w.waiver !== '-') {
        const m = w.waiver.match(/,\s*(\d+)\s*$/);
        const cost = m ? parseInt(m[1]) : 0;
        if (cost > biggestWaiver.value) biggestWaiver = { value: cost, label: w.waiver, year, week: w.week };
      }
    });

    (data.standings || []).forEach(s => {
      if (!career[s.player]) career[s.player] = { pf: 0, wins: 0, losses: 0, seasons: 0, bestFinish: Infinity };
      const c = career[s.player];
      c.pf += s.pf || 0;
      c.seasons += 1;
      if (s.rank < c.bestFinish) c.bestFinish = s.rank;
      // Parse record "9-6"
      const rec = (s.record || '').match(/(\d+)\s*-\s*(\d+)/);
      if (rec) { c.wins += parseInt(rec[1]); c.losses += parseInt(rec[2]); }
    });

    // Matchup-based records (only years with matchup data)
    (data.matchups || []).forEach(m => {
      if (m.redScore === 0 && m.blueScore === 0) return; // skip empty rows
      const margin = Math.abs(m.redScore - m.blueScore);
      const winner = m.redScore >= m.blueScore ? m.red : m.blue;
      const loser = m.redScore >= m.blueScore ? m.blue : m.red;
      const round = m.round || 'Regular';

      if (margin > biggestBlowout.value) {
        biggestBlowout = { value: margin, winner, loser, year, week: m.week, round };
      }
      if (margin < closestGame.value) {
        closestGame = { value: margin, winner, loser, year, week: m.week, round };
      }
    });
  });

  // Career leaders
  const careerArr = Object.entries(career).map(([player, c]) => ({ player, ...c }));
  const mostPoints = [...careerArr].sort((a, b) => b.pf - a.pf)[0];
  const mostWins = [...careerArr].sort((a, b) => b.wins - a.wins)[0];

  return { highestWeek, lowestWeek, highestPlayerWeek, biggestWaiver, mostPoints, mostWins, biggestBlowout, closestGame };
}

function renderHallOfFame() {
  const data = allData.hallOfFame;
  if (!data) {
    return `<div style="max-width: 1100px; margin: 2rem auto; padding: 1rem; text-align: center; color: #64748b;">No data available</div>`;
  }

  const records = getAllTimeRecords();
  const recordTile = (label, value, sublabel) => `
    <div style="background: #383D44; border-radius: 8px; padding: 1rem; color: #e2e8f0;">
      <p style="font-size: 10px; color: #5B9BD5; text-transform: uppercase; margin: 0 0 6px; letter-spacing: 0.5px; font-weight: 500;">${label}</p>
      <p style="font-size: 17px; font-weight: 500; margin: 0 0 2px;">${value}</p>
      <p style="font-size: 11px; color: #a8b0bd; margin: 0;">${sublabel}</p>
    </div>
  `;

  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 1.5rem; color: #011A36;">Hall of Fame</h1>

      <h2 style="font-size: 12px; font-weight: 500; color: #011A36; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">All-Time Records</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 2rem;">
        ${recordTile('Highest Week', records.highestWeek.value > -Infinity ? `${records.highestWeek.who}, ${records.highestWeek.value}` : '—', records.highestWeek.value > -Infinity ? `${records.highestWeek.year} · Week ${records.highestWeek.week}` : '')}
        ${recordTile('Lowest Week', records.lowestWeek.value < Infinity ? `${records.lowestWeek.who}, ${records.lowestWeek.value}` : '—', records.lowestWeek.value < Infinity ? `${records.lowestWeek.year} · Week ${records.lowestWeek.week}` : '')}
        ${recordTile('Best Player Week', records.highestPlayerWeek.value > -Infinity ? records.highestPlayerWeek.label : '—', records.highestPlayerWeek.value > -Infinity ? `${records.highestPlayerWeek.year} · Week ${records.highestPlayerWeek.week}` : '')}
        ${recordTile('Priciest Waiver', records.biggestWaiver.value > -Infinity ? records.biggestWaiver.label : '—', records.biggestWaiver.value > -Infinity ? `${records.biggestWaiver.year} · Week ${records.biggestWaiver.week}` : '')}
        ${records.mostPoints ? recordTile('Most Career Points', records.mostPoints.player, `${Math.round(records.mostPoints.pf).toLocaleString()} pts`) : ''}
        ${records.mostWins ? recordTile('Most Career Wins', records.mostWins.player, `${records.mostWins.wins} wins`) : ''}
        ${records.biggestBlowout && records.biggestBlowout.value > -Infinity ? recordTile('Biggest Blowout', `${records.biggestBlowout.winner} def. ${records.biggestBlowout.loser}`, `by ${records.biggestBlowout.value.toFixed(2)} · ${records.biggestBlowout.year} Wk ${records.biggestBlowout.week} · ${roundLabel(records.biggestBlowout.round)}`) : ''}
        ${records.closestGame && records.closestGame.value < Infinity ? recordTile('Closest Game', `${records.closestGame.winner} def. ${records.closestGame.loser}`, `by ${records.closestGame.value.toFixed(2)} · ${records.closestGame.year} Wk ${records.closestGame.week} · ${roundLabel(records.closestGame.round)}`) : ''}
      </div>

      <h2 style="font-size: 12px; font-weight: 500; color: #011A36; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Championships by Player</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 2rem;">
        ${Object.entries(data.championships || {}).sort((a, b) => b[1] - a[1]).map(([player, count]) => {
          const years = (data.champions || [])
            .filter(c => c.champion && c.champion.split('+').map(s => s.trim()).includes(player))
            .map(c => c.year)
            .sort((a, b) => b - a);
          return `
          <div class="champ-tile" style="position: relative; background: #383D44; border-radius: 8px; padding: 1rem; text-align: center; color: #e2e8f0; ${count > 0 ? 'cursor: pointer;' : ''}">
            <p style="font-size: 16px; font-weight: 500; margin: 0 0 0.5rem;">${player}${count > 0 ? ' <span style="color: #8a97a8; font-size: 11px;">ⓘ</span>' : ''}</p>
            <p style="font-size: 24px; font-weight: 500; color: #5B9BD5; margin: 0;">${count}</p>
            <p style="font-size: 11px; color: #a8b0bd; margin: 0.5rem 0 0; text-transform: uppercase;">Title${count !== 1 ? 's' : ''}</p>
            ${count > 0 && years.length ? `
              <div class="champ-tooltip" style="display: none; position: absolute; top: 8px; right: 8px; left: 8px; background: #011A36; border: 0.5px solid #5B9BD5; border-radius: 8px; padding: 12px; z-index: 20; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
                <p style="font-size: 10px; color: #5B9BD5; text-transform: uppercase; margin: 0 0 8px; letter-spacing: 0.5px; font-weight: 500;">Title Years</p>
                ${years.map(y => `<p style="font-size: 13px; color: #e2e8f0; margin: 2px 0;">${y}</p>`).join('')}
              </div>
            ` : ''}
          </div>
          `;
        }).join('')}
      </div>

      <h2 style="font-size: 12px; font-weight: 500; color: #011A36; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Year by Year</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px;">
        ${data.champions.sort((a, b) => b.year - a.year).map(entry => `
          <div style="background: #383D44; border-radius: 8px; padding: 10px 12px; color: #e2e8f0;">
            <p style="font-size: 11px; color: #a8b0bd; margin: 0 0 2px;">${entry.year}</p>
            <p style="font-size: 14px; font-weight: 500; margin: 0;">${entry.champion}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPlayers() {
  // If a player is selected, show their profile
  if (selectedPlayer) {
    return renderPlayerProfile(selectedPlayer);
  }

  // Otherwise show the grid of players
  const players = getAllPlayers();
  if (!players.length) {
    return `<div style="max-width: 1100px; margin: 2rem auto; padding: 1rem; text-align: center; color: #64748b;">No players found</div>`;
  }

  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 1.5rem; color: #011A36;">Players</h1>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
        ${players.map(p => {
          const champs = (allData.hallOfFame && allData.hallOfFame.championships && allData.hallOfFame.championships[p]) || 0;
          return `
            <div class="player-tile" data-player="${p}" style="background: #383D44; border-radius: 8px; padding: 1.25rem 1rem; text-align: center; color: #e2e8f0; cursor: pointer; transition: transform 0.1s;">
              <p style="font-size: 18px; font-weight: 500; margin: 0 0 0.5rem;">${p}</p>
              <p style="font-size: 12px; color: #5B9BD5; margin: 0;">${champs} title${champs !== 1 ? 's' : ''}</p>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderPlayerProfile(player) {
  const profile = getPlayerProfile(player);

  const statCard = (label, value, sublabel) => `
    <div style="background: #383D44; border-radius: 8px; padding: 1rem; color: #e2e8f0;">
      <p style="font-size: 10px; color: #5B9BD5; text-transform: uppercase; margin: 0 0 6px; letter-spacing: 0.5px; font-weight: 500;">${label}</p>
      <p style="font-size: 22px; font-weight: 500; margin: 0 0 2px;">${value}</p>
      ${sublabel ? `<p style="font-size: 11px; color: #a8b0bd; margin: 0;">${sublabel}</p>` : ''}
    </div>
  `;

  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <button id="backToPlayers" style="background: transparent; border: 0.5px solid #d0d5dd; color: #011A36; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-bottom: 1.5rem;">← All Players</button>

      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 0.25rem; color: #011A36;">${profile.name}</h1>
      <p style="font-size: 14px; color: #64748b; margin: 0 0 2rem;">
        ${profile.championships} championship${profile.championships !== 1 ? 's' : ''}${profile.titleYears.length ? ' · ' + profile.titleYears.sort((a, b) => b - a).join(', ') : ''}
      </p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 2rem;">
        ${statCard('Championships', profile.championships, profile.titleYears.length ? profile.titleYears.sort((a, b) => b - a).join(', ') : 'No titles yet')}
        ${statCard('Best Week', profile.bestWeek ? profile.bestWeek.value : '—', profile.bestWeek ? `${profile.bestWeek.year} · Week ${profile.bestWeek.week}` : 'No data')}
        ${statCard('Worst Week', profile.worstWeek ? profile.worstWeek.value : '—', profile.worstWeek ? `${profile.worstWeek.year} · Week ${profile.worstWeek.week}` : 'No data')}
        ${statCard('Seasons', profile.finishes.length, profile.finishes.length ? `Since ${Math.min(...profile.finishes.map(f => f.year))}` : '')}
      </div>

      <h2 style="font-size: 12px; font-weight: 500; color: #011A36; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Season Finishes</h2>
      ${profile.finishes.length ? `
        <div style="display: grid; gap: 8px;">
          ${profile.finishes.map(f => `
            <div style="background: #383D44; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; color: #e2e8f0;">
              <span style="font-size: 14px; color: #a8b0bd;">${f.year}</span>
              <div style="display: flex; gap: 16px; align-items: center;">
                <span style="font-size: 13px; color: #a8b0bd;">${f.record}</span>
                <span style="font-size: 16px; font-weight: 500; color: ${f.rank === 1 ? '#5B9BD5' : '#e2e8f0'};">${ordinal(f.rank)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p style="color: #64748b; font-size: 13px;">No season data yet</p>'}

      <h2 style="font-size: 12px; font-weight: 500; color: #011A36; text-transform: uppercase; margin: 2rem 0 1rem; letter-spacing: 0.5px;">Head to Head</h2>
      ${profile.headToHead && profile.headToHead.length ? `
        <div style="display: grid; gap: 8px;">
          ${profile.headToHead.map(h => {
            const total = h.wins + h.losses + h.ties;
            const leading = h.wins > h.losses;
            const trailing = h.wins < h.losses;
            const recordColor = leading ? '#5B9BD5' : (trailing ? '#a8b0bd' : '#e2e8f0');
            return `
              <div style="background: #383D44; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; color: #e2e8f0;">
                <span style="font-size: 15px; font-weight: 500;">${profile.name} v ${h.opponent}</span>
                <span style="font-size: 15px; font-weight: 500; color: ${recordColor};">${h.wins}-${h.losses}${h.ties ? '-' + h.ties : ''}</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : '<div style="background: #383D44; border-radius: 8px; padding: 1.25rem; color: #a8b0bd; font-size: 13px;">Head-to-head records will appear here once weekly matchup data is added to the league sheet.</div>'}
    </div>
  `;
}

function render() {
  let content = '';
  if (currentPage === 'weekly') content = renderWeekly();
  else if (currentPage === 'standings') content = renderStandings();
  else if (currentPage === 'hall') content = renderHallOfFame();
  else if (currentPage === 'players') content = renderPlayers();

  const showYearSelector = (currentPage === 'weekly' || currentPage === 'standings');
  const yearOptions = availableYears.map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('');

  const tab = (id, label) => `
    <button class="nav-btn" data-page="${id}" style="flex: 1; padding: 1rem; background: transparent; border: none; border-bottom: ${currentPage === id ? '2px solid #5B9BD5' : '2px solid transparent'}; color: ${currentPage === id ? '#FFFFFF' : '#8a97a8'}; cursor: pointer; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${label}</button>
  `;

  const navHTML = `
    <div style="background: #011A36; display: flex; gap: 0; position: sticky; top: 0; z-index: 10;">
      ${tab('weekly', 'Home')}
      ${tab('standings', 'Standings')}
      ${tab('players', 'Players')}
      ${tab('hall', 'Hall of Fame')}
    </div>

    ${showYearSelector ? `
    <div style="background: #011A36; padding: 1rem;">
      <div style="max-width: 1100px; margin: 0 auto;">
        <label style="font-size: 12px; color: #8a97a8; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.5rem;">Select Season</label>
        <select id="yearSelector" style="max-width: 200px; width: 100%; padding: 0.75rem; background: #FFFFFF; color: #011A36; border: 0.5px solid #d0d5dd; border-radius: 6px; font-size: 14px;">
          ${yearOptions}
        </select>
      </div>
    </div>
    ` : ''}
  `;

  app.innerHTML = navHTML + content;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentPage = e.target.dataset.page;
      if (currentPage !== 'players') selectedPlayer = null;
      render();
    });
  });

  const selector = document.getElementById('yearSelector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      selectedYear = parseInt(e.target.value);
      render();
    });
  }

  // Player tiles
  document.querySelectorAll('.player-tile').forEach(tile => {
    tile.addEventListener('click', (e) => {
      selectedPlayer = tile.dataset.player;
      render();
    });
  });

  // Back button
  const backBtn = document.getElementById('backToPlayers');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      selectedPlayer = null;
      render();
    });
  }

  // Unluckiest player tooltip (hover on desktop, tap on mobile)
  const unluckyTile = document.querySelector('.unlucky-tile');
  if (unluckyTile) {
    const tooltip = unluckyTile.querySelector('.unlucky-tooltip');
    unluckyTile.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; });
    unluckyTile.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    unluckyTile.addEventListener('click', () => {
      tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
    });
  }

  // Championship tile tooltips (hover on desktop, tap on mobile)
  document.querySelectorAll('.champ-tile').forEach(tile => {
    const tooltip = tile.querySelector('.champ-tooltip');
    if (!tooltip) return;
    tile.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; });
    tile.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    tile.addEventListener('click', () => {
      tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
    });
  });
}

fetchData();
