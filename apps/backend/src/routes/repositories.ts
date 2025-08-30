import { Router } from 'express';
import { generateId } from '@repo-guardian/shared';
import { query, queryOne, execute } from '../database/connection';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { checkRepositoryAccess } from '../middleware/auth';
import GitService from '../services/git';

const router = Router();

/**
 * Get user repositories
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  
  if (!userId && process.env.DEMO_MODE !== 'true') {
    throw createApiError('User ID required', 400);
  }

  const { page = 1, limit = 20, search, language, sort = 'name', order = 'asc' } = req.query;

  let whereClause = '';
  const params: any[] = [];

  if (userId) {
    whereClause = 'WHERE user_id = ?';
    params.push(userId);
  } else {
    // Demo mode - show all repositories
    whereClause = 'WHERE 1=1';
  }

  if (search) {
    whereClause += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (language) {
    whereClause += ' AND language = ?';
    params.push(language);
  }

  const orderClause = `ORDER BY ${sort} ${order}`;
  const offset = (Number(page) - 1) * Number(limit);

  // Get repositories
  const repositories = await query(`
    SELECT * FROM repositories 
    ${whereClause} 
    ${orderClause} 
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), offset]);

  // Get total count
  const [{ total }] = await query(`
    SELECT COUNT(*) as total FROM repositories ${whereClause}
  `, params);

  res.json({
    success: true,
    data: repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.url,
      isPrivate: Boolean(repo.is_private),
      language: repo.language,
      stars: repo.stars,
      forks: repo.forks,
      lastCommit: repo.last_commit ? new Date(repo.last_commit) : null,
      createdAt: new Date(repo.created_at),
      updatedAt: new Date(repo.updated_at),
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
 * Get repository by ID
 */
router.get('/:id', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const repository = await queryOne(`
    SELECT * FROM repositories WHERE id = ?
  `, [id]);

  if (!repository) {
    throw createApiError('Repository not found', 404);
  }

  res.json({
    success: true,
    data: {
      id: repository.id,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      url: repository.url,
      isPrivate: Boolean(repository.is_private),
      language: repository.language,
      stars: repository.stars,
      forks: repository.forks,
      lastCommit: repository.last_commit ? new Date(repository.last_commit) : null,
      createdAt: new Date(repository.created_at),
      updatedAt: new Date(repository.updated_at),
    },
  });
}));

/**
 * Add repository from GitHub
 */
router.post('/github', asyncHandler(async (req, res) => {
  const { url, name, description } = req.body;
  const userId = req.user?.id;

  if (!url) {
    throw createApiError('Repository URL is required', 400);
  }

  if (!userId && process.env.DEMO_MODE !== 'true') {
    throw createApiError('User authentication required', 401);
  }

  try {
    // Clone repository to analyze it
    const gitService = new GitService();
    const repoPath = await gitService.cloneRepository(url, name);

    // Read repository files
    const files = await gitService.readRepositoryFiles(repoPath);

    // Create repository record
    const repositoryId = generateId();
    const fullName = name || url.split('/').slice(-2).join('/');
    
    await execute(`
      INSERT INTO repositories (
        id, user_id, name, full_name, description, url, 
        language, stars, forks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      repositoryId,
      userId || 'demo-user-id',
      name || fullName.split('/')[1],
      fullName,
      description || '',
      url,
      files.find(f => f.language !== 'text')?.language || 'unknown',
      0,
      0,
    ]);

    // Store repository files
    for (const file of files) {
      const fileId = generateId();
      await execute(`
        INSERT INTO repo_files (id, repository_id, path, content, language, size)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        fileId,
        repositoryId,
        file.path,
        file.content,
        file.language,
        file.size,
      ]);
    }

    // Clean up cloned repository
    await gitService.cleanup(repoPath);

    res.json({
      success: true,
      data: {
        id: repositoryId,
        name: name || fullName.split('/')[1],
        fullName,
        description: description || '',
        url,
        filesCount: files.length,
      },
      message: 'Repository added successfully',
    });
  } catch (error) {
    console.error('Error adding repository:', error);
    throw createApiError('Failed to add repository', 500);
  }
}));

