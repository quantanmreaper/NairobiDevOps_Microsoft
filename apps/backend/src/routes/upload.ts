import { Router } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import { generateId, getLanguageFromExtension, getFileExtension } from '@repo-guardian/shared';
import { execute } from '../database/connection';
import { asyncHandler, createApiError } from '../middleware/errorHandler';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Only allow zip files
    if (file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
});

/**
 * Upload and extract ZIP file as repository
 */
router.post('/zip', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createApiError('No file uploaded', 400);
  }

  const { name, description } = req.body;
  const userId = req.user?.id;

  if (!userId && process.env.DEMO_MODE !== 'true') {
    throw createApiError('User authentication required', 401);
  }

  try {
    // Extract ZIP file
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    // Filter and process files
    const files: Array<{
      path: string;
      content: string;
      language: string;
      size: number;
    }> = [];

    for (const entry of zipEntries) {
      // Skip directories and hidden files
      if (entry.isDirectory || entry.entryName.startsWith('.') || entry.entryName.includes('/.')) {
        continue;
      }

      // Skip binary files and large files
      if (entry.header.size > 1024 * 1024) { // 1MB limit per file
        continue;
      }

      // Skip common non-text files
      if (shouldSkipFile(entry.entryName)) {
        continue;
      }

      try {
        const content = entry.getData().toString('utf8');
        const extension = getFileExtension(entry.entryName);
        const language = getLanguageFromExtension(extension);

        // Validate that it's actually text content
        if (isTextContent(content)) {
          files.push({
            path: entry.entryName,
            content,
            language,
            size: entry.header.size,
          });
        }
      } catch (error) {
        // Skip files that can't be read as text
        console.warn(`Skipping file ${entry.entryName}: ${error}`);
      }
    }

    if (files.length === 0) {
      throw createApiError('No valid text files found in ZIP archive', 400);
    }

    // Create repository record
    const repositoryId = generateId();
    const repoName = name || path.basename(req.file.originalname, '.zip');
    const fullName = `uploaded/${repoName}`;

    await execute(`
      INSERT INTO repositories (
        id, user_id, name, full_name, description, url, 
        language, stars, forks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      repositoryId,
      userId || 'demo-user-id',
      repoName,
      fullName,
      description || 'Uploaded repository',
      `file://${req.file.originalname}`,
      getMostCommonLanguage(files),
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

      // Create text chunks for RAG
      const chunks = createTextChunks(file.content);
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = generateId();
        await execute(`
          INSERT INTO text_chunks (id, repository_id, file_path, content, metadata)
          VALUES (?, ?, ?, ?, ?)
        `, [
          chunkId,
          repositoryId,
          file.path,
          chunks[i],
          JSON.stringify({ chunkIndex: i, totalChunks: chunks.length }),
        ]);
      }
    }

    res.json({
      success: true,
      data: {
        id: repositoryId,
        name: repoName,
        fullName,
        description: description || 'Uploaded repository',
        filesCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        languages: getLanguageStats(files),
      },
      message: `Repository uploaded successfully with ${files.length} files`,
    });
  } catch (error) {
    console.error('ZIP upload error:', error);
    
    if (error instanceof Error && error.message.includes('Invalid or corrupted ZIP')) {
      throw createApiError('Invalid or corrupted ZIP file', 400);
    }
    
    throw createApiError('Failed to process ZIP file', 500);
  }
}));

/**
 * Upload single file
 */
