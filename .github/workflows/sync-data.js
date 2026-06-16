const fs = require('fs');
const https = require('https');

const SHEET_ID = '1XSztc0Pp9sIjZImnRQBfA_zPymtdMJr0ekuVFG1CLuE';

// Sheet names and their GIDs (you may need to adjust these)
const sheets = {
  '2025_Weeks': 142810151,
  '2025_Standings': 869048924,
  'Hall_of_Fame': 514323247,
  'Championships': 286305454
};

async function fetchSheet(sheetName, gid) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const values = lines[i].split(',').map(v => v.trim());
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    rows.push(obj);
  }
  return rows;
}

async function build() {
  const data = {};

  // Fetch 2025 weeks
  const weeks2025 = await fetchSheet('2025_Weeks', sheets['2025_Weeks']);
  const weeksData = parseCSV(weeks2025);
  
  data['2025'] = {
    weeks: weeksData.map(row => ({
      week: parseInt(row.Week),
      highScore: `${row.High_Scorer}, ${row.High_Score}`,
      lowScore: `${row.Low_Scorer}, ${row.Low_Score}`,
      highPlayer: row.Highest_Player,
      lowPlayer: row.Lowest_Player,
      waiver: row.Most_Expensive_waiver || '-'
    })),
    standings: [],
    champion: null
  };

  // Fetch 2025 standings
  const standings2025 = await fetchSheet('2025_Standings', sheets['2025_Standings']);
  const standingsData = parseCSV(standings2025);
  
  data['2025'].standings = standingsData.map(row => ({
    rank: parseInt(row.Rank),
    player: row.Player,
    record: row.Record,
    pf: parseFloat(row.Points_For) || 0,
    pa: parseFloat(row.Points_Against) || 0
  }));
  
  if (data['2025'].standings.length > 0) {
    data['2025'].champion = data['2025'].standings[0].player;
  }

  // Hall of Fame
  const hof = await fetchSheet('Hall_of_Fame', sheets['Hall_of_Fame']);
  const hofData = parseCSV(hof);
  
  const champ = await fetchSheet('Championships', sheets['Championships']);
  const champData = parseCSV(champ);
  
  data.hallOfFame = {
    champions: hofData.map(row => ({
      year: parseInt(row.Year),
      champion: row.Champion
    })),
    championships: {}
  };
  
  champData.forEach(row => {
    data.hallOfFame.championships[row.Player] = parseInt(row.Total);
  });

  // Load existing historical data
  if (fs.existsSync('public/data.json')) {
    const existing = JSON.parse(fs.readFileSync('public/data.json', 'utf8'));
    Object.keys(existing).forEach(key => {
      if (key !== '2025' && key !== 'hallOfFame') {
        data[key] = existing[key];
      }
    });
  }

  fs.writeFileSync('public/data.json', JSON.stringify(data, null, 2));
  console.log('✅ Data synced!');
}

build().catch(console.error);
