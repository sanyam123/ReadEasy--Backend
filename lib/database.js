import { kv } from '@vercel/kv';
import { CONFIG, ERROR_MESSAGES } from './constants.js';

// Database key patterns
const KEYS = {
  user: (googleId) => `user:${googleId}`,
  userArticles: (userId) => `user_articles:${userId}`,
  article: (articleId) => `article:${articleId}`,
  userByEmail: (email) => `user_email:${email}`,
  rateLimit: (ip) => `rate_limit:${ip}`
};

export class Database {
  // =======================
  // USER OPERATIONS
  // =======================
  
  static async createUser(userData) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id: userId,
      email: userData.email,
      name: userData.name,
      google_id: userData.google_id,
      picture: userData.picture || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      article_count: 0
    };
    
    // Store user by Google ID (primary lookup)
    await kv.set(KEYS.user(userData.google_id), user, { ex: CONFIG.USER_CACHE_TTL });
    
    // Store user by email (secondary lookup)
    await kv.set(KEYS.userByEmail(userData.email), userId, { ex: CONFIG.USER_CACHE_TTL });
    
    // Initialize empty articles list
    await kv.set(KEYS.userArticles(userId), [], { ex: CONFIG.ARTICLE_CACHE_TTL });
    
    return user;
  }
  
  static async getUserByGoogleId(googleId) {
    return await kv.get(KEYS.user(googleId));
  }
  
  static async getUserByEmail(email) {
    const userId = await kv.get(KEYS.userByEmail(email));
    if (!userId) return null;
    
    // Find user by iterating through potential Google IDs (fallback)
    // In production, you'd want a more efficient secondary index
    return null; // Simplified for this example
  }
  
  static async updateUser(googleId, updates) {
    const user = await this.getUserByGoogleId(googleId);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(KEYS.user(googleId), updatedUser, { ex: CONFIG.USER_CACHE_TTL });
    return updatedUser;
  }
  
  // =======================
  // ARTICLE OPERATIONS  
  // =======================
  
  static async saveArticle(userId, articleData) {
    // Check if user has reached article limit
    const existingArticles = await this.getUserArticles(userId);
    if (existingArticles.length >= CONFIG.MAX_ARTICLES_PER_USER) {
      throw new Error(ERROR_MESSAGES.MAX_ARTICLES_REACHED);
    }
    
    // Check for duplicate URL
    const isDuplicate = existingArticles.some(article => article.url === articleData.url);
    if (isDuplicate) {
      throw new Error(ERROR_MESSAGES.DUPLICATE_ARTICLE);
    }
    
    const articleId = `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const article = {
      id: articleId,
      user_id: userId,
      title: articleData.title,
      url: articleData.url,
      website: articleData.website,
      content: articleData.content,
      summary: articleData.summary || null,
      highlights: articleData.highlights || [],
      byline: articleData.byline || null,
      reading_time: articleData.reading_time || null,
      saved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Store individual article
    await kv.set(KEYS.article(articleId), article, { ex: CONFIG.ARTICLE_CACHE_TTL });
    
    // Update user's articles list
    const updatedArticles = [...existingArticles, {
      id: articleId,
      title: article.title,
      url: article.url,
      website: article.website,
      saved_at: article.saved_at
    }];
    
    await kv.set(KEYS.userArticles(userId), updatedArticles, { ex: CONFIG.ARTICLE_CACHE_TTL });
    
    return article;
  }
  
  static async getUserArticles(userId) {
    const articles = await kv.get(KEYS.userArticles(userId));
    return articles || [];
  }
  
  static async getArticle(articleId) {
    return await kv.get(KEYS.article(articleId));
  }
  
  static async deleteArticle(userId, articleId) {
    // Get article to verify ownership
    const article = await this.getArticle(articleId);
    if (!article || article.user_id !== userId) {
      return false;
    }
    
    // Remove from articles list
    const userArticles = await this.getUserArticles(userId);
    const updatedArticles = userArticles.filter(a => a.id !== articleId);
    
    // Update user's articles list
    await kv.set(KEYS.userArticles(userId), updatedArticles, { ex: CONFIG.ARTICLE_CACHE_TTL });
    
    // Delete individual article
    await kv.del(KEYS.article(articleId));
    
    return true;
  }
  
  static async updateArticle(articleId, updates) {
    const article = await this.getArticle(articleId);
    if (!article) return null;
    
    const updatedArticle = {
      ...article,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(KEYS.article(articleId), updatedArticle, { ex: CONFIG.ARTICLE_CACHE_TTL });
    return updatedArticle;
  }
  
  // =======================
  // RATE LIMITING
  // =======================
  
  static async checkRateLimit(ip) {
    const key = KEYS.rateLimit(ip);
    const current = await kv.get(key) || 0;
    
    if (current >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }
    
    await kv.set(key, current + 1, { ex: 60 }); // 1 minute expiry
    return true;
  }
}