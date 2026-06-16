const fs = require('fs');
const https = require('https');

const SHEET_ID = '1XSztc0Pp9sIjZImnRQBfA_zPymtdMJr0ekuVFG1CLuE';

const sheets = {
  '2025_Weeks': 142810151,
  '2025_Standings': 869048924,
  'Hall_of_Fame': 514323247,
  'Championships': 286305454
};

function fetchSheet(gid) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    console.log(`Fetching: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Got ${data.length} bytes`);
        resolve(data);
      });
    }).on('error', reject);
  });
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    rows.push(obj);
  }
  return rows;
}

async function build() {
  try {
    const data = {};

    // Fetch 2025 Weeks
    console.log('Fetching 2025 Weeks...');
    const weeksCsv = await fetchSheet(sheets['2025_Weeks']);
    const weeksData = parseCSV(weeksCsv);
    console.log(`Parsed ${weeksData.length} weeks`);

    data['2025'] = {
      weeks: weeksData
        .filter(row => row.Week && row.Week.trim())
