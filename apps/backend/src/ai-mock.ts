import axios from 'axios';
import { DependencyAnalysis } from './dependency-analyzer';
import { StaticAnalysisResult } from './static-analyzer';

export interface AISummary {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  recommendations: string[];
  priorityFixes: string[];
}

/**
 * Generate AI-powered risk summary and recommendations using Google Gemini 2.5 Flash
 * via OpenRouter API
 */
export async function generateAISummary(
  dependencies: DependencyAnalysis,
  staticAnalysis: StaticAnalysisResult
): Promise<AISummary> {
  // If no OpenRouter API key is provided, fall back to mock data
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('No OpenRouter API key found, using mock AI summary');
    return generateMockSummary(dependencies, staticAnalysis);
  }

  try {
    const prompt = createAnalysisPrompt(dependencies, staticAnalysis);
    const aiResponse = await callGeminiAPI(prompt);
    return parseAIResponse(aiResponse, dependencies, staticAnalysis);
  } catch (error) {
    console.error('AI API call failed, falling back to mock:', error);
    return generateMockSummary(dependencies, staticAnalysis);
  }
}

/**
 * Call Google Gemini 2.5 Flash via OpenRouter API
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [
        {
          role: 'system',
          content: 'You are a cybersecurity expert and code quality analyst. Analyze repository security and provide actionable recommendations in JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Repo Guardian Dashboard'
      },
      timeout: 30000 // 30 second timeout
    }
  );

  return response.data.choices[0]?.message?.content || '';
}

/**
 * Create analysis prompt for AI
 */
function createAnalysisPrompt(dependencies: DependencyAnalysis, staticAnalysis: StaticAnalysisResult): string {
  return `
Analyze this repository security and code quality data:

DEPENDENCIES ANALYSIS:
- Total dependencies: ${dependencies.total}
- Outdated dependencies: ${dependencies.outdated.length}
${dependencies.outdated.map(d => `  • ${d.name}: ${d.current} → ${d.latest} (${d.severity} severity)`).join('\n')}

- Vulnerable dependencies: ${dependencies.vulnerable.length}
${dependencies.vulnerable.map(v => `  • ${v.name} v${v.version}: ${v.vulnerability} (${v.severity} severity)`).join('\n')}

STATIC ANALYSIS RESULTS:
- Total files analyzed: ${staticAnalysis.summary.totalFiles}
- Errors found: ${staticAnalysis.summary.totalErrors}
- Warnings found: ${staticAnalysis.summary.totalWarnings}

Key issues:
${staticAnalysis.errors.slice(0, 10).map(e => `  • ${e.file}:${e.line} - ${e.message} (${e.severity})`).join('\n')}

Please provide a JSON response with this exact structure:
{
  "riskLevel": "low|medium|high|critical",
  "summary": "2-3 sentence overall risk assessment",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4", "recommendation 5"],
  "priorityFixes": ["priority fix 1", "priority fix 2", "priority fix 3"]
}

Focus on:
1. Security vulnerabilities and their impact
2. Actionable recommendations for developers
3. Priority order for fixes
4. Specific technical guidance
`;
}

/**
 * Parse AI response and extract structured data
 */
function parseAIResponse(aiResponse: string, dependencies: DependencyAnalysis, staticAnalysis: StaticAnalysisResult): AISummary {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (parsed.riskLevel && parsed.summary && parsed.recommendations && parsed.priorityFixes) {
        return {
          riskLevel: parsed.riskLevel,
          summary: parsed.summary,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 6) : [],
          priorityFixes: Array.isArray(parsed.priorityFixes) ? parsed.priorityFixes.slice(0, 5) : []
        };
      }
    }
    
    // If parsing fails, fall back to mock
    console.warn('AI response parsing failed, using mock data');
    return generateMockSummary(dependencies, staticAnalysis);
    
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return generateMockSummary(dependencies, staticAnalysis);
  }
}

/**
 * Fallback mock AI function (original implementation)
 */
function generateMockSummary(
  dependencies: DependencyAnalysis,
  staticAnalysis: StaticAnalysisResult
): AISummary {
  
  // Calculate risk level based on findings
  const criticalIssues = dependencies.vulnerable.filter(v => v.severity === 'critical').length;
  const highIssues = dependencies.vulnerable.filter(v => v.severity === 'high').length + 
                    staticAnalysis.errors.filter(e => e.severity === 'error').length;
  const mediumIssues = dependencies.outdated.filter(d => d.severity === 'medium').length +
                      staticAnalysis.errors.filter(e => e.severity === 'warning').length;

  let riskLevel: AISummary['riskLevel'] = 'low';
  if (criticalIssues > 0) riskLevel = 'critical';
  else if (highIssues > 2) riskLevel = 'high';
  else if (highIssues > 0 || mediumIssues > 3) riskLevel = 'medium';

  // Generate summary based on findings
  const summary = generateSummaryText(dependencies, staticAnalysis, riskLevel);
  
  // Generate recommendations
  const recommendations = generateRecommendations(dependencies, staticAnalysis);
  
  // Generate priority fixes
  const priorityFixes = generatePriorityFixes(dependencies, staticAnalysis);

  return {
    riskLevel,
    summary,
    recommendations,
    priorityFixes
  };
}

/**
 * Generate human-readable summary text
 */
