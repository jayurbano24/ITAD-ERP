from pathlib import Path
path = Path('src/app/dashboard/taller/components/TallerStageDashboard.tsx')
lines = path.read_text().splitlines()
for idx in range(660, 710):
    print(f"{idx+1:04d}: {lines[idx]}")
