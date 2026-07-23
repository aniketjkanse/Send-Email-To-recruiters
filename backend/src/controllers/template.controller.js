const { readTemplate, saveTemplate } = require('../services/template.service');
function getTemplate(req, res) { return res.json(readTemplate()); }
function updateTemplate(req, res) { const updated = saveTemplate(req.body); return res.json({ message: 'Email template saved successfully', template: updated }); }
module.exports = { getTemplate, updateTemplate };
