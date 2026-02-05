const tickets = ['TK-2026-00005', 'TK-2026-00007', 'TK-2026-00003']

async function checkBoxes() {
  for (const ticket of tickets) {
    try {
      const response = await fetch(`http://localhost:3001/api/logistica/boxes?ticketReadableId=${encodeURIComponent(ticket)}`)
      const data = await response.json()
      console.log(`\n=== ${ticket} ===`)
      console.log('Boxes:', JSON.stringify(data.boxes, null, 2))
    } catch (error) {
      console.error(`Error fetching ${ticket}:`, error.message)
    }
  }
}

checkBoxes()
