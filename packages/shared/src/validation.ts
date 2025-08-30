import { z } from 'zod';

// User validation schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  githubId: z.string().optional(),
  username: z.string().min(1).max(100),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createUserSchema = z.object({
  githubId: z.string().optional(),
  username: z.string().min(1).max(100),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
});

// Repository validation schemas
export const repositorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  fullName: z.string().min(1).max(300),
  description: z.string().optional(),
  url: z.string().url(),
  isPrivate: z.boolean(),
  language: z.string().optional(),
  stars: z.number().int().min(0),
  forks: z.number().int().min(0),
  lastCommit: z.date().optional(),
  createdAt: z.date(),
});

export const createRepositorySchema = z.object({
  name: z.string().min(1).max(200),
  fullName: z.string().min(1).max(300),
  description: z.string().optional(),
  url: z.string().url(),
  isPrivate: z.boolean().default(false),
  language: z.string().optional(),
  stars: z.number().int().min(0).default(0),
  forks: z.number().int().min(0).default(0),
  lastCommit: z.date().optional(),
});

// Analysis validation schemas
export const analysisResultSchema = z.object({
  id: z.string().uuid(),
  repositoryId: z.string().uuid(),
  type: z.enum(['security', 'performance', 'maintainability', 'bugs', 'dependencies']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  filePath: z.string().min(1),
  lineNumber: z.number().int().min(1).optional(),
  suggestion: z.string().min(1),
  fixCode: z.string().optional(),
  confidence: z.number().min(0).max(1),
  createdAt: z.date(),
});

export const createAnalysisResultSchema = z.object({
  repositoryId: z.string().uuid(),
  type: z.enum(['security', 'performance', 'maintainability', 'bugs', 'dependencies']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  filePath: z.string().min(1),
  lineNumber: z.number().int().min(1).optional(),
  suggestion: z.string().min(1),
  fixCode: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const analysisRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  types: z.array(z.enum(['security', 'performance', 'maintainability', 'bugs', 'dependencies'])).optional(),
  files: z.array(z.string()).optional(),
});

// Chat validation schemas
export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  repositoryId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
});

export const createChatMessageSchema = z.object({
  repositoryId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

export const chatRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  message: z.string().min(1).max(5000),
  context: z.array(z.string()).optional(),
});

// File validation schemas
export const repoFileSchema = z.object({
  id: z.string().uuid(),
  repositoryId: z.string().uuid(),
  path: z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
  size: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createRepoFileSchema = z.object({
  repositoryId: z.string().uuid(),
  path: z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
  size: z.number().int().min(0),
});

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Query parameter validation schemas
export const repositoryQuerySchema = z.object({
  search: z.string().optional(),
  language: z.string().optional(),
  sort: z.enum(['name', 'stars', 'forks', 'updated']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
}).merge(paginationSchema);

export const analysisQuerySchema = z.object({
  repositoryId: z.string().uuid().optional(),
  type: z.enum(['security', 'performance', 'maintainability', 'bugs', 'dependencies']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  filePath: z.string().optional(),
  sort: z.enum(['severity', 'type', 'created']).default('severity'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).merge(paginationSchema);

// GitHub OAuth validation schemas
export const githubCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string(),
  size: z.number().int().min(0).max(10 * 1024 * 1024), // 10MB max
});

export const zipUploadSchema = z.object({
  filename: z.string().min(1).max(255).regex(/\.zip$/i),
  size: z.number().int().min(0).max(100 * 1024 * 1024), // 100MB max
});

// Environment validation schema
export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  OPENROUTER_API_KEY: z.string().min(1),
  DEMO_MODE: z.string().transform(val => val === 'true').default('false'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

// API response validation helpers
export function createApiResponse<T>(data: T, message?: string): { success: true; data: T; message?: string } {
  return { success: true, data, message };
}

export function createApiError(error: string, message?: string): { success: false; error: string; message?: string } {
  return { success: false, error, message };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number }
): {
  success: true;
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
} {
  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };
}