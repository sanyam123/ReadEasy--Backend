import { AuthService } from '../../lib/auth.js';
import { Database } from '../../lib/database.js';
import { validateUser } from '../../lib/validation.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../lib/constants.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
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
    
    const { text, articleId } = req.body;
    
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length < 100) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Article text is required (minimum 100 characters)'
      });
    }
    
    // Limit text size to prevent excessive API costs
    const truncatedText = text.substring(0, 4000);
    
    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: CONFIG.OPENAI_MODEL,
      messages: [{
        role: 'system',
        content: `You are a skilled editor who creates concise, informative summaries. Create a summary that captures the key points and main arguments of the article.`
      }, {
        role: 'user',
        content: `Summarize this article in exactly ${CONFIG.SUMMARY_WORD_COUNT} words, focusing on the most important information and key takeaways:\n\n${truncatedText}`
      }],
      max_tokens: CONFIG.MAX_SUMMARY_TOKENS,
      temperature: 0.3
    });
    
    const summary = completion.choices[0].message.content.trim();
    
    // If articleId provided, update the article with summary
    if (articleId) {
      const { user } = auth;
      const article = await Database.getArticle(articleId);
      
      if (article && article.user_id === user.id) {
        await Database.updateArticle(articleId, { summary });
      }
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      summary,
      word_count: summary.split(' ').length,
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Summarize error:', error);
    
    if (error.code === 'insufficient_quota') {
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        error: 'AI service temporarily unavailable'
      });
    }
    
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_MESSAGES.SERVER_ERROR
    });
  }
}