import express from 'express';
import nano from 'nano';
import cors from 'cors';
import path from 'path';
import { asAsset } from '../common/types';
import { appPort } from '../common/values';
import { config } from '../config';

const app = express();

// Enable CORS
app.use(cors());

const couch = nano(config.couchDbFullpath);
const db = couch.use('snackbar_assets');

// Cleaner for the Asset type
app.get('/api/assets', async (req, res) => {
  try {
    const response = await db.list({ include_docs: true });
    const assets = response.rows.map(row => asAsset(row.doc));
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

app.use(express.static(path.join(__dirname, '../../dist')));

// Add this to handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

app.listen(appPort, () => {
  console.log(`Server running at http://localhost:${appPort}`);
}); 