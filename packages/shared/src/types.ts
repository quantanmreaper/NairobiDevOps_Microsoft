// User and Authentication Types
export interface User {
  id: string;
  githubId?: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// Repository Types
export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  isPrivate: boolean;
  language?: string;
  stars: number;
  forks: number;
  lastCommit?: Date;
  createdAt: Date;
}

export interface RepoFile {
  id: string;
  repositoryId: string;
  path: string;
  content: string;
  language?: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

// Analysis Types
export interface AnalysisResult {
  id: string;
  repositoryId: string;
  type: 'security' | 'performance' | 'maintainability' | 'bugs' | 'dependencies';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  suggestion: string;
  fixCode?: string;
  confidence: number;
  createdAt: Date;
}

export interface CodeSuggestion {
  id: string;
  filePath: string;
  lineNumber: number;
  originalCode: string;
  suggestedCode: string;
  explanation: string;
  type: 'bug' | 'performance' | 'security' | 'maintainability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

// Chat Types
export interface ChatMessage {
  id: string;
  repositoryId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface TextChunk {
  id: string;
  repositoryId: string;
  filePath: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Analysis Request Types
export interface AnalysisRequest {
  repositoryId: string;
  types?: ('security' | 'performance' | 'maintainability' | 'bugs' | 'dependencies')[];
  files?: string[];
}

export interface ChatRequest {
  repositoryId: string;
  message: string;
  context?: string[];
}

// Git Integration Types
export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

export interface PullRequest {
  id: string;
  title: string;
  description: string;
  branch: string;
  baseBranch: string;
  commits: GitCommit[];
  files: Array<{
    path: string;
    status: 'added' | 'modified' | 'deleted';
    additions: number;
    deletions: number;
  }>;
}

// Demo Types
export interface DemoRepository {
  name: string;
  description: string;
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  issues: Array<{
    type: 'security' | 'performance' | 'maintainability' | 'bugs' | 'dependencies';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    filePath: string;
    lineNumber?: number;
    suggestion: string;
    fixCode?: string;
  }>;
}