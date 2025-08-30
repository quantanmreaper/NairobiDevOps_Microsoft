import { Router } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { generateId, generateToken } from '@repo-guardian/shared';
import { query, queryOne, execute } from '../database/connection';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GitHub OAuth login
 */
router.post('/github', asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    throw createApiError('Authorization code is required', 400);
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    throw createApiError('GitHub OAuth not configured', 500);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      throw createApiError('Failed to get access token from GitHub', 400);
    }

    // Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const githubUser = userResponse.data;

    // Check if user exists
    let user = await queryOne<any>(
      'SELECT * FROM users WHERE github_id = ?',
      [githubUser.id.toString()]
    );

    if (!user) {
      // Create new user
      const userId = generateId();
      await execute(`
        INSERT INTO users (id, github_id, username, email, avatar_url)
        VALUES (?, ?, ?, ?, ?)
      `, [
        userId,
        githubUser.id.toString(),
        githubUser.login,
        githubUser.email,
        githubUser.avatar_url,
      ]);

      user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
    }

    // Create session
    const sessionId = generateId();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await execute(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `, [sessionId, user.id, token, expiresAt.toISOString()]);

    // Create JWT
    const jwtToken = jwt.sign(
      { sessionId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatar_url,
        },
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    throw createApiError('GitHub authentication failed', 400);
  }
}));

/**
 * Demo login (when demo mode is enabled)
 */
router.post('/demo', asyncHandler(async (req, res) => {
  if (process.env.DEMO_MODE !== 'true') {
    throw createApiError('Demo mode is not enabled', 403);
  }

  // Get or create demo user
  let user = await queryOne<any>(
    'SELECT * FROM users WHERE username = ?',
    ['demo-user']
  );

  if (!user) {
    const userId = generateId();
    await execute(`
      INSERT INTO users (id, username, email, avatar_url)
      VALUES (?, ?, ?, ?)
    `, [
      userId,
      'demo-user',
      'demo@example.com',
      'https://github.com/identicons/demo-user.png',
    ]);

    user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
  }

  // Create session
  const sessionId = generateId();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await execute(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `, [sessionId, user.id, token, expiresAt.toISOString()]);

  // Create JWT
  const jwtToken = jwt.sign(
    { sessionId },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    data: {
      token: jwtToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatar_url,
      },
    },
    message: 'Demo login successful',
  });
}));

/**
 * Logout
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  if (req.session) {
    await execute('DELETE FROM sessions WHERE id = ?', [req.session.id]);
  }

  res.json({
    success: true,
    message: 'Logout successful',
  });
}));

/**
 * Get current user
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      session: {
        id: req.session?.id,
        expiresAt: req.session?.expiresAt,
      },
    },
  });
}));

/**
 * Refresh token
 */
router.post('/refresh', authMiddleware, asyncHandler(async (req, res) => {
  if (!req.session) {
    throw createApiError('No active session', 401);
  }

  // Generate new token
  const newToken = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await execute(`
    UPDATE sessions 
    SET token = ?, expires_at = ? 
    WHERE id = ?
  `, [newToken, expiresAt.toISOString(), req.session.id]);

  // Create new JWT
  const jwtToken = jwt.sign(
    { sessionId: req.session.id },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    data: {
      token: jwtToken,
    },
    message: 'Token refreshed successfully',
  });
}));

/**
 * Get GitHub OAuth URL
 */
router.get('/github/url', (req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.json({
      success: false,
      error: 'GitHub OAuth not configured',
    });
  }

  const state = generateToken(16);
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email,repo&state=${state}`;

  res.json({
    success: true,
    data: { url, state },
  });
});

export default router;