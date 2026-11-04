const ExcelJS = require('exceljs');
const fs = require('fs');
(async () => {
  const path = 'docs/templates/ORD20xxx-ITAD_Asset_Report_Testing_Log.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const out = { file: path, sheets: [] };
  for (const ws of wb.worksheets) {
    const maxC = Math.max(ws.actualColumnCount || 1, 50);
    const headerRows = [];
    for (let r = 1; r <= 5; r++) {
      const row = ws.getRow(r);
      const cells = [];
      for (let c = 1; c <= maxC; c++) {
        const cell = row.getCell(c);
        const v = cell.value;
        let text = '';
        if (v == null || v === '') text = '';
        else if (typeof v === 'object' && v.richText) text = v.richText.map(t => t.text).join('');
        else if (typeof v === 'object' && v.text) text = String(v.text);
        else if (typeof v === 'object' && v.formula) text = '=' + v.formula;
        else if (v instanceof Date) text = v.toISOString().slice(0,10);
        else text = String(v);
        const fill = cell.fill && cell.fill.type === 'pattern' && cell.fill.fgColor
          ? (cell.fill.fgColor.argb || JSON.stringify(cell.fill.fgColor))
          : null;
        if (!text && !fill) continue;
        cells.push({ c, a: cell.address, t: text, fill, bold: !!(cell.font && cell.font.bold), fc: cell.font && cell.font.color && cell.font.color.argb });
      }
      headerRows.push({ r, h: row.height || null, cells });
    }
    // title row as flat list of all headers (row 3 usually)
    const titles = [];
    for (let c = 1; c <= maxC; c++) {
      const cell = ws.getRow(3).getCell(c);
      let text = '';
      const v = cell.value;
      if (v == null) text = '';
      else if (typeof v === 'object' && v.richText) text = v.richText.map(t => t.text).join('');
      else if (typeof v === 'object' && v.text) text = String(v.text);
      else text = String(v);
      titles.push({ col: c, title: text });
    }
    // also try row 1 and 2 for group headers
    const row1 = [], row2 = [];
    for (let c = 1; c <= maxC; c++) {
      for (const [arr, rn] of [[row1,1],[row2,2]]) {
        const cell = ws.getRow(rn).getCell(c);
        const v = cell.value;
        let text = '';
        if (v == null) text = '';
        else if (typeof v === 'object' && v.richText) text = v.richText.map(t => t.text).join('');
        else if (typeof v === 'object' && v.text) text = String(v.text);
        else text = String(v);
        if (text) arr.push({ col: c, title: text });
      }
    }
    // sample data rows 4-6
    const samples = [];
    for (let r = 4; r <= Math.min(6, ws.actualRowCount || 4); r++) {
      const vals = [];
      for (let c = 1; c <= maxC; c++) {
        const cell = ws.getRow(r).getCell(c);
        const v = cell.value;
        let text = '';
        if (v == null || v === '') continue;
        else if (typeof v === 'object' && v.richText) text = v.richText.map(t => t.text).join('');
        else if (typeof v === 'object' && v.text) text = String(v.text);
        else if (v instanceof Date) text = v.toISOString();
        else text = String(v);
        if (text) vals.push({ c, text: text.slice(0,80) });
      }
      samples.push({ r, vals });
    }
    const widths = [];
    for (let c = 1; c <= maxC; c++) {
      const col = ws.getColumn(c);
      widths.push({ c, w: col.width || null });
    }
    out.sheets.push({
      name: ws.name,
      actualRowCount: ws.actualRowCount,
      actualColumnCount: ws.actualColumnCount,
      merges: (ws.model && ws.model.merges) || [],
      autoFilter: ws.autoFilter || null,
      row1Groups: row1,
      row2Groups: row2,
      row3Titles: titles.filter(t => t.title),
      headerRows,
      samples,
      widths: widths.filter(x => x.w),
    });
  }
  fs.writeFileSync('docs/templates/ORD20xxx-structure.json', JSON.stringify(out, null, 2));
  console.log('sheets:', out.sheets.map(s => s.name + ' cols=' + s.actualColumnCount + ' rows=' + s.actualRowCount).join(' | '));
  for (const s of out.sheets) {
    console.log('\n===', s.name, '===');
    console.log('merges:', JSON.stringify(s.merges));
    console.log('row1:', JSON.stringify(s.row1Groups));
    console.log('row2:', JSON.stringify(s.row2Groups));
    console.log('row3 titles:');
    s.row3Titles.forEach(t => console.log('  col', t.col, '=', t.title));
    console.log('sample row4:', JSON.stringify(s.samples[0] || null));
  }
})().catch(e => { console.error(e); process.exit(1); });
