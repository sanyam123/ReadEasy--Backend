import { CONFIG, ERROR_MESSAGES } from './constants.js';

export function validateUser(user) {
  const errors = [];
  
  if (!user.email || !CONFIG.EMAIL_REGEX.test(user.email)) {
    errors.push('Valid email is required');
  }
  
  if (!user.name || user.name.trim().length < 1) {
    errors.push('Name is required');
  }
  
  if (!user.google_id || user.google_id.trim().length < 1) {
    errors.push('Google ID is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateArticle(article) {
  const errors = [];
  
  if (!article.title || article.title.trim().length < 1) {
    errors.push('Title is required');
  }
  
  if (article.title && article.title.length > CONFIG.MAX_TITLE_LENGTH) {
    errors.push(`Title too long (max ${CONFIG.MAX_TITLE_LENGTH} characters)`);
  }
  
  if (!article.url || !CONFIG.URL_REGEX.test(article.url)) {
    errors.push('Valid URL is required');
  }
  
  if (!article.content || article.content.trim().length < 100) {
    errors.push('Article content is required (minimum 100 characters)');
  }
  
  if (article.content && article.content.length > CONFIG.MAX_ARTICLE_SIZE) {
    errors.push('Article content too large');
  }
  
  if (!article.website || article.website.trim().length < 1) {
    errors.push('Website name is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove basic HTML brackets
    .substring(0, 10000); // Limit length
}