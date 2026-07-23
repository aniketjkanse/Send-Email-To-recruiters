const fs = require('fs');
const { SEND_HISTORY_FILE } = require('../utils/path.util');
function downloadHistory(req, res) { if (!fs.existsSync(SEND_HISTORY_FILE)) return res.status(404).json({ message:'History file not found yet' }); return res.download(SEND_HISTORY_FILE, 'send_history.xlsx'); }
module.exports = { downloadHistory };
