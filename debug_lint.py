import subprocess

try:
    # Run next lint --quiet to only show errors
    result = subprocess.run(
        ["npm", "run", "lint", "--", "--quiet"],
        capture_output=True,
        text=True,
        shell=True,
        encoding='utf-8',
        errors='replace'
    )
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
except Exception as e:
    print(e)
