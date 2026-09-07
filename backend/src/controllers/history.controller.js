const fs = require('fs');
const ExcelJS = require('exceljs');
const { workspaceFile } = require('../utils/workspace.util');

function downloadHistory(req, res) {
  const file = workspaceFile('send_history.xlsx');
  if (!fs.existsSync(file)) return res.status(404).json({ message:'History file not found yet' });
  return res.download(file, 'send_history.xlsx');
}

async function getHistoryJson(req, res) {
  const SEND_HISTORY_FILE = workspaceFile('send_history.xlsx');

  if (!fs.existsSync(SEND_HISTORY_FILE) || fs.statSync(SEND_HISTORY_FILE).size === 0) {
    return res.json({ records: [] });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(SEND_HISTORY_FILE);
    const sheet = workbook.getWorksheet('Send History');

    if (!sheet) {
      return res.json({ records: [] });
    }

    const headerRow = sheet.getRow(1).values.map(v => String(v || '').trim());
    const records = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = row.values;
      const record = {};
      headerRow.forEach((header, idx) => {
        if (!header) return;
        const key = header.replace(/\s+/g, '').replace(/^./, c => c.toLowerCase());
        record[key] = values[idx] ?? '';
      });
      records.push(record);
    });

    records.reverse();

    return res.json({ records });
  } catch (err) {
    // Corrupted / half-written workbook — do not crash the server.
    console.error('Failed to read send history workbook:', err.message);
    return res.json({ records: [], error: 'history_unreadable' });
  }
}

module.exports = { downloadHistory, getHistoryJson };
