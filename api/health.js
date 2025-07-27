import { handleCORS } from '../lib/cors.js';

export default async function handler(req, res) {
  // Handle CORS
  if (handleCORS(req, res)) {
    return; // Preflight request handled
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      cors: 'enabled'
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
}