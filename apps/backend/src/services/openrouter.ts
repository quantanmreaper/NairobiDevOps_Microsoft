import axios, { AxiosInstance } from 'axios';

/**
 * OpenRouter API client for AI operations
 */
export class OpenRouterService {
  private client: AxiosInstance;
  private readonly model = 'anthropic/claude-3.5-sonnet';

  constructor() {
    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'Repo Guardian',
      },
      timeout: 60000, // 60 second timeout
    });
  }

  /**
   * Analyze repository code for issues
   */
  async analyzeCode(files: Array<{ path: string; content: string; language: string }>): Promise<any[]> {
    const prompt = this.createAnalysisPrompt(files);
    
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: ANALYSIS_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI model');
      }

      return this.parseAnalysisResponse(content);
    } catch (error) {
      console.error('OpenRouter analysis error:', error);
      throw new Error('Failed to analyze code with AI');
    }
  }

  /**
   * Generate code fixes for identified issues
   */
  async generateFix(
    filePath: string,
    originalCode: string,
    issue: string,
    language: string
  ): Promise<{ fixedCode: string; explanation: string }> {
    const prompt = this.createFixPrompt(filePath, originalCode, issue, language);
    
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: FIX_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI model');
      }

      return this.parseFixResponse(content);
    } catch (error) {
      console.error('OpenRouter fix generation error:', error);
      throw new Error('Failed to generate code fix');
    }
  }

  /**
   * RAG-powered chat about repository
   */
  async chatWithRepository(
    message: string,
    context: string[],
    chatHistory: Array<{ role: string; content: string }>
  ): Promise<string> {
    const prompt = this.createChatPrompt(message, context);
    
    try {
      const messages = [
        {
          role: 'system',
          content: CHAT_SYSTEM_PROMPT
        },
        ...chatHistory.slice(-10), // Keep last 10 messages for context
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages,
        temperature: 0.3,
        max_tokens: 1500,
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI model');
      }

      return content;
    } catch (error) {
      console.error('OpenRouter chat error:', error);
      throw new Error('Failed to generate chat response');
    }
  }

  /**
   * Create analysis prompt for code review
   */
  private createAnalysisPrompt(files: Array<{ path: string; content: string; language: string }>): string {
    let prompt = 'Analyze the following repository files for security vulnerabilities, performance issues, maintainability problems, bugs, and outdated dependencies:\n\n';
    
    files.forEach(file => {
      prompt += `## File: ${file.path} (${file.language})\n`;
      prompt += '```' + file.language + '\n';
      prompt += file.content;
      prompt += '\n```\n\n';
    });

    prompt += `
Please provide a detailed analysis in the following JSON format:
{
  "issues": [
    {
      "type": "security|performance|maintainability|bugs|dependencies",
      "severity": "low|medium|high|critical",
      "title": "Brief title of the issue",
      "description": "Detailed description of the issue",
      "filePath": "path/to/file.js",
      "lineNumber": 42,
      "suggestion": "How to fix this issue",
      "fixCode": "Corrected code snippet (if applicable)",
      "confidence": 0.95
    }
  ]
}

Focus on:
1. Security vulnerabilities (SQL injection, XSS, hardcoded secrets, etc.)
2. Performance bottlenecks (inefficient algorithms, blocking operations, etc.)
3. Maintainability issues (code complexity, duplication, poor naming, etc.)
4. Bugs and logic errors
5. Outdated or vulnerable dependencies

Provide specific line numbers and actionable fix suggestions.`;

    return prompt;
  }

  /**
   * Create fix generation prompt
   */
  private createFixPrompt(filePath: string, originalCode: string, issue: string, language: string): string {
    return `
Fix the following ${language} code issue:

**File:** ${filePath}
**Issue:** ${issue}

**Original Code:**
\`\`\`${language}
${originalCode}
\`\`\`

Please provide:
1. The corrected code
2. A clear explanation of what was changed and why

Format your response as:
**Fixed Code:**
\`\`\`${language}
[corrected code here]
\`\`\`

**Explanation:**
[explanation of changes]
`;
  }

  /**
   * Create chat prompt with repository context
   */
  private createChatPrompt(message: string, context: string[]): string {
    let prompt = 'Repository Context:\n';
    
    context.forEach((chunk, index) => {
      prompt += `\n--- Context ${index + 1} ---\n${chunk}\n`;
    });

    prompt += `\n\nUser Question: ${message}\n\n`;
    prompt += 'Please answer the user\'s question based on the repository context provided above. ';
    prompt += 'If the context doesn\'t contain enough information to answer the question, ';
    prompt += 'let the user know what additional information would be helpful.';

    return prompt;
  }

  /**
   * Parse analysis response from AI
   */
  private parseAnalysisResponse(content: string): any[] {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.issues || [];
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      // Return empty array if parsing fails
      return [];
    }
  }

  /**
   * Parse fix response from AI
   */
  private parseFixResponse(content: string): { fixedCode: string; explanation: string } {
    try {
      // Extract code block
      const codeMatch = content.match(/```[\w]*\n([\s\S]*?)\n```/);
      const fixedCode = codeMatch ? codeMatch[1].trim() : '';

      // Extract explanation
      const explanationMatch = content.match(/\*\*Explanation:\*\*\s*([\s\S]*?)(?:\n\*\*|$)/);
      const explanation = explanationMatch ? explanationMatch[1].trim() : 'Code has been fixed.';

      return { fixedCode, explanation };
    } catch (error) {
      console.error('Failed to parse fix response:', error);
      return {
        fixedCode: '',
        explanation: 'Failed to generate fix explanation.'
      };
    }
  }
}

