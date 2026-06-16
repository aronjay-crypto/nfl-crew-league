const app = document.getElementById('app');

let allData = {};
let currentPage = 'weekly';
let selectedYear = 2025;
let availableYears = [];

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

// Helper: extract numeric score from "Name, 123.45" format
function extractScore(str) {
  if (!str) return 0;
  const match = str.match(/,\s*(-?\d+\.?\d*)\s*$/);
  return match ? parseFloat(match[1]) : 0;
}

// Helper: extract points from "Name, Player, 34.5" format
function extractPlayerPoints(str) {
  if (!str) return 0;
  const match = str.match(/,\s*(-?\d+\.?\d*)[^,]*$/);
  return match ? parseFloat(match[1]) : 0;
}

// Calculate season records
function getSeasonRecords(data) {
  if (!data || !data.weeks.length) return null;
  
  let highestScore = { value: -Infinity, label: '', week: 0 };
  let highestPlayer = { value: -Infinity, label: '', week: 0 };
  let lowestPlayer = { value: Infinity, label: '', week: 0 };
  let expensiveWaiver = { value: -Infinity, label: '', week: 0 };
  
  data.weeks.forEach(w => {
    // Highest weekly score
    const hs = extractScore(w.highScore);
    if (hs > highestScore.value) {
      highestScore = { value: hs, label: w.highScore, week: w.week };
    }
    
    // Highest scoring player
    const hp = extractPlayerPoints(w.highPlayer);
    if (hp > highestPlayer.value) {
      highestPlayer = { value: hp, label: w.highPlayer, week: w.week };
    }
    
    // Lowest scoring player
    const lp = extractPlayerPoints(w.lowPlayer);
    if (w.lowPlayer && lp < lowestPlayer.value) {
      lowestPlayer = { value: lp, label: w.lowPlayer, week: w.week };
    }
    
    // Most expensive waiver - extract cost in parentheses or after comma
    if (w.waiver && w.waiver !== '-') {
      const costMatch = w.waiver.match(/,\s*(\d+)\s*$/);
      const cost = costMatch ? parseInt(costMatch[1]) : 0;
      if (cost > expensiveWaiver.value) {
        expensiveWaiver = { value: cost, label: w.waiver, week: w.week };
      }
    }
  });
  
  return { highestScore, highestPlayer, lowestPlayer, expensiveWaiver };
}

function renderWeekly() {
  const data = allData[selectedYear];
  if (!data || !data.weeks.length) {
    return `<div style="max-width: 1100px; margin: 2rem auto; padding: 1rem; text-align: center; color: #94a3b8;">No week data available for ${selectedYear}</div>`;
  }
  
  const records = getSeasonRecords(data);
  
  const weekCard = (w) => `
    <div style="background: #1e293b; border-radius: 8px; padding: 1rem; border: 0.5px solid #334155;">
      <p style="font-size: 11px; font-weight: 500; color: #3b82f6; margin: 0 0 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Week ${w.week}</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div>
          <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">High Score</p>
          <p style="font-size: 15px; font-weight: 500; margin: 0;">${w.highScore}</p>
        </div>
        <div>
          <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Low Score</p>
          <p style="font-size: 15px; font-weight: 500; margin: 0;">${w.lowScore}</p>
        </div>
      </div>
      <div style="border-top: 0.5px solid #334155; padding-top: 12px;">
        <div style="margin-bottom: 8px;">
          <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Highest Player</p>
          <p style="font-size: 12px; margin: 0;">${w.highPlayer}</p>
        </div>
        <div style="margin-bottom: 8px;">
          <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Lowest Player</p>
          <p style="font-size: 12px; margin: 0;">${w.lowPlayer}</p>
        </div>
        <div>
          <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px;">Most Expensive Waiver</p>
          <p style="font-size: 12px; margin: 0;">${w.waiver}</p>
        </div>
      </div>
    </div>
  `;
  
  const recordCard = (label, value, sublabel) => `
    <div style="background: #1e293b; border-radius: 8px; padding: 1rem; border: 0.5px solid #334155; margin-bottom: 12px;">
      <p style="font-size: 10px; color: #3b82f6; text-transform: uppercase; margin: 0 0 6px; letter-spacing: 0.5px; font-weight: 500;">${label}</p>
      <p style="font-size: 14px; font-weight: 500; margin: 0 0 2px;">${value}</p>
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">${sublabel}</p>
    </div>
  `;
  
  return `
    <div style="max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 1.5rem;">NFL Crew League</h1>
      
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: start;">
        
        <!-- Left: Weekly cards in 2-column grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${data.weeks.map(weekCard).join('')}
        </div>
        
        <!-- Right: Season records sidebar -->
        <div style="position: sticky; top: 90px;">
          <h2 style="font-size: 12px; font-weight: 500; color: #94a3b8; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">${selectedYear} Season Records</h2>
          ${records ? `
            ${recordCard('Highest Score', records.highestScore.label, `Week ${records.highestScore.week}`)}
            ${recordCard('Highest Scoring Player', records.highestPlayer.label, `Week ${records.highestPlayer.week}`)}
            ${recordCard('Lowest Scoring Player', records.lowestPlayer.label, `Week ${records.lowestPlayer.week}`)}
            ${recordCard('Most Expensive Waiver', records.expensiveWaiver.label, `Week ${records.expensiveWaiver.week}`)}
          ` : '<p style="color: #94a3b8; font-size: 13px;">No records yet</p>'}
        </div>
        
      </div>
    </div>
  `;
}

