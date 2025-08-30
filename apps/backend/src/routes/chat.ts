import { Router } from 'express';
import { generateId } from '@repo-guardian/shared';
import { query, queryOne, execute } from '../database/connection';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { checkRepositoryAccess } from '../middleware/auth';
import OpenRouterService from '../services/openrouter';

const router = Router();

/**
 * Get chat messages for repository
 */
router.get('/:repositoryId/messages', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  const messages = await query(`
    SELECT * FROM chat_messages 
    WHERE repository_id = ?
    ORDER BY created_at ASC
    LIMIT ? OFFSET ?
  `, [repositoryId, Number(limit), offset]);

  const [{ total }] = await query(`
    SELECT COUNT(*) as total FROM chat_messages 
    WHERE repository_id = ?
  `, [repositoryId]);

  res.json({
    success: true,
    data: messages.map(message => ({
      id: message.id,
      repositoryId: message.repository_id,
      role: message.role,
      content: message.content,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
      createdAt: new Date(message.created_at),
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}));

/**
 * Send chat message
 */
router.post('/:repositoryId/messages', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;
  const { message, context } = req.body;

  if (!message || message.trim().length === 0) {
    throw createApiError('Message content is required', 400);
  }

  try {
    // Store user message
    const userMessageId = generateId();
    await execute(`
      INSERT INTO chat_messages (id, repository_id, role, content)
      VALUES (?, ?, ?, ?)
    `, [userMessageId, repositoryId, 'user', message.trim()]);

    // Get repository context for RAG
    const repositoryContext = await getRepositoryContext(repositoryId, message, context);

    // Get recent chat history
    const chatHistory = await query(`
      SELECT role, content FROM chat_messages 
      WHERE repository_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [repositoryId]);

    // Reverse to get chronological order
    const history = chatHistory.reverse();

    // Generate AI response
    const openRouter = new OpenRouterService();
    const aiResponse = await openRouter.chatWithRepository(
      message,
      repositoryContext,
      history
    );

    // Store AI response
    const aiMessageId = generateId();
    await execute(`
      INSERT INTO chat_messages (id, repository_id, role, content, metadata)
      VALUES (?, ?, ?, ?, ?)
    `, [
      aiMessageId,
      repositoryId,
      'assistant',
      aiResponse,
      JSON.stringify({
        contextUsed: repositoryContext.length,
        model: 'anthropic/claude-3.5-sonnet',
      }),
    ]);

    // Return both messages
    res.json({
      success: true,
      data: {
        userMessage: {
          id: userMessageId,
          repositoryId,
          role: 'user',
          content: message.trim(),
          createdAt: new Date(),
        },
        aiMessage: {
          id: aiMessageId,
          repositoryId,
          role: 'assistant',
          content: aiResponse,
          metadata: {
            contextUsed: repositoryContext.length,
            model: 'anthropic/claude-3.5-sonnet',
          },
          createdAt: new Date(),
        },
      },
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Chat error:', error);
    throw createApiError('Failed to process chat message', 500);
  }
}));

/**
 * Clear chat history
 */
router.delete('/:repositoryId/messages', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;

  await execute(`
    DELETE FROM chat_messages WHERE repository_id = ?
  `, [repositoryId]);

  res.json({
    success: true,
    message: 'Chat history cleared successfully',
  });
}));

/**
 * Get chat statistics
 */
router.get('/:repositoryId/stats', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;

  const [stats] = await query(`
    SELECT 
      COUNT(*) as totalMessages,
      COUNT(CASE WHEN role = 'user' THEN 1 END) as userMessages,
      COUNT(CASE WHEN role = 'assistant' THEN 1 END) as aiMessages,
      MIN(created_at) as firstMessage,
      MAX(created_at) as lastMessage
    FROM chat_messages 
    WHERE repository_id = ?
  `, [repositoryId]);

  // Get message frequency by day (last 30 days)
  const messageFrequency = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM chat_messages 
    WHERE repository_id = ? 
    AND created_at >= datetime('now', '-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date
  `, [repositoryId]);

  res.json({
    success: true,
    data: {
      total: stats.totalMessages,
      userMessages: stats.userMessages,
      aiMessages: stats.aiMessages,
      firstMessage: stats.firstMessage ? new Date(stats.firstMessage) : null,
      lastMessage: stats.lastMessage ? new Date(stats.lastMessage) : null,
      messageFrequency: messageFrequency.map(freq => ({
        date: freq.date,
        count: freq.count,
      })),
    },
  });
}));

/**
 * Search chat messages
 */
router.get('/:repositoryId/search', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;
  const { q, role, page = 1, limit = 20 } = req.query;

  if (!q || q.trim().length === 0) {
    throw createApiError('Search query is required', 400);
  }

  let whereClause = 'WHERE repository_id = ? AND content LIKE ?';
  const params: any[] = [repositoryId, `%${q}%`];

  if (role) {
    whereClause += ' AND role = ?';
    params.push(role);
  }

  const offset = (Number(page) - 1) * Number(limit);

  const messages = await query(`
    SELECT * FROM chat_messages 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), offset]);

  const [{ total }] = await query(`
    SELECT COUNT(*) as total FROM chat_messages ${whereClause}
  `, params);

  res.json({
    success: true,
    data: messages.map(message => ({
      id: message.id,
      repositoryId: message.repository_id,
      role: message.role,
      content: message.content,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
      createdAt: new Date(message.created_at),
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}));

/**
 * Get repository context for RAG
 */
async function getRepositoryContext(
  repositoryId: string,
  userMessage: string,
  explicitContext?: string[]
): Promise<string[]> {
  const context: string[] = [];

  // If explicit context is provided, use it
  if (explicitContext && explicitContext.length > 0) {
    const contextChunks = await query(`
      SELECT content FROM text_chunks 
      WHERE repository_id = ? AND id IN (${explicitContext.map(() => '?').join(',')})
    `, [repositoryId, ...explicitContext]);

    context.push(...contextChunks.map(chunk => chunk.content));
  } else {
    // Use simple keyword matching for context retrieval
    const keywords = extractKeywords(userMessage);
    
    if (keywords.length > 0) {
      // Search for relevant text chunks
      const relevantChunks = await query(`
        SELECT content, file_path FROM text_chunks 
        WHERE repository_id = ? 
        AND (${keywords.map(() => 'content LIKE ?').join(' OR ')})
        LIMIT 5
      `, [repositoryId, ...keywords.map(keyword => `%${keyword}%`)]);

      context.push(...relevantChunks.map(chunk => 
        `File: ${chunk.file_path}\n${chunk.content}`
      ));
    }

    // If no specific context found, get some general repository info
    if (context.length === 0) {
      const generalChunks = await query(`
        SELECT content, file_path FROM text_chunks 
        WHERE repository_id = ?
        ORDER BY RANDOM()
        LIMIT 3
      `, [repositoryId]);

      context.push(...generalChunks.map(chunk => 
        `File: ${chunk.file_path}\n${chunk.content}`
      ));
    }
  }

  return context;
}

/**
 * Extract keywords from user message
 */
function extractKeywords(message: string): string[] {
  // Simple keyword extraction - in a real implementation, you might use NLP
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'what', 'where', 'when', 'why', 'how', 'which', 'who', 'whom'
  ]);

  return message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5); // Limit to 5 keywords
}

export default router;