const express = require('express');
const multer = require('multer');

const { UPLOAD_DIR } = require('../utils/path.util');
const { ensureDir } = require('../utils/file.util');

const {
  getTemplate,
  updateTemplate,
  getTemplateList,
  addTemplate,
  removeTemplate,
  activateTemplate,
  uploadTemplateResume,
  deleteTemplateResume
} = require('../controllers/template.controller');

ensureDir(UPLOAD_DIR);

const upload = multer({ dest: UPLOAD_DIR });

const router = express.Router();

router.get('/', getTemplate);
router.post('/', updateTemplate);

router.get('/list', getTemplateList);
router.post('/list', addTemplate);

router.post('/:id/activate', activateTemplate);
router.post('/:id/resume', upload.single('resume'), uploadTemplateResume);
router.delete('/:id/resume', deleteTemplateResume);
router.delete('/:id', removeTemplate);

module.exports = router;