function renderStandings() {
  const data = allData[selectedYear];
  if (!data || !data.standings.length) {
    return `<div style="max-width: 1100px; margin: 2rem auto; padding: 1rem; text-align: center; color: #94a3b8;">No standings data available</div>`;
  }
  
  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 0.5rem;">NFL Crew League</h1>
      <p style="font-size: 14px; color: #94a3b8; margin: 0 0 2rem;">${selectedYear} Season</p>

      <div style="background: #1e293b; border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 1.5rem; text-align: center; margin-bottom: 2rem;">
        <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; margin: 0 0 0.5rem; letter-spacing: 0.5px;">${selectedYear} Champion</p>
        <p style="font-size: 32px; font-weight: 500; color: #3b82f6; margin: 0;">${data.champion || 'TBD'}</p>
      </div>

      <h2 style="font-size: 12px; font-weight: 500; color: #94a3b8; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Standings</h2>
      <div style="display: grid; gap: 8px;">
        ${data.standings.map(s => `
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
  const data = allData.hallOfFame;
  if (!data) {
    return `<div style="max-width: 1100px; margin: 2rem auto; padding: 1rem; text-align: center; color: #94a3b8;">No data available</div>`;
  }
  
  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 1.5rem;">Hall of Fame</h1>

      <h2 style="font-size: 12px; font-weight: 500; color: #94a3b8; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Championships by Player</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 2rem;">
        ${Object.entries(data.championships || {}).sort((a, b) => b[1] - a[1]).map(([player, count]) => `
          <div style="background: #1e293b; border-radius: 8px; padding: 1rem; text-align: center;">
            <p style="font-size: 16px; font-weight: 500; margin: 0 0 0.5rem;">${player}</p>
            <p style="font-size: 24px; font-weight: 500; color: #3b82f6; margin: 0;">${count}</p>
            <p style="font-size: 11px; color: #94a3b8; margin: 0.5rem 0 0; text-transform: uppercase;">Title${count !== 1 ? 's' : ''}</p>
          </div>
        `).join('')}
      </div>

      <h2 style="font-size: 12px; font-weight: 500; color: #94a3b8; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Year by Year</h2>
      <div style="display: grid; gap: 8px;">
        ${data.champions.map(entry => `
          <div style="background: #1e293b; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
            <p style="font-size: 14px; color: #94a3b8; margin: 0;">${entry.year}</p>
            <p style="font-size: 16px; font-weight: 500; margin: 0;">${entry.champion}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function render() {
  let content = '';
  if (currentPage === 'weekly') content = renderWeekly();
  else if (currentPage === 'standings') content = renderStandings();
  else if (currentPage === 'hall') content = renderHallOfFame();

  const yearOptions = availableYears.map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('');

  const navHTML = `
    <div style="background: #1e293b; border-bottom: 0.5px solid #334155; display: flex; gap: 0; position: sticky; top: 0; z-index: 10;">
      <button class="nav-btn" data-page="weekly" style="flex: 1; padding: 1rem; background: transparent; border: none; border-bottom: ${currentPage === 'weekly' ? '2px solid #3b82f6' : '2px solid transparent'}; color: ${currentPage === 'weekly' ? '#3b82f6' : '#64748b'}; cursor: pointer; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Home</button>
      <button class="nav-btn" data-page="standings" style="flex: 1; padding: 1rem; background: transparent; border: none; border-bottom: ${currentPage === 'standings' ? '2px solid #3b82f6' : '2px solid transparent'}; color: ${currentPage === 'standings' ? '#3b82f6' : '#64748b'}; cursor: pointer; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Standings</button>
      <button class="nav-btn" data-page="hall" style="flex: 1; padding: 1rem; background: transparent; border: none; border-bottom: ${currentPage === 'hall' ? '2px solid #3b82f6' : '2px solid transparent'}; color: ${currentPage === 'hall' ? '#3b82f6' : '#64748b'}; cursor: pointer; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Hall of Fame</button>
    </div>
    
    <div style="background: #0f172a; padding: 1rem; border-bottom: 0.5px solid #334155;">
      <div style="max-width: 1100px; margin: 0 auto;">
        <label style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.5rem;">Select Season</label>
        <select id="yearSelector" style="max-width: 200px; padding: 0.75rem; background: #1e293b; color: #e2e8f0; border: 0.5px solid #334155; border-radius: 6px; font-size: 14px;">
          ${yearOptions}
        </select>
      </div>
    </div>
  `;

  app.innerHTML = navHTML + content;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentPage = e.target.dataset.page;
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
}

fetchData();
