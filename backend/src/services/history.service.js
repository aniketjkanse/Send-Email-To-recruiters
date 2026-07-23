const fs = require('fs');
const ExcelJS = require('exceljs');
const { SEND_HISTORY_FILE } = require('../utils/path.util');
async function appendHistory(records) {
  const workbook = new ExcelJS.Workbook();
  let sheet;
  if (fs.existsSync(SEND_HISTORY_FILE)) { await workbook.xlsx.readFile(SEND_HISTORY_FILE); sheet = workbook.getWorksheet('Send History'); }
  if (!sheet) { sheet = workbook.addWorksheet('Send History'); sheet.columns = [{ header:'Email', key:'email', width:42 }, { header:'Status', key:'status', width:18 }, { header:'Reason', key:'reason', width:50 }, { header:'Sent At', key:'sentAt', width:30 }]; }
  records.forEach(record => sheet.addRow({ email: record.email, status: record.status, reason: record.reason || '', sentAt: record.sentAt || new Date().toISOString() }));
  await workbook.xlsx.writeFile(SEND_HISTORY_FILE);
}
module.exports = { appendHistory };
