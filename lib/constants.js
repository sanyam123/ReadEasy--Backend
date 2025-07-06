export const CONFIG = {
  // Article limits
  MAX_ARTICLES_PER_USER: 3,
  MAX_ARTICLE_SIZE: 50000, // 50KB max content
  MAX_TITLE_LENGTH: 200,
  
  // Cache durations (in seconds)
  USER_CACHE_TTL: 3600, // 1 hour
  ARTICLE_CACHE_TTL: 86400, // 24 hours
  
  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  
  // OpenAI
  OPENAI_MODEL: 'gpt-3.5-turbo',
  MAX_SUMMARY_TOKENS: 100,
  SUMMARY_WORD_COUNT: 60,
  
  // JWT
  JWT_EXPIRY: '24h',
  
  // Validation
  URL_REGEX: /^https?:\/\/.+/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500
};

export const ERROR_MESSAGES = {
  INVALID_TOKEN: 'Invalid or expired authentication token',
  USER_NOT_FOUND: 'User not found',
  ARTICLE_NOT_FOUND: 'Article not found',
  MAX_ARTICLES_REACHED: 'Maximum number of articles reached (3 limit)',
  INVALID_INPUT: 'Invalid input provided',
  ARTICLE_TOO_LARGE: 'Article content too large',
  DUPLICATE_ARTICLE: 'Article already saved',
  RATE_LIMITED: 'Too many requests, please try again later',
  SERVER_ERROR: 'Internal server error'
};