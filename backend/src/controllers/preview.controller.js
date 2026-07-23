const { readTemplate } = require('../services/template.service');
const { buildEmailPreview } = require('../services/emailFilter.service');
function getPreview(req, res) { const template = readTemplate(); return res.json(buildEmailPreview(template)); }
module.exports = { getPreview };
