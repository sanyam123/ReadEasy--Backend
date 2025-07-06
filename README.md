# ReadEasy Backend API

A serverless backend for the ReadEasy Chrome extension, providing article storage, cross-device sync, and AI-powered summarization.

## 🚀 Features

- **User Authentication**: Google OAuth integration with JWT tokens
- **Article Management**: Save, retrieve, and delete articles (3 per user)
- **Cross-Device Sync**: Access saved articles from any device  
- **AI Summarization**: Generate 60-word summaries using OpenAI GPT-3.5
- **Rate Limiting**: Protect against abuse
- **Data Validation**: Comprehensive input validation and sanitization

## 🛠️ Tech Stack

- **Platform**: Vercel Serverless Functions
- **Database**: Vercel KV (Redis)
- **Authentication**: Google OAuth 2.0 + JWT
- **AI**: OpenAI GPT-3.5-turbo
- **Runtime**: Node.js 18+

## 📡 API Endpoints

### Authentication
- `POST /api/auth/google` - Authenticate with Google OAuth token

### Articles
- `GET /api/articles/list` - Get user's saved articles
- `GET /api/articles/list?detailed=true` - Get articles with full content
- `POST /api/articles/save` - Save a new article
- `DELETE /api/articles/delete?articleId=xyz` - Delete an article
- `POST /api/articles/sync` - Sync local articles with cloud

### AI Features
- `POST /api/summarize` - Generate article summary

### Utility
- `GET /api/health` - Health check endpoint

## 🔧 Environment Variables

Required environment variables in Vercel:

```
OPENAI_API_KEY=sk-...                    # OpenAI API key
GOOGLE_CLIENT_ID=...                     # Google OAuth client ID  
JWT_SECRET=your-super-secret-jwt-key     # JWT signing secret
KV_REST_API_URL=...                      # Vercel KV URL (auto-provided)
KV_REST_API_TOKEN=...                    # Vercel KV token (auto-provided)
```

## 🚀 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   # Create .env.local
   OPENAI_API_KEY=sk-your-key-here
   GOOGLE_CLIENT_ID=your-client-id
   JWT_SECRET=your-jwt-secret
   ```

3. **Start local server:**
   ```bash
   vercel dev
   ```

4. **Test endpoints:**
   ```bash
   node test-local.js
   ```

## 🌐 Deployment

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login and link project:**
   ```bash
   vercel login
   vercel link
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

## 📊 Rate Limits

- 60 requests per minute per IP
- 3 articles maximum per user
- Article content limited to 50KB
- Summary requests limited to authenticated users

## 🔒 Security Features

- JWT token authentication
- Google OAuth token verification
- Input validation and sanitization
- Rate limiting per IP
- CORS headers for extension compatibility
- User data isolation

## 📋 Database Schema

### Users
```javascript
{
  id: "user_timestamp_random",
  email: "user@example.com",
  name: "User Name",
  google_id: "google_user_id", 
  picture: "profile_image_url",
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
  article_count: 0
}
```

### Articles
```javascript
{
  id: "article_timestamp_random",
  user_id: "user_id",
  title: "Article Title",
  url: "https://example.com/article",
  website: "Example Site",
  content: "<html>Article content...</html>",
  summary: "60-word AI summary...",
  highlights: [
    {
      id: "highlight_id",
      text: "highlighted text", 
      color: "#ffff00",
      created_at: "2025-01-01T00:00:00.000Z"
    }
  ],
  byline: "Author Name",
  reading_time: 5,
  saved_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z"
}
```

## 💰 Cost Estimation

### Vercel Free Tier
- 100 function executions/day
- 100GB bandwidth/month
- **Cost**: Free

### Vercel KV Free Tier  
- 30K requests/month
- 256MB storage
- **Cost**: Free

### OpenAI API
- GPT-3.5-turbo: ~$0.001 per summary
- 1000 summaries: ~$1
- **Cost**: Pay-per-use

### Total for 1000 users: ~$10/month

## 🧪 Testing

### Test Health Endpoint
```bash
curl http://localhost:3000/api/health
```

### Test Authentication
```javascript
fetch('http://localhost:3000/api/auth/google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken: 'test-token' })
})
```

### Test Article Saving
```javascript
fetch('http://localhost:3000/api/articles/save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    title: 'Test Article',
    url: 'https://example.com',
    website: 'Example',
    content: 'Article content...'
  })
})
```

## 🐛 Troubleshooting

### Common Issues

**Environment Variables Not Working**
- Ensure `.env.local` exists and has correct values
- Restart `vercel dev` after changes

**Database Connection Fails**
- Verify KV credentials in Vercel dashboard
- Check environment variables are set to "Production"

**OpenAI API Errors**
- Verify API key is valid and has credits
- Check for quota limits

**CORS Errors**
- CORS headers are already configured in all endpoints
- Ensure you're calling the correct URL

### Debug Logs

View function logs in real-time:
```bash
vercel dev --debug
```

View production logs:
- Go to Vercel dashboard
- Click on your project
- View "Functions" tab for logs

## 📞 Support

For issues with this backend:
1. Check the troubleshooting section
2. Review Vercel function logs
3. Test endpoints with the provided test script

## 📄 License

MIT License - see LICENSE file for details