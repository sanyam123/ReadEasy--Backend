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
    // Authenticate user
    const auth = await AuthService.authenticateRequest(req);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }
    
    const { user } = auth;
    const { localArticles = [] } = req.body;
    
    // Get current cloud articles
    const cloudArticles = await Database.getUserArticles(user.id);
    
    // Find articles that exist locally but not in cloud
    const cloudUrls = new Set(cloudArticles.map(a => a.url));
    const newLocalArticles = localArticles.filter(article => !cloudUrls.has(article.url));
    
    // Sync new local articles to cloud (respecting 3-article limit)
    const syncResults = [];
    const remainingSlots = 3 - cloudArticles.length;
    const articlesToSync = newLocalArticles.slice(0, remainingSlots);
    
    for (const localArticle of articlesToSync) {
      try {
        const validation = validateArticle(localArticle);
        if (validation.isValid) {
          const sanitizedArticle = {
            title: sanitizeInput(localArticle.title),
            url: sanitizeInput(localArticle.url),
            website: sanitizeInput(localArticle.website),
            content: localArticle.content,
            summary: sanitizeInput(localArticle.summary),
            highlights: localArticle.highlights || [],
            byline: sanitizeInput(localArticle.byline),
            reading_time: localArticle.reading_time
          };
          
          const savedArticle = await Database.saveArticle(user.id, sanitizedArticle);
          syncResults.push({
            url: localArticle.url,
            status: 'synced',
            article_id: savedArticle.id
          });
        } else {
          syncResults.push({
            url: localArticle.url,
            status: 'invalid',
            errors: validation.errors
          });
        }
      } catch (error) {
        syncResults.push({
          url: localArticle.url,
          status: 'error',
          error: error.message
        });
      }
    }
    
    // Get updated cloud articles
    const updatedCloudArticles = await Database.getUserArticles(user.id);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Sync completed',
      cloud_articles: updatedCloudArticles,
      sync_results: syncResults,
      skipped_count: newLocalArticles.length - articlesToSync.length
    });
    
  } catch (error) {
    console.error('Sync articles error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_MESSAGES.SERVER_ERROR
    });
  }
}