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
  try {
    console.log('Fetching sheets...');
    const weeks = await fetchSheet(142810151);
    const standings = await fetchSheet(869048924);
    const hof = await fetchSheet(514323247);
    const champ = await fetchSheet(286305454);

    console.log('Weeks CSV (first 200 chars):', weeks.substring(0, 200));
    console.log('Standings CSV (first 200 chars):', standings.substring(0, 200));
    console.log('HOF CSV (first 200 chars):', hof.substring(0, 200));
    console.log('Champ CSV (first 200 chars):', champ.substring(0, 200));

    const parseCSV = (csv) => {
      const lines = csv.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      console.log('Headers:', headers);
      return lines.slice(1).map(line => {
        const obj = {};
        line.split(',').forEach((v, i) => obj[headers[i]] = v.trim());
        return obj;
      });
    };

    const weeksData = parseCSV(weeks);
    console.log('Weeks parsed:', weeksData.length, 'rows');
    console.log('First week row:', weeksData[0]);

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
        standings: [],
        champion: null
      },
      hallOfFame: { champions: [], championships: {} }
    };

    fs.writeFileSync('public/data.json', JSON.stringify(data, null, 2));
    console.log('✅ Done!');
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
}

sync();
