require('dotenv').config();
const configRoutes = require('./routes/config.routes');
const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadRoutes = require('./routes/upload.routes');
const templateRoutes = require('./routes/template.routes');
const previewRoutes = require('./routes/preview.routes');
const sendRoutes = require('./routes/send.routes');
const historyRoutes = require('./routes/history.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', service: 'Job Outreach Email Scheduler API' });
});

app.use('/api/upload', uploadRoutes);
app.use('/api/template', templateRoutes);
app.use('/api/preview', previewRoutes);
app.use('/api/send', sendRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/config', configRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
