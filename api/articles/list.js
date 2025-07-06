import { AuthService } from '../../lib/auth.js';
import { Database } from '../../lib/database.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../lib/constants.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    
    // Get user's articles
    const articles = await Database.getUserArticles(user.id);
    
    // Get detailed flag from query params
    const includeContent = req.query.detailed === 'true';
    
    let responseArticles = articles;
    
    if (includeContent) {
      // Fetch full article details
      responseArticles = await Promise.all(
        articles.map(async (article) => {
          const fullArticle = await Database.getArticle(article.id);
          return fullArticle || article;
        })
      );
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      articles: responseArticles,
      count: articles.length,
      max_articles: 3
    });
    
  } catch (error) {
    console.error('List articles error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_MESSAGES.SERVER_ERROR
    });
  }
}