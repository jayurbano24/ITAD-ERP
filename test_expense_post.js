const http = require('http');

const data = JSON.stringify({
  batchId: '178d2f53-d298-4478-a644-16647b7a9d21',
  type: 'logistics',
  amount: 1500,
  description: 'Logistica test'
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
  family: 4  // Force IPv4
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