router.post('/file', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createApiError('No file uploaded', 400);
  }

  const { repositoryId, filePath } = req.body;

  if (!repositoryId) {
    throw createApiError('Repository ID is required', 400);
  }

  try {
    const content = req.file.buffer.toString('utf8');
    
    if (!isTextContent(content)) {
      throw createApiError('File must contain valid text content', 400);
    }

    const extension = getFileExtension(req.file.originalname);
    const language = getLanguageFromExtension(extension);
    const path = filePath || req.file.originalname;

    // Check if file already exists
    const existingFile = await execute(`
      SELECT id FROM repo_files 
      WHERE repository_id = ? AND path = ?
    `, [repositoryId, path]);

    if (existingFile) {
      // Update existing file
      await execute(`
        UPDATE repo_files 
        SET content = ?, language = ?, size = ?, updated_at = CURRENT_TIMESTAMP
        WHERE repository_id = ? AND path = ?
      `, [content, language, req.file.size, repositoryId, path]);
    } else {
      // Create new file
      const fileId = generateId();
      await execute(`
        INSERT INTO repo_files (id, repository_id, path, content, language, size)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [fileId, repositoryId, path, content, language, req.file.size]);
    }

    // Update text chunks
    await execute(`
      DELETE FROM text_chunks WHERE repository_id = ? AND file_path = ?
    `, [repositoryId, path]);

    const chunks = createTextChunks(content);
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = generateId();
      await execute(`
        INSERT INTO text_chunks (id, repository_id, file_path, content, metadata)
        VALUES (?, ?, ?, ?, ?)
      `, [
        chunkId,
        repositoryId,
        path,
        chunks[i],
        JSON.stringify({ chunkIndex: i, totalChunks: chunks.length }),
      ]);
    }

    res.json({
      success: true,
      data: {
        path,
        language,
        size: req.file.size,
        chunksCreated: chunks.length,
      },
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('File upload error:', error);
    throw createApiError('Failed to process uploaded file', 500);
  }
}));

/**
 * Get upload limits and supported formats
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      maxFileSize: '100MB',
      maxFilesInZip: 1000,
      supportedFormats: ['.zip'],
      supportedLanguages: [
        'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
        'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala',
        'html', 'css', 'scss', 'sass', 'less',
        'json', 'xml', 'yaml', 'markdown', 'sql'
      ],
      textFileExtensions: [
        '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
        '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
        '.html', '.css', '.scss', '.sass', '.less',
        '.json', '.xml', '.yaml', '.yml', '.md', '.txt', '.sql'
      ],
    },
  });
});

// Helper functions

/**
 * Check if file should be skipped
 */
function shouldSkipFile(filePath: string): boolean {
  const skipPatterns = [
    /node_modules/,
    /\.git/,
    /\.next/,
    /dist/,
    /build/,
    /coverage/,
    /\.nyc_output/,
    /\.cache/,
    /\.vscode/,
    /\.idea/,
    /vendor/,
    /target/,
    /bin/,
    /obj/,
  ];

  const skipExtensions = [
    '.exe', '.dll', '.so', '.dylib',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.class', '.jar', '.war', '.ear',
    '.o', '.obj', '.lib', '.a',
  ];

  const extension = path.extname(filePath).toLowerCase();
  
  return skipPatterns.some(pattern => pattern.test(filePath)) ||
         skipExtensions.includes(extension);
}

/**
 * Check if content is valid text
 */
function isTextContent(content: string): boolean {
  // Check for null bytes (binary indicator)
  if (content.includes('\0')) {
    return false;
  }

  // Check if content is mostly printable characters
  const printableChars = content.replace(/[\r\n\t]/g, '').length;
  const totalChars = content.length;
  const printableRatio = printableChars / totalChars;

  return printableRatio > 0.7; // At least 70% printable characters
}

/**
 * Get most common language from files
 */
function getMostCommonLanguage(files: Array<{ language: string }>): string {
  const languageCounts: Record<string, number> = {};
  
  files.forEach(file => {
    if (file.language !== 'text') {
      languageCounts[file.language] = (languageCounts[file.language] || 0) + 1;
    }
  });

  const sortedLanguages = Object.entries(languageCounts)
    .sort(([, a], [, b]) => b - a);

  return sortedLanguages[0]?.[0] || 'text';
}

/**
 * Get language statistics
 */
function getLanguageStats(files: Array<{ language: string; size: number }>): Array<{
  language: string;
  count: number;
  totalSize: number;
}> {
  const stats: Record<string, { count: number; totalSize: number }> = {};

  files.forEach(file => {
    if (!stats[file.language]) {
      stats[file.language] = { count: 0, totalSize: 0 };
    }
    stats[file.language].count++;
    stats[file.language].totalSize += file.size;
  });

  return Object.entries(stats).map(([language, data]) => ({
    language,
    count: data.count,
    totalSize: data.totalSize,
  }));
}

/**
 * Create text chunks for RAG
 */
function createTextChunks(content: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  
  // Split by paragraphs first
  const paragraphs = content.split(/\n\s*\n/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If no paragraphs or chunks are still too large, split by lines
  if (chunks.length === 0 || chunks.some(chunk => chunk.length > maxChunkSize)) {
    const lines = content.split('\n');
    let lineChunk = '';
    
    for (const line of lines) {
      if (lineChunk.length + line.length > maxChunkSize && lineChunk.length > 0) {
        chunks.push(lineChunk.trim());
        lineChunk = line;
      } else {
        lineChunk += (lineChunk ? '\n' : '') + line;
      }
    }

    if (lineChunk.trim()) {
      chunks.push(lineChunk.trim());
    }
  }

  return chunks.filter(chunk => chunk.trim().length > 0);
}

export default router;