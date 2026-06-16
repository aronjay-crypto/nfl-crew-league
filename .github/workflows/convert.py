import csv
import json

data = {}

# Fetch 2025 sheet
sheet_url = "https://docs.google.com/spreadsheets/d/1OoGAkPgzE4UFEekM3XchU22RGz3fIXl-2rxYeg0zJcU/export?format=csv&gid=1006709501"
import urllib.request
urllib.request.urlretrieve(sheet_url, "/tmp/2025.csv")

# Parse the CSV and convert to JSON (simplified version)
# This reads your sheet and extracts weeks/standings

data['2025'] = {
    'weeks': [],
    'standings': [],
    'champion': 'TBD'
}

# Read the CSV
with open('/tmp/2025.csv', 'r') as f:
    lines = f.readlines()
    
# Extract weeks and standings from your sheet format
in_weeks = False
in_standings = False

for line in lines:
    if 'highest points' in line.lower():
        in_weeks = True
        continue
    if 'final standings' in line.lower():
        in_weeks = False
        in_standings = True
        continue
    
    # Parse weeks
    if in_weeks and line.strip():
        parts = [p.strip() for p in line.split(',')]
        if parts[0].isdigit() and int(parts[0]) <= 20:
            data['2025']['weeks'].append({
                'week': int(parts[0]),
                'highScore': parts[1] if len(parts) > 1 else '',
                'lowScore': parts[2] if len(parts) > 2 else '',
                'highPlayer': parts[3] if len(parts) > 3 else '',
                'lowPlayer': parts[4] if len(parts) > 4 else '',
                'waiver': parts[5] if len(parts) > 5 else '-'
            })
    
    # Parse standings
    if in_standings and line.strip() and 'Person' not in line:
        parts = [p.strip() for p in line.split(',')]
        if parts and parts[0].isdigit():
            data['2025']['standings'].append({
                'rank': int(parts[0]),
                'player': parts[1] if len(parts) > 1 else '',
                'record': parts[2] if len(parts) > 2 else '',
                'pf': float(parts[3]) if len(parts) > 3 else 0,
                'pa': float(parts[4]) if len(parts) > 4 else 0
            })
            if len(data['2025']['standings']) == 1:
                data['2025']['champion'] = parts[1]

# Keep historical data
with open('public/data.json', 'r') as f:
    old_data = json.load(f)
    for year in old_data:
        if year != '2025':
            data[year] = old_data[year]

# Write updated JSON
with open('public/data.json', 'w') as f:
    json.dump(data, f, indent=2)
