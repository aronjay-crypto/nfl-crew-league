const app = document.getElementById('app');

// DATA - Update this section each week
const season2024 = {
  champion: 'Zak',
  standings: [
    { rank: 1, player: 'Zak', record: '9-6', pf: 1716.18, pa: 1565.1, diff: 151.08 },
    { rank: 2, player: 'Lance', record: '8-7', pf: 1623.84, pa: 1668.38, diff: -44.54 },
    { rank: 3, player: 'James', record: '11-4', pf: 1818.7, pa: 1556.44, diff: 262.26 },
    { rank: 4, player: 'Nathan', record: '10-5', pf: 1703.23, pa: 1660.7, diff: 42.53 },
    { rank: 5, player: 'Jamie', record: '6-9', pf: 1598.88, pa: 1702.34, diff: -103.46 },
    { rank: 6, player: 'Aron', record: '7-8', pf: 1767.14, pa: 1686.76, diff: 80.38 },
    { rank: 7, player: 'Ben', record: '4-11', pf: 1557.02, pa: 1737.94, diff: -180.92 },
    { rank: 8, player: 'Ethan', record: '5-10', pf: 1613, pa: 1820, diff: -207 },
  ],
  weeks: [
    { week: 1, highScore: 'Zak, 134.16', lowScore: 'Ben, 94.56', highPlayer: 'James - Saquon (34.2)', lowPlayer: 'Nathan - Kincaid (1.10)', waiver: '-' },
    { week: 2, highScore: 'Zak, 130.90', lowScore: 'Lance, 100.06', highPlayer: 'Ben - Kamara (43)', lowPlayer: 'Ben - Kelce (0.6)', waiver: 'Aron - Zach Charbonnet (8)' },
    { week: 3, highScore: 'Jamie, 143.08', lowScore: 'Lance, 72.28', highPlayer: 'Ethan - Josh Allen (30.92)', lowPlayer: 'James - Stevenson (-0.7)', waiver: 'James - Rashid Shaheed (18)' },
    { week: 4, highScore: 'Aron, 129.94', lowScore: 'Lance, 82.02', highPlayer: 'Jamie - Derrick Henry (30.90)', lowPlayer: 'Ben - Steele (-2.4)', waiver: 'Ethan - Jauan Jennings (15)' },
    { week: 5, highScore: 'Ben, 129.68', lowScore: 'James, 76.92', highPlayer: 'Ben - Burrow (33.78)', lowPlayer: 'Jamie - Olave (1)', waiver: 'Lance - Xavier Worthy (22)' },
    { week: 6, highScore: 'Aron, 155.12', lowScore: 'Ethan, 87.40', highPlayer: 'Nathan + Jamie - Mixon + Henry (26.20)', lowPlayer: 'Jamie - Olave (-2.50)', waiver: 'Ethan - Rico Dowdle (15)' },
    { week: 7, highScore: 'Aron, 145.24', lowScore: 'Ben, 82.04', highPlayer: 'Aron - Lamar (33.94)', lowPlayer: 'Lance - Jameson Williams (-0.4)', waiver: 'Ben - Keenan Allen (20)' },
    { week: 8, highScore: 'James, 136.56', lowScore: 'Ethan, 104.32', highPlayer: 'James - Hurts (35.14)', lowPlayer: 'Zak - Jake Ferguson (1.30)', waiver: 'Aron - Jauan Jennings (38)' },
    { week: 9, highScore: 'James, 150.40', lowScore: 'Zak, 73.32', highPlayer: 'James - Hurts + Saquon (29.90)', lowPlayer: 'Ethan - Kmet (0)', waiver: 'Ben - Alexander Mattison (6)' },
    { week: 10, highScore: 'Lance, 130.14', lowScore: 'Ethan, 83', highPlayer: 'Lance - Chase (46.40)', lowPlayer: 'Zak - Brian Thomas (1.2)', waiver: 'Ethan - Tucker Kraft (10)' },
  ]
};

const hallOfFame = [
  { year: 2024, champion: 'Zak' },
  { year: 2023, champion: 'Ethan' },
  { year: 2022, champion: 'Aron + Ben' },
  { year: 2021, champion: 'Ethan' },
  { year: 2020, champion: 'Aron' },
];

const playerChamps = { 'Aron': 3, 'Ben': 1, 'Ethan': 2, 'James': 2, 'Lance': 3, 'Nathan': 1, 'Zak': 2, 'Jamie': 0 };

