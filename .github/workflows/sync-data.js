const fs = require('fs');

const SHEET_ID = '1XSztc0Pp9sIjZImnRQBfA_zPymtdMJr0ekuVFG1CLuE';

// Add a new season by adding one line here with its two GIDs.
const SEASONS = {
  '2025': { weeks: 142810151, standings: 593825938 },
  '2024': { weeks: 733256198, standings: 869048924 },
  '2023': { weeks: 1919173883, standings: 290329594 }
};

const HALL_OF_FAME_GID = 514323247;
const CHAMPIONSHIPS_GID = 286305454;

async function fetchSheet(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    redirect: 'follow'
  });
  const text = await res.text();
  console.log(`Fetched ${text.length} bytes from gid ${gid} (status ${res.status})`);
  return text;
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });
}

async function sync() {
  try {
    const data = {};

    // Loop through every season defined above
    for (const [year, gids] of Object.entries(SEASONS)) {
      console.log(`Fetching ${year}...`);
      const weeksCsv = await fetchSheet(gids.weeks);
      const standingsCsv = await fetchSheet(gids.standings);

      const weeksData = parseCSV(weeksCsv).filter(r => r.Week);
      const standingsData = parseCSV(standingsCsv).filter(r => r.Rank);

      data[year] = {
        weeks: weeksData.map(r => ({
          week: parseInt(r.Week),
          highScore: `${r.High_Scorer}, ${r.High_Score}`,
          lowScore: `${r.Low_Scorer}, ${r.Low_Score}`,
          highPlayer: r.Highest_Player,
          lowPlayer: r.Lowest_Player,
          waiver: r.Most_Expensive_waiver || '-'
        })),
        standings: standingsData.map(r => ({
          rank: parseInt(r.Rank),
          player: r.Player,
          record: r.Record,
          pf: parseFloat((r.Points_For || '').replace(/,/g, '')) || 0,
          pa: parseFloat((r.Points_Against || '').replace(/,/g, '')) || 0
        })),
        champion: standingsData[0]?.Player || null
      };
    }

    // Hall of Fame + Championships
    console.log('Fetching Hall of Fame...');
    const hofData = parseCSV(await fetchSheet(HALL_OF_FAME_GID)).filter(r => r.Year);
    const champData = parseCSV(await fetchSheet(CHAMPIONSHIPS_GID)).filter(r => r.Player);

    data.hallOfFame = {
      champions: hofData.map(r => ({ year: parseInt(r.Year), champion: r.Champion })),
      championships: Object.fromEntries(champData.map(r => [r.Player, parseInt(r.Total)]))
    };

    fs.writeFileSync('public/data.json', JSON.stringify(data, null, 2));
    console.log('✅ Synced successfully!');
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
}

sync();
