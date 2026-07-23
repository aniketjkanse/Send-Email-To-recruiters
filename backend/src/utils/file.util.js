const fs = require('fs');
const path = require('path');
function ensureDir(directoryPath) { if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true }); }
function readJson(filePath, fallbackValue) { if (!fs.existsSync(filePath)) return fallbackValue; const content = fs.readFileSync(filePath, 'utf-8'); if (!content.trim()) return fallbackValue; return JSON.parse(content); }
function writeJson(filePath, value) { ensureDir(path.dirname(filePath)); fs.writeFileSync(filePath, JSON.stringify(value, null, 2)); }
function readTextLines(filePath) { if (!fs.existsSync(filePath)) return []; return fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).map(item => item.trim()).filter(Boolean); }
function writeText(filePath, content) { ensureDir(path.dirname(filePath)); fs.writeFileSync(filePath, content); }
module.exports = { ensureDir, readJson, writeJson, readTextLines, writeText };