/**
 * Get repository files
 */
router.get('/:id/files', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { path, search, language } = req.query;

  let whereClause = 'WHERE repository_id = ?';
  const params: any[] = [id];

  if (path) {
    whereClause += ' AND path LIKE ?';
    params.push(`${path}%`);
  }

  if (search) {
    whereClause += ' AND (path LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (language) {
    whereClause += ' AND language = ?';
    params.push(language);
  }

  const files = await query(`
    SELECT id, path, language, size, created_at, updated_at
    FROM repo_files 
    ${whereClause}
    ORDER BY path
  `, params);

  res.json({
    success: true,
    data: files.map(file => ({
      id: file.id,
      path: file.path,
      language: file.language,
      size: file.size,
      createdAt: new Date(file.created_at),
      updatedAt: new Date(file.updated_at),
    })),
  });
}));

/**
 * Get file content
 */
router.get('/:id/files/:fileId', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;

  const file = await queryOne(`
    SELECT * FROM repo_files 
    WHERE id = ? AND repository_id = ?
  `, [fileId, id]);

  if (!file) {
    throw createApiError('File not found', 404);
  }

  res.json({
    success: true,
    data: {
      id: file.id,
      path: file.path,
      content: file.content,
      language: file.language,
      size: file.size,
      createdAt: new Date(file.created_at),
      updatedAt: new Date(file.updated_at),
    },
  });
}));

/**
 * Update repository
 */
router.put('/:id', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const updates: string[] = [];
  const params: any[] = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }

  if (updates.length === 0) {
    throw createApiError('No fields to update', 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  await execute(`
    UPDATE repositories 
    SET ${updates.join(', ')} 
    WHERE id = ?
  `, params);

  const repository = await queryOne(`
    SELECT * FROM repositories WHERE id = ?
  `, [id]);

  res.json({
    success: true,
    data: {
      id: repository.id,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      url: repository.url,
      isPrivate: Boolean(repository.is_private),
      language: repository.language,
      stars: repository.stars,
      forks: repository.forks,
      lastCommit: repository.last_commit ? new Date(repository.last_commit) : null,
      createdAt: new Date(repository.created_at),
      updatedAt: new Date(repository.updated_at),
    },
    message: 'Repository updated successfully',
  });
}));

/**
 * Delete repository
 */
router.delete('/:id', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Delete repository and all related data (cascade)
  await execute('DELETE FROM repositories WHERE id = ?', [id]);

  res.json({
    success: true,
    message: 'Repository deleted successfully',
  });
}));

/**
 * Get repository statistics
 */
router.get('/:id/stats', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get file statistics
  const fileStats = await query(`
    SELECT 
      language,
      COUNT(*) as count,
      SUM(size) as totalSize
    FROM repo_files 
    WHERE repository_id = ?
    GROUP BY language
    ORDER BY count DESC
  `, [id]);

  // Get analysis statistics
  const analysisStats = await query(`
    SELECT 
      type,
      severity,
      COUNT(*) as count
    FROM analysis_results 
    WHERE repository_id = ?
    GROUP BY type, severity
  `, [id]);

  // Get total counts
  const [totals] = await query(`
    SELECT 
      (SELECT COUNT(*) FROM repo_files WHERE repository_id = ?) as totalFiles,
      (SELECT COUNT(*) FROM analysis_results WHERE repository_id = ?) as totalIssues,
      (SELECT COUNT(*) FROM chat_messages WHERE repository_id = ?) as totalMessages
  `, [id, id, id]);

  res.json({
    success: true,
    data: {
      files: {
        total: totals.totalFiles,
        byLanguage: fileStats.map(stat => ({
          language: stat.language,
          count: stat.count,
          totalSize: stat.totalSize,
        })),
      },
      analysis: {
        total: totals.totalIssues,
        byTypeAndSeverity: analysisStats.map(stat => ({
          type: stat.type,
          severity: stat.severity,
          count: stat.count,
        })),
      },
      chat: {
        total: totals.totalMessages,
      },
    },
  });
}));

export default router;