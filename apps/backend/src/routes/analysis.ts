import { Router } from 'express';
import { generateId } from '@repo-guardian/shared';
import { query, queryOne, execute } from '../database/connection';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { checkRepositoryAccess } from '../middleware/auth';
import OpenRouterService from '../services/openrouter';
import GitService from '../services/git';

const router = Router();

/**
 * Start repository analysis
 */
router.post('/:repositoryId/analyze', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;
  const { types, files: requestedFiles } = req.body;

  // Get repository files
  let whereClause = 'WHERE repository_id = ?';
  const params: any[] = [repositoryId];

  if (requestedFiles && requestedFiles.length > 0) {
    whereClause += ' AND path IN (' + requestedFiles.map(() => '?').join(',') + ')';
    params.push(...requestedFiles);
  }

  const files = await query(`
    SELECT path, content, language FROM repo_files ${whereClause}
  `, params);

  if (files.length === 0) {
    throw createApiError('No files found for analysis', 404);
  }

  try {
    // Use OpenRouter to analyze the code
    const openRouter = new OpenRouterService();
    const analysisResults = await openRouter.analyzeCode(files);

    // Filter by requested types if specified
    const filteredResults = types && types.length > 0
      ? analysisResults.filter(result => types.includes(result.type))
      : analysisResults;

    // Store analysis results in database
    const storedResults = [];
    for (const result of filteredResults) {
      const resultId = generateId();
      
      await execute(`
        INSERT INTO analysis_results (
          id, repository_id, type, severity, title, description,
          file_path, line_number, suggestion, fix_code, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        resultId,
        repositoryId,
        result.type,
        result.severity,
        result.title,
        result.description,
        result.filePath,
        result.lineNumber || null,
        result.suggestion,
        result.fixCode || null,
        result.confidence,
      ]);

      storedResults.push({
        id: resultId,
        ...result,
      });
    }

    res.json({
      success: true,
      data: {
        analysisId: generateId(),
        results: storedResults,
        summary: {
          totalIssues: storedResults.length,
          byType: getIssuesByType(storedResults),
          bySeverity: getIssuesBySeverity(storedResults),
        },
      },
      message: `Analysis completed. Found ${storedResults.length} issues.`,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    throw createApiError('Failed to analyze repository', 500);
  }
}));

/**
 * Get analysis results
 */
router.get('/:repositoryId/results', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;
  const { 
    page = 1, 
    limit = 20, 
    type, 
    severity, 
    filePath, 
    sort = 'severity', 
    order = 'desc' 
  } = req.query;

  let whereClause = 'WHERE repository_id = ?';
  const params: any[] = [repositoryId];

  if (type) {
    whereClause += ' AND type = ?';
    params.push(type);
  }

  if (severity) {
    whereClause += ' AND severity = ?';
    params.push(severity);
  }

  if (filePath) {
    whereClause += ' AND file_path LIKE ?';
    params.push(`%${filePath}%`);
  }

  // Map sort field to database column
  const sortMap: Record<string, string> = {
    severity: 'CASE severity WHEN "critical" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 WHEN "low" THEN 4 END',
    type: 'type',
    created: 'created_at',
    confidence: 'confidence',
  };

  const orderClause = `ORDER BY ${sortMap[sort as string] || sortMap.severity} ${order}`;
  const offset = (Number(page) - 1) * Number(limit);

  // Get analysis results
  const results = await query(`
    SELECT * FROM analysis_results 
    ${whereClause} 
    ${orderClause} 
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), offset]);

  // Get total count
  const [{ total }] = await query(`
    SELECT COUNT(*) as total FROM analysis_results ${whereClause}
  `, params);

  res.json({
    success: true,
    data: results.map(result => ({
      id: result.id,
      repositoryId: result.repository_id,
      type: result.type,
      severity: result.severity,
      title: result.title,
      description: result.description,
      filePath: result.file_path,
      lineNumber: result.line_number,
      suggestion: result.suggestion,
      fixCode: result.fix_code,
      confidence: result.confidence,
      createdAt: new Date(result.created_at),
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
 * Get analysis result by ID
 */
router.get('/:repositoryId/results/:resultId', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId, resultId } = req.params;

  const result = await queryOne(`
    SELECT * FROM analysis_results 
    WHERE id = ? AND repository_id = ?
  `, [resultId, repositoryId]);

  if (!result) {
    throw createApiError('Analysis result not found', 404);
  }

  res.json({
    success: true,
    data: {
      id: result.id,
      repositoryId: result.repository_id,
      type: result.type,
      severity: result.severity,
      title: result.title,
      description: result.description,
      filePath: result.file_path,
      lineNumber: result.line_number,
      suggestion: result.suggestion,
      fixCode: result.fix_code,
      confidence: result.confidence,
      createdAt: new Date(result.created_at),
    },
  });
}));

/**
 * Generate fix for analysis result
 */
router.post('/:repositoryId/results/:resultId/fix', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId, resultId } = req.params;

  // Get analysis result
  const result = await queryOne(`
    SELECT * FROM analysis_results 
    WHERE id = ? AND repository_id = ?
  `, [resultId, repositoryId]);

  if (!result) {
    throw createApiError('Analysis result not found', 404);
  }

  // Get file content
  const file = await queryOne(`
    SELECT content, language FROM repo_files 
    WHERE repository_id = ? AND path = ?
  `, [repositoryId, result.file_path]);

  if (!file) {
    throw createApiError('File not found', 404);
  }

  try {
    const openRouter = new OpenRouterService();
    
    // Extract the problematic code section
    const lines = file.content.split('\n');
    const startLine = Math.max(0, (result.line_number || 1) - 3);
    const endLine = Math.min(lines.length, (result.line_number || 1) + 3);
    const codeSection = lines.slice(startLine, endLine).join('\n');

    const fix = await openRouter.generateFix(
      result.file_path,
      codeSection,
      result.description,
      file.language
    );

    // Update the analysis result with the generated fix
    await execute(`
      UPDATE analysis_results 
      SET fix_code = ? 
      WHERE id = ?
    `, [fix.fixedCode, resultId]);

    res.json({
      success: true,
      data: {
        originalCode: codeSection,
        fixedCode: fix.fixedCode,
        explanation: fix.explanation,
      },
      message: 'Fix generated successfully',
    });
  } catch (error) {
    console.error('Fix generation error:', error);
    throw createApiError('Failed to generate fix', 500);
  }
}));