// System prompts for different AI operations

const ANALYSIS_SYSTEM_PROMPT = `You are an expert code reviewer and security analyst. Your job is to analyze code repositories and identify:

1. **Security vulnerabilities**: SQL injection, XSS, CSRF, hardcoded secrets, insecure dependencies, etc.
2. **Performance issues**: Inefficient algorithms, blocking operations, memory leaks, etc.
3. **Maintainability problems**: Code complexity, duplication, poor naming, lack of documentation, etc.
4. **Bugs and logic errors**: Null pointer exceptions, race conditions, incorrect logic, etc.
5. **Dependency issues**: Outdated packages, known vulnerabilities, license conflicts, etc.

For each issue found:
- Provide specific line numbers when possible
- Assign appropriate severity (low, medium, high, critical)
- Give actionable fix suggestions
- Include corrected code snippets when helpful
- Rate your confidence in the finding (0.0 to 1.0)

Be thorough but practical. Focus on issues that have real impact on security, performance, or maintainability.`;

const FIX_SYSTEM_PROMPT = `You are an expert software engineer specializing in code fixes and refactoring. Your job is to:

1. Understand the specific issue described
2. Provide a corrected version of the code
3. Explain what was changed and why
4. Ensure the fix follows best practices
5. Maintain the original functionality while addressing the issue

Guidelines:
- Keep fixes minimal and focused
- Follow language-specific best practices
- Ensure backward compatibility when possible
- Add comments to explain complex changes
- Consider edge cases and error handling`;

const CHAT_SYSTEM_PROMPT = `You are an AI assistant helping developers understand and improve their code repositories. You have access to the repository's code and can answer questions about:

1. Code structure and architecture
2. Specific functions and their purposes
3. Security vulnerabilities and how to fix them
4. Performance optimizations
5. Best practices and refactoring suggestions
6. Dependencies and their usage
7. Testing strategies
8. Documentation improvements

Guidelines:
- Be helpful and informative
- Provide specific examples from the codebase when possible
- Suggest concrete improvements
- Explain technical concepts clearly
- Ask clarifying questions when needed
- Reference specific files and line numbers when relevant`;

export default OpenRouterService;