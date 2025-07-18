import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { CONFIG, ERROR_MESSAGES, HTTP_STATUS } from './constants.js';
import { Database } from './database.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  static async verifyGoogleToken(idToken) {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      return ticket.getPayload();
    } catch (error) {
      console.error('Google token verification failed:', error);
      return null;
    }
  }
  
  static generateJWT(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: CONFIG.JWT_EXPIRY 
    });
  }
  
  static verifyJWT(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
  
  static async authenticateRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: ERROR_MESSAGES.INVALID_TOKEN, status: HTTP_STATUS.UNAUTHORIZED };
    }
    
    const token = authHeader.substring(7);
    const decoded = this.verifyJWT(token);
    
    if (!decoded) {
      return { error: ERROR_MESSAGES.INVALID_TOKEN, status: HTTP_STATUS.UNAUTHORIZED };
    }
    
    // Get user from database
    const user = await Database.getUserByGoogleId(decoded.google_id);
    if (!user) {
      return { error: ERROR_MESSAGES.USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND };
    }
    
    return { user };
  }
}