// Pages
function renderWeekly() {
  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 1.5rem;">NFL Crew League</h1>
      <div style="display: grid; gap: 12px;">
        ${season2024.weeks.map(w => `
          <div style="background: #1e293b; border-radius: 8px; padding: 1rem; border: 0.5px solid #334155;">
            <p style="font-size: 11px; font-weight: 500; color: #3b82f6; margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Week ${w.week}</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">High Score</p>
                <p style="font-size: 16px; font-weight: 500; margin: 0;">${w.highScore}</p>
              </div>
              <div>
                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Low Score</p>
                <p style="font-size: 16px; font-weight: 500; margin: 0;">${w.lowScore}</p>
              </div>
            </div>
            <div style="border-top: 0.5px solid #334155; padding-top: 12px;">
              <div style="margin-bottom: 8px;">
                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Highest Scoring Player</p>
                <p style="font-size: 13px; margin: 0;">${w.highPlayer}</p>
              </div>
              <div style="margin-bottom: 8px;">
                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Lowest Scoring Player</p>
                <p style="font-size: 13px; margin: 0;">${w.lowPlayer}</p>
              </div>
              <div>
                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Most Expensive Waiver</p>
                <p style="font-size: 13px; margin: 0;">${w.waiver}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStandings() {
  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 0.5rem;">NFL Crew League</h1>
      <p style="font-size: 14px; color: #94a3b8; margin: 0 0 2rem;">2024 Season</p>

      <div style="background: #1e293b; border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 1.5rem; text-align: center; margin-bottom: 2rem;">
        <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 0.5rem; letter-spacing: 0.5px;">2024 Champion</p>
        <p style="font-size: 32px; font-weight: 500; color: #3b82f6; margin: 0;">${season2024.champion}</p>
      </div>

      <h2 style="font-size: 12px; font-weight: 500; color: #94a3b8; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Standings</h2>
      <div style="display: grid; gap: 8px;">
        ${season2024.standings.map(s => `
          <div style="background: #1e293b; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 14px; font-weight: 500; color: #94a3b8; min-width: 24px;">${s.rank}</span>
              <span style="font-size: 16px; font-weight: 500;">${s.player}</span>
            </div>
            <div style="display: flex; gap: 16px; font-size: 13px; color: #94a3b8;">
              <span>${s.record}</span>
              <span>${Math.round(s.pf)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderHallOfFame() {
  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 1.5rem;">Hall of Fame</h1>

      <h2 style="font-size: 12px; font-weight: 500; color: #94a3b8; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Championships by Player</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 2rem;">
        ${Object.entries(playerChamps).sort((a, b) => b[1] - a[1]).map(([player, count]) => `
          <div style="background: #1e293b; border-radius: 8px; padding: 1rem; text-align: center;">
            <p style="font-size: 16px; font-weight: 500; margin: 0 0 0.5rem;">${player}</p>
            <p style="font-size: 24px; font-weight: 500; color: #3b82f6; margin: 0;">${count}</p>
            <p style="font-size: 11px; color: #94a3b8; margin: 0.5rem 0 0; text-transform: uppercase;">Title${count !== 1 ? 's' : ''}</p>
          </div>
        `).join('')}
      </div>

      <h2 style="font-size: 12px; font-weight: 500; color: #94a3b8; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Year by Year</h2>
      <div style="display: grid; gap: 8px;">
        ${hallOfFame.map(entry => `
          <div style="background: #1e293b; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
            <p style="font-size: 14px; color: #94a3b8; margin: 0;">${entry.year}</p>
            <p style="font-size: 16px; font-weight: 500; margin: 0;">${entry.champion}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Navigation
let currentPage = 'weekly';

function render() {
  let content = '';
  if (currentPage === 'weekly') content = renderWeekly();
  else if (currentPage === 'standings') content = renderStandings();
  else if (currentPage === 'hall') content = renderHallOfFame();

  const navHTML = `
    <div style="background: #1e293b; border-bottom: 0.5px solid #334155; display: flex; gap: 0; position: sticky; top: 0; z-index: 10;">
      <button class="nav-btn" data-page="weekly" style="flex: 1; padding: 1rem; background: transparent; border: none; border-bottom: ${currentPage === 'weekly' ? '2px solid #3b82f6' : '2px solid transparent'}; color: ${currentPage === 'weekly' ? '#3b82f6' : '#64748b'}; cursor: pointer; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s;">Home</button>
      <button class="nav-btn" data-page="standings" style="flex: 1; padding: 1rem; background: transparent; border: none; border-bottom: ${currentPage === 'standings' ? '2px solid #3b82f6' : '2px solid transparent'}; color: ${currentPage === 'standings' ? '#3b82f6' : '#64748b'}; cursor: pointer; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s;">Standings</button>
      <button class="nav-btn" data-page="hall" style="flex: 1; padding: 1rem; background: transparent; border: none; border-bottom: ${currentPage === 'hall' ? '2px solid #3b82f6' : '2px solid transparent'}; color: ${currentPage === 'hall' ? '#3b82f6' : '#64748b'}; cursor: pointer; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s;">Hall of Fame</button>
    </div>
  `;

  app.innerHTML = navHTML + content;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentPage = e.target.dataset.page;
      render();
    });
  });
}

render();
