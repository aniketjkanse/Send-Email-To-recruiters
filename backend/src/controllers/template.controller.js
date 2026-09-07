const fs = require('fs');

const {
  readTemplate,
  saveTemplate,
  listTemplates,
  createTemplate,
  deleteTemplate,
  setActiveTemplate
} = require('../services/template.service');

const {
  saveResume,
  deleteResume: removeResumeFile
} = require('../services/resume.service');

function getTemplate(req, res) {
  return res.json(readTemplate());
}

function updateTemplate(req, res) {
  const updated = saveTemplate(req.body);
  return res.json({ message: 'Email template saved successfully', template: updated });
}

function getTemplateList(req, res) {
  return res.json(listTemplates());
}

function addTemplate(req, res) {
  try {
    return res.json({ message: 'Template created', ...createTemplate(req.body || {}) });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

function removeTemplate(req, res) {
  try {
    return res.json({ message: 'Template deleted', ...deleteTemplate(req.params.id) });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

function activateTemplate(req, res) {
  try {
    return res.json({ message: 'Template activated', ...setActiveTemplate(req.params.id) });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
}

function uploadTemplateResume(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Resume file is required' });
  }

  try {
    const info = saveResume(
      req.params.id,
      req.file.path,
      req.file.originalname
    );

    fs.unlinkSync(req.file.path);

    return res.json({
      message: 'Resume attached to template',
      resumeName: info.originalName,
      ...listTemplates()
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

function deleteTemplateResume(req, res) {
  try {
    removeResumeFile(req.params.id);

    return res.json({
      message: 'Resume removed from template',
      ...listTemplates()
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  getTemplate,
  updateTemplate,
  getTemplateList,
  addTemplate,
  removeTemplate,
  activateTemplate,
  uploadTemplateResume,
  deleteTemplateResume
};
