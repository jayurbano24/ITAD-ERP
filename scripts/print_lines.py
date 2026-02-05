from pathlib import Path

path = Path('src/app/dashboard/taller/components/TallerStageDashboard.tsx')
lines = path.read_text().splitlines()
for idx in range(1234, 1254):
    print(f"{idx+1}: {lines[idx]}")
