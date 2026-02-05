const { spawn } = require('child_process');

console.log('Starting Next.js dev server...');

const dev = spawn('npm', ['run', 'dev'], {
  cwd: 'C:\\Users\\Usuario01\\ITAD-ERP-GUATEMALA',
  stdio: 'inherit',
  shell: true
});

dev.on('exit', (code) => {
  console.log(`Dev server exited with code ${code}`);
  process.exit(code);
});

dev.on('error', (error) => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});

// Keep process alive
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  dev.kill();
  process.exit(0);
});
