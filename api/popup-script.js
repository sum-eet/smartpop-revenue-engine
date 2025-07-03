// Vercel serverless function to serve popup script without auth
const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Read the popup script from public folder
    const scriptPath = path.join(process.cwd(), 'public', 'popup-script.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    res.status(200).send(scriptContent);
  } catch (error) {
    console.error('Error serving popup script:', error);
    res.status(500).send(`console.error('Failed to load SmartPop script: ${error.message}');`);
  }
}