import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../database/connection';
import { User, Session } from '@repo-guardian/shared';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}

/**
 * Authentication middleware
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip auth in demo mode for certain endpoints
    if (process.env.DEMO_MODE === 'true' && isDemoEndpoint(req.path)) {
      // Create a demo user for demo mode
      req.user = {
        id: 'demo-user-id',
        username: 'demo-user',
        email: 'demo@example.com',
        avatarUrl: 'https://github.com/identicons/demo-user.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header with Bearer token is required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sessionId: string };

    // Get session from database
    const session = await queryOne<Session & { user_id: string; expires_at: string }>(
      'SELECT * FROM sessions WHERE id = ? AND token = ?',
      [decoded.sessionId, token]
    );

    if (!session) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Session not found or token mismatch',
      });
      return;
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Session has expired, please login again',
      });
      return;
    }

    // Get user from database
    const user = await queryOne<User & { created_at: string; updated_at: string }>(
      'SELECT * FROM users WHERE id = ?',
      [session.user_id]
    );

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'User associated with session not found',
      });
      return;
    }

    // Convert database fields to proper types
    req.user = {
      id: user.id,
      githubId: user.github_id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatar_url,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),
    };

    req.session = {
      id: session.id,
      userId: session.user_id,
      token: session.token,
      expiresAt: new Date(session.expires_at),
      createdAt: new Date(session.created_at),
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'JWT token is malformed or invalid',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred during authentication',
    });
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    // Try to authenticate, but don't fail if it doesn't work
    await authMiddleware(req, res, (error) => {
      if (error) {
        // Clear any partial auth data and continue
        req.user = undefined;
        req.session = undefined;
      }
      next();
    });
  } catch (error) {
    // Ignore auth errors in optional mode
    next();
  }
}

/**
 * Check if endpoint should bypass auth in demo mode
 */
function isDemoEndpoint(path: string): boolean {
  const demoEndpoints = [
    '/repositories',
    '/analysis',
    '/chat',
  ];
  
  return demoEndpoints.some(endpoint => path.startsWith(endpoint));
}

/**
 * Middleware to require admin privileges
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'You must be logged in to access this resource',
    });
    return;
  }

  // In a real app, you'd check user roles/permissions
  // For demo purposes, we'll allow all authenticated users
  next();
}

/**
 * Middleware to check repository access permissions
 */
export async function checkRepositoryAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const repositoryId = req.params.repositoryId || req.body.repositoryId;
    
    if (!repositoryId) {
      res.status(400).json({
        success: false,
        error: 'Repository ID required',
        message: 'Repository ID must be provided',
      });
      return;
    }

    // In demo mode, allow access to demo repository
    if (process.env.DEMO_MODE === 'true') {
      next();
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access repositories',
      });
      return;
    }

    // Check if user has access to this repository
    const repository = await queryOne(
      'SELECT id FROM repositories WHERE id = ? AND user_id = ?',
      [repositoryId, req.user.id]
    );

    if (!repository) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this repository',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Repository access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Access check failed',
      message: 'An error occurred while checking repository access',
    });
  }
}