function generateSummaryText(
  dependencies: DependencyAnalysis,
  staticAnalysis: StaticAnalysisResult,
  riskLevel: string
): string {
  const totalVulns = dependencies.vulnerable.length;
  const totalOutdated = dependencies.outdated.length;
  const totalErrors = staticAnalysis.summary.totalErrors;
  const totalWarnings = staticAnalysis.summary.totalWarnings;

  let summary = `This repository has been classified as ${riskLevel} risk. `;

  if (totalVulns > 0) {
    summary += `Found ${totalVulns} vulnerable ${totalVulns === 1 ? 'dependency' : 'dependencies'} with known security issues. `;
  }

  if (totalOutdated > 0) {
    summary += `${totalOutdated} ${totalOutdated === 1 ? 'dependency is' : 'dependencies are'} outdated. `;
  }

  if (totalErrors > 0) {
    summary += `Static analysis detected ${totalErrors} critical ${totalErrors === 1 ? 'issue' : 'issues'} `;
    if (totalWarnings > 0) {
      summary += `and ${totalWarnings} ${totalWarnings === 1 ? 'warning' : 'warnings'}. `;
    } else {
      summary += '. ';
    }
  } else if (totalWarnings > 0) {
    summary += `Static analysis found ${totalWarnings} ${totalWarnings === 1 ? 'warning' : 'warnings'}. `;
  }

  if (riskLevel === 'critical') {
    summary += 'Immediate action is required to address critical security vulnerabilities.';
  } else if (riskLevel === 'high') {
    summary += 'High priority issues should be addressed as soon as possible.';
  } else if (riskLevel === 'medium') {
    summary += 'Several issues should be addressed to improve security and code quality.';
  } else {
    summary += 'The repository appears to be in good condition with only minor issues.';
  }

  return summary;
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(
  dependencies: DependencyAnalysis,
  staticAnalysis: StaticAnalysisResult
): string[] {
  const recommendations: string[] = [];

  // Dependency recommendations
  if (dependencies.vulnerable.length > 0) {
    recommendations.push('Update vulnerable dependencies to secure versions immediately');
    recommendations.push('Set up automated dependency scanning in your CI/CD pipeline');
  }

  if (dependencies.outdated.length > 0) {
    recommendations.push('Update outdated dependencies to latest stable versions');
    recommendations.push('Consider using dependency management tools like Dependabot or Renovate');
  }

  // Static analysis recommendations
  const securityErrors = staticAnalysis.errors.filter(e => 
    e.rule?.includes('security') || e.message.toLowerCase().includes('security')
  );
  
  if (securityErrors.length > 0) {
    recommendations.push('Fix security vulnerabilities found in static analysis');
    recommendations.push('Implement input validation and sanitization');
    recommendations.push('Add security linting rules to prevent future issues');
  }

  const performanceIssues = staticAnalysis.errors.filter(e => 
    e.rule?.includes('performance') || e.message.toLowerCase().includes('sync')
  );
  
  if (performanceIssues.length > 0) {
    recommendations.push('Replace synchronous operations with asynchronous alternatives');
    recommendations.push('Implement proper error handling for async operations');
  }

  // General recommendations
  if (staticAnalysis.summary.totalWarnings > 5) {
    recommendations.push('Set up code linting and formatting tools (ESLint, Prettier, etc.)');
    recommendations.push('Establish code review processes to catch issues early');
  }

  // Add some general best practices if no specific issues found
  if (recommendations.length === 0) {
    recommendations.push('Continue following security best practices');
    recommendations.push('Keep dependencies updated regularly');
    recommendations.push('Maintain good code quality standards');
  }

  return recommendations.slice(0, 6); // Limit to 6 recommendations
}

/**
 * Generate priority fixes that should be addressed first
 */
function generatePriorityFixes(
  dependencies: DependencyAnalysis,
  staticAnalysis: StaticAnalysisResult
): string[] {
  const priorityFixes: string[] = [];

  // Critical vulnerabilities first
  const criticalVulns = dependencies.vulnerable.filter(v => v.severity === 'critical');
  criticalVulns.forEach(vuln => {
    priorityFixes.push(`Update ${vuln.name} to fix: ${vuln.vulnerability}`);
  });

  // High severity vulnerabilities
  const highVulns = dependencies.vulnerable.filter(v => v.severity === 'high');
  highVulns.forEach(vuln => {
    priorityFixes.push(`Update ${vuln.name} to fix: ${vuln.vulnerability}`);
  });

  // Critical static analysis errors
  const criticalErrors = staticAnalysis.errors.filter(e => 
    e.severity === 'error' && (
      e.rule?.includes('security') || 
      e.message.toLowerCase().includes('injection') ||
      e.message.toLowerCase().includes('eval')
    )
  );
  
  criticalErrors.forEach(error => {
    priorityFixes.push(`Fix ${error.message.toLowerCase()} in ${error.file}:${error.line}`);
  });

  // High severity outdated dependencies
  const highOutdated = dependencies.outdated.filter(d => d.severity === 'high');
  highOutdated.forEach(dep => {
    priorityFixes.push(`Update ${dep.name} from ${dep.current} to ${dep.latest}`);
  });

  return priorityFixes.slice(0, 5); // Limit to top 5 priority fixes
}