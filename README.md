# Repo Guardian Dashboard

A minimal MVP for hackathon - AI-powered repository security and code quality analysis.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env and add your OpenRouter API key

# Start development servers
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### 🔑 OpenRouter API Setup

1. Sign up at [OpenRouter.ai](https://openrouter.ai/)
2. Get your API key from the dashboard
3. Add it to `apps/backend/.env`:
   ```
   OPENROUTER_API_KEY=your_api_key_here
   ```

**Note**: The app works without an API key (falls back to mock AI), but real AI analysis requires the key.

## 🎯 Features

- **Repository Analysis**: Enter any GitHub URL or try the demo
- **Dependency Scanning**: Finds outdated and vulnerable packages
- **Static Code Analysis**: Detects security issues, bugs, and code quality problems
- **AI Risk Assessment**: Mock AI generates risk summaries and recommendations
- **No Authentication**: Simple, hackathon-ready MVP

## 🏗️ Architecture

```
repo-guardian-dashboard/
├── apps/
│   ├── backend/           # Node.js + Express API
│   │   ├── src/
│   │   │   ├── server.ts          # Main server
│   │   │   ├── analyzer.ts        # Repository analysis orchestrator
│   │   │   ├── dependency-analyzer.ts  # Package.json/requirements.txt parsing
│   │   │   ├── static-analyzer.ts      # Code quality checks
│   │   │   └── ai-mock.ts         # Mock AI risk assessment
│   │   └── package.json
│   └── frontend/          # Next.js 14 + React
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx       # Main dashboard
│       │   │   └── layout.tsx     # App layout
│       │   ├── components/ui/     # shadcn/ui components
│       │   ├── lib/
│       │   │   └── api.ts         # Backend API calls
│       │   └── types/
│       │       └── analysis.ts    # TypeScript interfaces
│       └── package.json
├── demo-repo/             # Vulnerable demo repository
├── turbo.json            # Turborepo configuration
└── package.json          # Root package.json
```

## 🔧 How It Works

### Backend (`/analyze` endpoint)

1. **Repository Cloning**: Uses `simple-git` to clone GitHub repos
2. **Language Detection**: Analyzes files to determine primary language
3. **Dependency Analysis**: 
   - JavaScript: Parses `package.json`
   - Python: Parses `requirements.txt`
   - Checks for outdated versions and known vulnerabilities
4. **Static Analysis**: 
   - JavaScript: Detects SQL injection, eval usage, hardcoded credentials
   - Python: Finds security issues, code quality problems
5. **AI Summary**: **Google Gemini 2.0 Flash** via OpenRouter generates intelligent risk assessment and recommendations

### Frontend

- **Input**: GitHub URL textbox + "Analyze Repository" button
- **Demo Mode**: "Try Demo Repository" button for instant results
- **Results Display**: 
  - Repository information
  - AI risk assessment with priority fixes
  - Dependencies analysis (outdated + vulnerable)
  - Static analysis results with file locations

## 🎭 Demo Repository

The `demo-repo/` folder contains a vulnerable Node.js app with intentional issues:

- **Security**: SQL injection, hardcoded credentials, eval() usage
- **Performance**: Synchronous operations, inefficient algorithms  
- **Dependencies**: Outdated packages with known vulnerabilities
- **Code Quality**: Poor error handling, deeply nested code

## 🛠️ Tech Stack

- **Monorepo**: Turborepo + pnpm
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Git Operations**: simple-git
- **UI Components**: Lucide React icons
- **Styling**: Tailwind CSS with custom design system

## 📝 API Endpoints

### `POST /analyze`
Analyzes a repository and returns comprehensive results.

**Request:**
```json
{
  "repoUrl": "https://github.com/username/repo" // or "demo"
}
```

**Response:**
```json
{
  "repository": {
    "name": "repo-name",
    "url": "https://github.com/username/repo",
    "language": "javascript"
  },
  "dependencies": {
    "total": 4,
    "outdated": [...],
    "vulnerable": [...]
  },
  "staticAnalysis": {
    "errors": [...],
    "summary": {
      "totalFiles": 3,
      "totalErrors": 2,
      "totalWarnings": 1
    }
  },
  "aiSummary": {
    "riskLevel": "high",
    "summary": "AI-generated risk assessment...",
    "recommendations": [...],
    "priorityFixes": [...]
  }
}
```

### `GET /health`
Health check endpoint.

## 🚀 Deployment

The MVP is designed to run locally for hackathons:

1. Clone the repository
2. Run `pnpm install`
3. Run `pnpm dev`
4. Open http://localhost:3000

For production deployment:
1. Build: `pnpm build`
2. Deploy frontend and backend separately
3. Update API URLs in environment variables

## 🎯 Hackathon Ready

This MVP is specifically designed for hackathons:

- ✅ **No complex setup** - Works out of the box
- ✅ **No authentication** - No OAuth or user management
- ✅ **No database** - Everything runs in memory
- ✅ **Real AI** - Google Gemini 2.0 Flash via OpenRouter (with mock fallback)
- ✅ **Demo mode** - Instant results without GitHub access
- ✅ **Full TypeScript** - Type-safe development
- ✅ **Modern UI** - Professional-looking interface
- ✅ **Real functionality** - Actually analyzes repositories

## 🔮 Future Enhancements

For post-hackathon development:

- Additional AI models (OpenAI, Claude, etc.)
- User authentication and project management
- Database persistence
- More programming languages
- Real-time analysis progress
- GitHub integration for PR creation
- Detailed security reports
- CI/CD integration