/**
 * Apply fixes to repository
 */
router.post('/:repositoryId/apply-fixes', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;
  const { resultIds, createPR = false } = req.body;

  if (!resultIds || !Array.isArray(resultIds) || resultIds.length === 0) {
    throw createApiError('Result IDs are required', 400);
  }

  try {
    // Get analysis results with fixes
    const results = await query(`
      SELECT * FROM analysis_results 
      WHERE id IN (${resultIds.map(() => '?').join(',')}) 
      AND repository_id = ? 
      AND fix_code IS NOT NULL
    `, [...resultIds, repositoryId]);

    if (results.length === 0) {
      throw createApiError('No fixable results found', 404);
    }

    // Get repository info
    const repository = await queryOne(`
      SELECT * FROM repositories WHERE id = ?
    `, [repositoryId]);

    if (!repository) {
      throw createApiError('Repository not found', 404);
    }

    // Clone repository
    const gitService = new GitService();
    const repoPath = await gitService.cloneRepository(repository.url);

    // Prepare fixes
    const fixes = [];
    for (const result of results) {
      const file = await queryOne(`
        SELECT content FROM repo_files 
        WHERE repository_id = ? AND path = ?
      `, [repositoryId, result.file_path]);

      if (file) {
        // Find the original code to replace
        const lines = file.content.split('\n');
        const lineIndex = (result.line_number || 1) - 1;
        const originalLine = lines[lineIndex];

        fixes.push({
          filePath: result.file_path,
          originalCode: originalLine,
          fixedCode: result.fix_code,
        });
      }
    }

    if (createPR) {
      // Create a new branch for the fixes
      const branchName = `repo-guardian-fixes-${Date.now()}`;
      await gitService.createBranch(repoPath, branchName);
    }

    // Apply fixes
    await gitService.applyFixes(repoPath, fixes);

    // Commit changes
    const commitMessage = `Fix ${results.length} issues found by Repo Guardian\n\n` +
      results.map(r => `- ${r.title} in ${r.file_path}`).join('\n');

    const commitHash = await gitService.commitChanges(repoPath, commitMessage);

    let prInfo = null;
    if (createPR) {
      // In a real implementation, you would create a PR via GitHub API
      // For demo purposes, we'll simulate it
      prInfo = {
        id: generateId(),
        title: `Repo Guardian: Fix ${results.length} code issues`,
        description: `This PR fixes the following issues:\n\n${results.map(r => `- **${r.severity.toUpperCase()}**: ${r.title} in \`${r.file_path}\``).join('\n')}`,
        branch: `repo-guardian-fixes-${Date.now()}`,
        baseBranch: 'main',
        url: `${repository.url}/pull/123`, // Simulated PR URL
      };
    }

    // Clean up
    await gitService.cleanup(repoPath);

    res.json({
      success: true,
      data: {
        appliedFixes: fixes.length,
        commitHash,
        pullRequest: prInfo,
      },
      message: `Applied ${fixes.length} fixes successfully`,
    });
  } catch (error) {
    console.error('Apply fixes error:', error);
    throw createApiError('Failed to apply fixes', 500);
  }
}));

/**
 * Get analysis summary
 */
router.get('/:repositoryId/summary', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;

  // Get issue counts by type and severity
  const typeStats = await query(`
    SELECT type, COUNT(*) as count
    FROM analysis_results 
    WHERE repository_id = ?
    GROUP BY type
  `, [repositoryId]);

  const severityStats = await query(`
    SELECT severity, COUNT(*) as count
    FROM analysis_results 
    WHERE repository_id = ?
    GROUP BY severity
  `, [repositoryId]);

  const fileStats = await query(`
    SELECT file_path, COUNT(*) as issueCount
    FROM analysis_results 
    WHERE repository_id = ?
    GROUP BY file_path
    ORDER BY issueCount DESC
    LIMIT 10
  `, [repositoryId]);

  // Get total counts
  const [totals] = await query(`
    SELECT 
      COUNT(*) as totalIssues,
      COUNT(CASE WHEN fix_code IS NOT NULL THEN 1 END) as fixableIssues,
      AVG(confidence) as avgConfidence
    FROM analysis_results 
    WHERE repository_id = ?
  `, [repositoryId]);

  res.json({
    success: true,
    data: {
      total: totals.totalIssues,
      fixable: totals.fixableIssues,
      averageConfidence: totals.avgConfidence,
      byType: typeStats.reduce((acc, stat) => {
        acc[stat.type] = stat.count;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: severityStats.reduce((acc, stat) => {
        acc[stat.severity] = stat.count;
        return acc;
      }, {} as Record<string, number>),
      topFiles: fileStats.map(stat => ({
        path: stat.file_path,
        issueCount: stat.issueCount,
      })),
    },
  });
}));

/**
 * Delete analysis result
 */
router.delete('/:repositoryId/results/:resultId', checkRepositoryAccess, asyncHandler(async (req, res) => {
  const { repositoryId, resultId } = req.params;

  const result = await execute(`
    DELETE FROM analysis_results 
    WHERE id = ? AND repository_id = ?
  `, [resultId, repositoryId]);

  if (result.changes === 0) {
    throw createApiError('Analysis result not found', 404);
  }

  res.json({
    success: true,
    message: 'Analysis result deleted successfully',
  });
}));

// Helper functions

function getIssuesByType(results: any[]): Record<string, number> {
  return results.reduce((acc, result) => {
    acc[result.type] = (acc[result.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function getIssuesBySeverity(results: any[]): Record<string, number> {
  return results.reduce((acc, result) => {
    acc[result.severity] = (acc[result.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export default router;