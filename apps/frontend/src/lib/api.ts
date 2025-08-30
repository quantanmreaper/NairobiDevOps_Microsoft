import axios from 'axios';
import type { AnalysisResult } from '@/types/analysis';

// Backend API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for analysis
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Analyze a repository by calling the backend API
 * @param repoUrl - GitHub repository URL or 'demo' for demo analysis
 * @returns Promise<AnalysisResult> - Complete analysis results
 */
export async function analyzeRepository(repoUrl: string): Promise<AnalysisResult> {
  try {
    console.log(`Calling API: POST ${API_BASE_URL}/analyze`);
    console.log('Request payload:', { repoUrl });

    const response = await api.post('/analyze', { repoUrl });
    
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        throw new Error(error.response.data?.message || error.response.data?.error || 'Analysis failed');
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Unable to connect to analysis server. Please check if the backend is running.');
      } else {
        // Something else happened
        throw new Error('Request failed: ' + error.message);
      }
    }
    
    throw new Error('An unexpected error occurred during analysis');
  }
}

/**
 * Check if the backend API is healthy
 * @returns Promise<boolean> - True if backend is responding
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}