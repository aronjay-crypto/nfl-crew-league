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

functio
