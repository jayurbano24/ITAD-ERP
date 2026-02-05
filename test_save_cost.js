// Test para guardar costo en batch AUTO-1768017753253
const fetch = require('node-fetch');

async function testSaveCost() {
  try {
    const batchId = '09f1454b-474c-428f-bf9d-edb2646d24b'; // ID del batch AUTO-1768017753253
    
    console.log('Enviando POST a update-batch-totals...');
    console.log('Payload:', { batchId, type: 'cost', amount: 35000 });
    
    const response = await fetch('http://localhost:3000/api/finanzas/update-batch-totals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: batchId,
        type: 'cost',
        amount: 35000
      })
    });
    
    console.log('Status:', response.status);
    
    const text = await response.text();
    console.log('Response:', text);
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('✅ Success:', data);
    } else {
      console.log('❌ Error response');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSaveCost();
