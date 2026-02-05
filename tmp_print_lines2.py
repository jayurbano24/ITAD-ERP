from pathlib import Path

path = Path('src/app/dashboard/taller/components/TallerStageDashboard.tsx')
lines = path.read_text().splitlines()
start = 1234
end = min(1248, len(lines))
for idx in range(start - 1, end):
    print(f"{idx + 1:04d}: {lines[idx]}")
