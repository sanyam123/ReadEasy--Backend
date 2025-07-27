import { AuthService } from '../../lib/auth.js';
import { Database } from '../../lib/database.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../lib/constants.js';
import { handleCORS } from '../../lib/cors.js';

export default async function handler(req, res) {
  // Handle CORS
  if (handleCORS(req, res)) {
    return; // Preflight request handled
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Authenticate user
    const auth = await AuthService.authenticateRequest(req);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }
    
    const { user } = auth;
    
    // Get user's articles (summary data)
    const articles = await Database.getUserArticles(user.id);
    
    // ALWAYS fetch full article details including content and highlights
    const responseArticles = await Promise.all(
      articles.map(async (article) => {
        const fullArticle = await Database.getArticle(article.id);
        return fullArticle || article;
      })
    );
    
    // Add highlights summary to response
    const articlesWithHighlightInfo = responseArticles.map(article => ({
      ...article,
      highlights_count: article.highlights ? article.highlights.length : 0,
      has_highlights: article.highlights && article.highlights.length > 0,
      last_highlighted: article.lastHighlighted || null
    }));
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      articles: articlesWithHighlightInfo,
      count: articles.length,
      max_articles: 3,
      total_highlights: articlesWithHighlightInfo.reduce((total, article) => total + (article.highlights_count || 0), 0)
    });
    
  } catch (error) {
    console.error('List articles error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_MESSAGES.SERVER_ERROR
    });
  }
}