import { AuthService } from '../../lib/auth.js';
import { Database } from '../../lib/database.js';
import { validateArticle, sanitizeInput } from '../../lib/validation.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../lib/constants.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const rateLimitOk = await Database.checkRateLimit(clientIP);
    if (!rateLimitOk) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        error: ERROR_MESSAGES.RATE_LIMITED
      });
    }
    
    // Authenticate user
    const auth = await AuthService.authenticateRequest(req);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }
    
    const { user } = auth;
    
    // Validate article data
    const articleData = {
      title: sanitizeInput(req.body.title),
      url: sanitizeInput(req.body.url),
      website: sanitizeInput(req.body.website),
      content: req.body.content, // Don't sanitize content as it's HTML
      summary: sanitizeInput(req.body.summary),
      highlights: req.body.highlights || [],
      byline: sanitizeInput(req.body.byline),
      reading_time: req.body.reading_time
    };
    
    const validation = validateArticle(articleData);
    if (!validation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.INVALID_INPUT,
        details: validation.errors
      });
    }
    
    // Save article
    const savedArticle = await Database.saveArticle(user.id, articleData);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Article saved successfully',
      article: {
        id: savedArticle.id,
        title: savedArticle.title,
        url: savedArticle.url,
        website: savedArticle.website,
        saved_at: savedArticle.saved_at
      }
    });
    
  } catch (error) {
    console.error('Save article error:', error);
    
    if (error.message === ERROR_MESSAGES.MAX_ARTICLES_REACHED) {
      return res.status(HTTP_STATUS.CONFLICT).json({ error: error.message });
    }
    
    if (error.message === ERROR_MESSAGES.DUPLICATE_ARTICLE) {
      return res.status(HTTP_STATUS.CONFLICT).json({ error: error.message });
    }
    
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_MESSAGES.SERVER_ERROR
    });
  }
}