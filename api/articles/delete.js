import { AuthService } from '../../lib/auth.js';
import { Database } from '../../lib/database.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../lib/constants.js';
import { handleCORS } from '../../lib/cors.js';

export default async function handler(req, res) {
  // Handle CORS
  if (handleCORS(req, res)) {
    return; // Preflight request handled
  }
  
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Authenticate user
    const auth = await AuthService.authenticateRequest(req);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }
    
    const { user } = auth;
    
    // Get article ID from query params
    const { articleId } = req.query;
    
    if (!articleId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Article ID is required'
      });
    }
    
    // Delete article
    const deleted = await Database.deleteArticle(user.id, articleId);
    
    if (!deleted) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: ERROR_MESSAGES.ARTICLE_NOT_FOUND
      });
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Article deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_MESSAGES.SERVER_ERROR
    });
  }
}