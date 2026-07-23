const express = require('express'); const multer = require('multer');
const { UPLOAD_DIR } = require('../utils/path.util'); const { ensureDir } = require('../utils/file.util');
const { uploadEmails, uploadResume } = require('../controllers/upload.controller');
ensureDir(UPLOAD_DIR); const upload = multer({ dest: UPLOAD_DIR }); const router = express.Router();
router.post('/emails', upload.single('emailsFile'), uploadEmails); router.post('/resume', upload.single('resume'), uploadResume); module.exports = router;
