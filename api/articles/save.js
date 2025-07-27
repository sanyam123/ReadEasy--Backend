import { AuthService } from '../../lib/auth.js';
import { Database } from '../../lib/database.js';
import { validateArticle, sanitizeInput } from '../../lib/validation.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../lib/constants.js';
import { handleCORS } from '../../lib/cors.js';

export default async function handler(req, res) {
  // Handle CORS
  if (handleCORS(req, res)) {
    return; // Preflight request handled
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
      reading_time: req.body.reading_time,
      lastHighlighted: req.body.lastHighlighted || new Date().toISOString()
    };
    
    const validation = validateArticle(articleData);
    if (!validation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.INVALID_INPUT,
        details: validation.errors
      });
    }
    
    // Check if article already exists for this user
    const existingArticles = await Database.getUserArticles(user.id);
    const existingArticle = existingArticles.find(article => article.url === articleData.url);
    
    if (existingArticle) {
      // ARTICLE EXISTS - UPDATE with new highlights
      console.log('📝 Updating existing article with new highlights:', articleData.title);
      
      // Get full article data
      const fullExistingArticle = await Database.getArticle(existingArticle.id);
      if (!fullExistingArticle) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Article not found for update'
        });
      }
      
      // Update article with new highlights and content
      const updatedArticle = await Database.updateArticle(existingArticle.id, {
        content: articleData.content, // Updated content with all highlights
        highlights: articleData.highlights, // Updated highlights array
        lastHighlighted: articleData.lastHighlighted,
        byline: articleData.byline || fullExistingArticle.byline,
        reading_time: articleData.reading_time || fullExistingArticle.reading_time
      });
      
      if (!updatedArticle) {
        return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
          error: 'Failed to update article'
        });
      }
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Article updated successfully with new highlights',
        action: 'updated',
        article: {
          id: updatedArticle.id,
          title: updatedArticle.title,
          url: updatedArticle.url,
          website: updatedArticle.website,
          highlights_count: updatedArticle.highlights ? updatedArticle.highlights.length : 0,
          last_highlighted: updatedArticle.lastHighlighted,
          updated_at: updatedArticle.updated_at
        }
      });
      
    } else {
      // ARTICLE DOESN'T EXIST - CREATE new article
      console.log('🆕 Creating new article:', articleData.title);
      
      // Check user's article limit for new articles
      if (existingArticles.length >= 3) {
        return res.status(HTTP_STATUS.CONFLICT).json({ 
          error: ERROR_MESSAGES.MAX_ARTICLES_REACHED 
        });
      }
      
      // Save new article
      const savedArticle = await Database.saveArticle(user.id, articleData);
      
      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Article saved successfully',
        action: 'created',
        article: {
          id: savedArticle.id,
          title: savedArticle.title,
          url: savedArticle.url,
          website: savedArticle.website,
          highlights_count: savedArticle.highlights ? savedArticle.highlights.length : 0,
          saved_at: savedArticle.saved_at
        }
      });
    }
    
  } catch (error) {
    console.error('Save article error:', error);
    
    if (error.message === ERROR_MESSAGES.MAX_ARTICLES_REACHED) {
      return res.status(HTTP_STATUS.CONFLICT).json({ error: error.message });
    }
    
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_MESSAGES.SERVER_ERROR
    });
  }
}