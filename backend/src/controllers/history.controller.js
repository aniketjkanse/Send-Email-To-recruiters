const fs = require('fs');
const ExcelJS = require('exceljs');
const { SEND_HISTORY_FILE } = require('../utils/path.util');

function downloadHistory(req, res) { if (!fs.existsSync(SEND_HISTORY_FILE)) return res.status(404).json({ message:'History file not found yet' }); return res.download(SEND_HISTORY_FILE, 'send_history.xlsx'); }

async function getHistoryJson(req, res) {
  if (!fs.existsSync(SEND_HISTORY_FILE)) {
    return res.json({ records: [] });
  }

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
}

module.exports = { downloadHistory, getHistoryJson };
