const fs = require('fs');

const SHEET_ID = '1XSztc0Pp9sIjZImnRQBfA_zPymtdMJr0ekuVFG1CLuE';

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

async function sync() {
  try {
    console.log('Fetching sheets...');
    const weeks = await fetchSheet(142810151);
    const standings = await fetchSheet(869048924);
    const hof = await fetchSheet(514323247);
    const champ = await fetchSheet(286305454);

    const parseCSV = (csv) => {
      const lines = csv.trim().split('\n').filter(l => l.trim());
      if (lines.length < 2) return [];
      const headers = lines[0].split(',').map(h => h.trim());
      return lines.slice(1).map(line => {
        const obj = {};
        line.split(',').forEach((v, i) => obj[headers[i]] = v.trim());
        return obj;
      });
    };

    const weeksData = parseCSV(weeks);
    const standingsData = parseCSV(standings);
    const hofData = parseCSV(hof);
    const champData = parseCSV(champ);

    console.log(`Weeks: ${weeksData.length}, Standings: ${standingsData.length}, HOF: ${hofData.length}, Champ: ${champData.length}`);

    const data = {
      '2025': {
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
          pf: parseFloat(r.Points_For.replace(/,/g, '')) || 0,
          pa: parseFloat(r.Points_Against.replace(/,/g, '')) || 0
        })),
        champion: standingsData[0]?.Player || null
      },
      hallOfFame: {
        champions: hofData.map(r => ({ year: parseInt(r.Year), champion: r.Champion })),
        championships: Object.fromEntries(champData.map(r => [r.Player, parseInt(r.Total)]))
      }
    };

    fs.writeFileSync('public/data.json', JSON.stringify(data, null, 2));
    console.log('✅ Synced successfully!');
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
}

sync();
