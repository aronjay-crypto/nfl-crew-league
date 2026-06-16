const fs = require('fs');
const https = require('https');

const SHEET_ID = '1XSztc0Pp9sIjZImnRQBfA_zPymtdMJr0ekuVFG1CLuE';

function fetchSheet(gid) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function sync() {
  const weeks = await fetchSheet(142810151);
  const standings = await fetchSheet(869048924);
  const hof = await fetchSheet(514323247);
  const champ = await fetchSheet(286305454);

  const parseCSV = (csv) => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const obj = {};
      line.split(',').forEach((v, i) => obj[headers[i]] = v.trim());
      return obj;
    });
  };

  const weeksData = parseCSV(weeks).filter(r => r.Week);
  const standingsData = parseCSV(standings).filter(r => r.Rank);
  const hofData = parseCSV(hof).filter(r => r.Year);
  const champData = parseCSV(champ).filter(r => r.Player);

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
  console.log('✅ Synced!');
}

sync().catch(e => { console.error(e); process.exit(1); });
