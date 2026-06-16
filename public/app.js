const SHEET_ID = '1OoGAkPgzE4UFEekM3XchU22RGz3fIXl-2rxYeg0zJcU';
const app = document.getElementById('app');

let allData = {};
let currentPage = 'weekly';
let selectedYear = 2025;
let availableYears = [];

// Fetch data from Google Sheets
async function fetchSheetData() {
  try {
    const sheetsToFetch = ['HALL OF FAME', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'];
    
    for (const sheetName of sheetsToFetch) {
      const csv = await fetchCSV(sheetName);
      if (csv) {
        parseSheetData(sheetName, csv);
      }
    }
    
    availableYears = Object.keys(allData).filter(k => k !== 'hallOfFame').map(k => parseInt(k)).sort((a, b) => b - a);
    selectedYear = availableYears[0] || 2025;
    render();
  } catch (error) {
    console.error('Error fetching sheet:', error);
    showError('Could not load data from Google Sheets');
  }
}

async function fetchCSV(sheetName) {
  try {
    const gid = getSheetGID(sheetName);
    if (gid === null) return null;
    
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    const response = await fetch(url);
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${sheetName}:`, error);
    return null;
  }
}

function getSheetGID(sheetName) {
  const sheetMap = {
    'HALL OF FAME': 0,
    '2025': 1006709501,
    '2024': 632173622,
    '2023': 632173623,
    '2022': 632173624,
    '2021': 632173625,
    '2020': 632173626,
    '2019': 632173627,
    '2018': 632173628,
    '2017': 632173629,
  };
  
  return sheetMap[sheetName] !== undefined ? sheetMap[sheetName] : null;
}

function parseSheetData(sheetName, csvData) {
  const lines = csvData.split('\n').filter(line => line.trim());
  
  if (sheetName === 'HALL OF FAME') {
    parseHallOfFame(lines);
  } else {
    const year = parseInt(sheetName);
    parseYearSheet(year, lines);
  }
}

function parseHallOfFame(lines) {
  allData.hallOfFame = {
    champions: [],
    championshipTotals: {}
  };
  
  let inChampions = false;
  let inTotals = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('Winners')) {
      inChampions = true;
      inTotals = false;
      continue;
    }
    if (line.includes('Championship Totals')) {
      inChampions = false;
      inTotals = true;
      continue;
    }
    
    if (inChampions && line.trim()) {
      const parts = line.split(',').map(p => p.trim()).filter(p => p);
      if (parts.length >= 2 && !isNaN(parts[0])) {
        allData.hallOfFame.champions.push({
          year: parseInt(parts[0]),
          champion: parts[1]
        });
      }
    }
    
    if (inTotals && line.trim() && !line.includes('Championship Totals')) {
      const parts = line.split(',').map(p => p.trim()).filter(p => p);
      if (parts.length >= 2 && parts[0] && !isNaN(parseInt(parts[1]))) {
        allData.hallOfFame.championshipTotals[parts[0]] = parseInt(parts[1]);
      }
    }
  }
}

function parseYearSheet(year, lines) {
  allData[year] = {
    weeks: [],
    standings: [],
    champion: null
  };
  
  let inWeeks = false;
  let inStandings = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('highest points') || (line.includes('Week') && line.includes('highest'))) {
      inWeeks = true;
      inStandings = false;
      continue;
    }
    
    if (line.includes('Final Standings') || (line.includes('Person') && line.includes('Record'))) {
      inWeeks = false;
      inStandings = true;
      continue;
    }
    
    if (inWeeks && line.trim()) {
      const parts = line.split(',').map(p => p.trim());
      
      if (parts[0] && !isNaN(parseInt(parts[0])) && parseInt(parts[0]) > 0 && parseInt(parts[0]) <= 20) {
        const week = {
          week: parseInt(parts[0]),
          highScore: parts[1] || '',
          lowScore: parts[2] || '',
          highPlayer: parts[3] || '',
          lowPlayer: parts[4] || '',
          waiver: parts[5] || '-'
        };
        allData[year].weeks.push(week);
      }
    }
    
    if (inStandings && line.trim() && !line.includes('Person') && !line.includes('Final Standings')) {
      const parts = line.split(',').map(p => p.trim()).filter(p => p);
      if (parts.length >= 5 && !isNaN(parseInt(parts[0]))) {
        const standing = {
          rank: parseInt(parts[0]),
          player: parts[1],
          record: parts[2],
          pf: parseFloat(parts[3]) || 0,
          pa: parseFloat(parts[4]) || 0
        };
        if (allData[year].standings.length === 0) {
          allData[year].champion = standing.player;
        }
        allData[year].standings.push(standing);
      }
    }
  }
}

function showError(msg) {
  app.innerHTML = `<div style="max-width: 680px; margin: 2rem auto; padding: 1rem; text-align: center; color: #ef4444; background: #fee2e2; border-radius: 8px;">${msg}</div>`;
}

function renderWeekly() {
  const data = allData[selectedYear];
  if (!data || !data.weeks.length) {
    return `<div style="max-width: 680px; margin: 2rem auto; padding: 1rem; text-align: center; color: #94a3b8;">No week data available</div>`;
  }
  
  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 1.5rem;">NFL Crew League</h1>
      <div style="display: grid; gap: 12px;">
        ${data.weeks.map(w => `
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
  const data = allData[selectedYear];
  if (!data || !data.standings.length) {
    return `<div style="max-width: 680px; margin: 2rem auto; padding: 1rem; text-align: center; color: #94a3b8;">No standings data available</div>`;
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
    return `<div style="max-width: 680px; margin: 2rem auto; padding: 1rem; text-align: center; color: #94a3b8;">No hall of fame data available</div>`;
  }
  
  return `
    <div style="max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem;">
      <h1 style="font-size: 28px; font-weight: 500; margin: 0 0 1.5rem;">Hall of Fame</h1>

      <h2 style="font-size: 12px; font-weight: 500; color: #94a3b8; text-transform: uppercase; margin: 0 0 1rem; letter-spacing: 0.5px;">Championships by Player</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 2rem;">
        ${Object.entries(data.championshipTotals).sort((a, b) => b[1] - a[1]).map(([player, count]) => `
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
      <button class="nav-btn" data-page="weekly" style="flex: 1; padding: 1rem; background: transparent; border: none; border-bottom: ${currentPage === 'weekly' ? '2px solid #3b82f6' : '2px solid transparent'}; color: ${currentPage === 'weekly' ? '#3b82f6' : '#64748b'}; cursor: pointer; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s;">Home</button>
      <button class="nav-btn" data-page="standings" style="flex: 1; padding: 1rem; background: transparent; border: none; border-bottom: ${currentPage === 'standings' ? '2px solid #3b82f6' : '2px solid transparent'}; color: ${currentPage === 'standings' ? '#3b82f6' : '#64748b'}; cursor: pointer; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s;">Standings</button>
      <button class="nav-btn" data-page="hall" style="flex: 1; padding: 1rem; background: transparent; border: none; border-bottom: ${currentPage === 'hall' ? '2px solid #3b82f6' : '2px solid transparent'}; color: ${currentPage === 'hall' ? '#3b82f6' : '#64748b'}; cursor: pointer; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s;">Hall of Fame</button>
    </div>
    
    <div style="background: #0f172a; padding: 1rem; border-bottom: 0.5px solid #334155;">
      <div style="max-width: 680px; margin: 0 auto;">
        <label style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.5rem;">Select Season</label>
        <select id="yearSelector" style="width: 100%; padding: 0.75rem; background: #1e293b; color: #e2e8f0; border: 0.5px solid #334155; border-radius: 6px; font-size: 14px;">
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
  
  document.getElementById('yearSelector').addEventListener('change', (e) => {
    selectedYear = parseInt(e.target.value);
    render();
  });
}

fetchSheetData();
