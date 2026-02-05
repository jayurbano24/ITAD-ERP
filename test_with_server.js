const { spawn } = require('child_process');
const http = require('http');

// Start the dev server
const dev = spawn('npm', ['run', 'dev'], {
  cwd: 'C:\\Users\\Usuario01\\ITAD-ERP-GUATEMALA',
  stdio: 'pipe',  // Capture output
  shell: true
});

dev.stdout.on('data', (data) => {
  console.log(`[Server] ${data}`);
});

dev.stderr.on('data', (data) => {
  console.error(`[Server Error] ${data}`);
});

// Wait for server to be ready, then test
setTimeout(() => {
  console.log('\n\n=== TESTING API ===\n');
  
  const data = JSON.stringify({
    batchId: '178d2f53-d298-4478-a644-16647b7a9d21',
    type: 'acquisition',
    amount: 5000,
    description: 'Costo de adquisición ajustado'
  });

  const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/finanzas/set-expense',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    },
    family: 4
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', body);
      dev.kill();
      process.exit(0);
    });
  });

  req.on('error', (error) => {
    console.error('Request Error:', error.message);
    dev.kill();
    process.exit(1);
  });

  req.write(data);
  req.end();
}, 8000);  // Wait 8 seconds for server to start
