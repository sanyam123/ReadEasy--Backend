import dotenv from 'dotenv';
dotenv.config();

import { AuthService } from '../../lib/auth.js';
import { Database } from '../../lib/database.js';
import { validateUser } from '../../lib/validation.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../lib/constants.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('🔐 Authentication request received');
    
    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const rateLimitOk = await Database.checkRateLimit(clientIP);
    if (!rateLimitOk) {
      console.log('❌ Rate limit exceeded for IP:', clientIP);
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        error: ERROR_MESSAGES.RATE_LIMITED
      });
    }
    
    // Get data from request
    const { accessToken, userInfo } = req.body;
    
    console.log('📝 Received auth data:', {
      hasAccessToken: !!accessToken,
      userEmail: userInfo?.email,
      userName: userInfo?.name
    });
    
    if (!accessToken || !userInfo) {
      console.log('❌ Missing required fields');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Access token and user info are required'
      });
    }
    
    // Verify the Google access token by checking user info
    console.log('🔍 Verifying Google access token...');
    const googleResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
    
    if (!googleResponse.ok) {
      console.log('❌ Google token verification failed');
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Invalid Google access token'
      });
    }
    
    const verifiedUserInfo = await googleResponse.json();
    
    // Make sure the verified info matches what was sent
    if (verifiedUserInfo.email !== userInfo.email) {
      console.log('❌ Token/user info mismatch');
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Token does not match user information'
      });
    }
    
    console.log('✅ Google token verified successfully');
    
    // Validate user data
    const userData = {
      email: verifiedUserInfo.email,
      name: verifiedUserInfo.name,
      google_id: verifiedUserInfo.id,
      picture: verifiedUserInfo.picture
    };
    
    const validation = validateUser(userData);
    if (!validation.isValid) {
      console.log('❌ User data validation failed:', validation.errors);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.INVALID_INPUT,
        details: validation.errors
      });
    }
    
    // Check if user already exists
    console.log('🔍 Checking if user exists...');
    let user = await Database.getUserByGoogleId(userData.google_id);
    
    if (!user) {
      // Create new user
      console.log('👤 Creating new user...');
      user = await Database.createUser(userData);
      console.log('✅ New user created:', user.email);
    } else {
      // Update existing user info (in case name/picture changed)
      console.log('👤 Updating existing user...');
      user = await Database.updateUser(userData.google_id, {
        name: userData.name,
        picture: userData.picture,
        email: userData.email
      });
      console.log('✅ User updated:', user.email);
    }
    
    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const jwtPayload = {
      google_id: user.google_id,
      user_id: user.id,
      email: user.email,
      name: user.name
    };
    
    const jwtToken = AuthService.generateJWT(jwtPayload);
    console.log('✅ JWT token generated successfully');
    
    // Return success response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Authentication successful',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        created_at: user.created_at
      }
    });
    
    console.log('🎉 Authentication completed successfully for:', user.email);
    
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: ERROR_MESSAGES.SERVER_ERROR
    });
  }
}