import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { analyzeRepository } from './analyzer';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Main analysis endpoint
 * Accepts a GitHub repository URL and returns analysis results
 */
app.post('/analyze', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    
    if (!repoUrl) {
      return res.status(400).json({ 
        error: 'Repository URL is required' 
      });
    }

    console.log(`Starting analysis for: ${repoUrl}`);
    
    // Perform repository analysis
    const results = await analyzeRepository(repoUrl);
    
    console.log('Analysis completed successfully');
    res.json(results);
    
  } catch (error) {
    console.error('Analysis failed:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  
  // Log AI configuration status
  if (process.env.OPENROUTER_API_KEY) {
    console.log(`🤖 AI Analysis: Google Gemini 2.0 Flash (via OpenRouter)`);
  } else {
    console.log(`🎭 AI Analysis: Mock mode (set OPENROUTER_API_KEY for real AI)`);
  }
});