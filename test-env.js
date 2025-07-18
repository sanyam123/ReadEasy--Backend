import dotenv from 'dotenv';
dotenv.config();

console.log('=== Environment Variables Check ===');
console.log('KV_URL:', process.env.KV_URL ? '✅ Found' : '❌ Missing');
console.log('KV_REST_API_URL:', process.env.KV_REST_API_URL ? '✅ Found' : '❌ Missing');
console.log('KV_REST_API_TOKEN:', process.env.KV_REST_API_TOKEN ? '✅ Found' : '❌ Missing');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Found' : '❌ Missing');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Found' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Found' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('=====================================');