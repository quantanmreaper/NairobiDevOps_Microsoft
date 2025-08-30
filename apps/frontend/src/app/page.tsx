'use client';

import { useState } from 'react';
import { Shield, Github, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { analyzeRepository } from '@/lib/api';
import type { AnalysisResult } from '@/types/analysis';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle repository analysis
   * Calls the backend API and displays results
   */
  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      console.log('Starting analysis for:', repoUrl);
      const analysisResults = await analyzeRepository(repoUrl);
      setResults(analysisResults);
      console.log('Analysis completed:', analysisResults);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Handle demo analysis
   * Uses hardcoded demo repository
   */
  const handleDemo = async () => {
    setRepoUrl('demo');
    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const analysisResults = await analyzeRepository('demo');
      setResults(analysisResults);
    } catch (err) {
      console.error('Demo analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Demo analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Repo Guardian</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered repository analysis for security vulnerabilities, outdated dependencies, and code quality issues
          </p>
        </div>

        {/* Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Github className="h-5 w-5 mr-2" />
              Repository Analysis
            </CardTitle>
            <CardDescription>
              Enter a GitHub repository URL to analyze for security and quality issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input
                type="url"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="flex-1"
                disabled={isAnalyzing}
              />
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing}
                className="min-w-[120px]"
              >
                {isAnalyzing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Repository'
                )}
              </Button>
            </div>
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={handleDemo}
                disabled={isAnalyzing}
              >
                Try Demo Repository
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center text-red-800">
                <XCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            {/* Repository Info */}
            <Card>
              <CardHeader>
                <CardTitle>Repository Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold">{results.repository.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Language</p>
                    <Badge variant="secondary">{results.repository.language}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">URL</p>
                    <p className="font-mono text-sm truncate">{results.repository.url}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className={`h-5 w-5 mr-2 ${
                    results.aiSummary.riskLevel === 'critical' ? 'text-red-600' :
                    results.aiSummary.riskLevel === 'high' ? 'text-orange-600' :
                    results.aiSummary.riskLevel === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`} />
                  AI Risk Assessment
                  <Badge 
                    variant={results.aiSummary.riskLevel === 'low' ? 'default' : 'destructive'}
                    className="ml-2"
                  >
                    {results.aiSummary.riskLevel.toUpperCase()} RISK
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{results.aiSummary.summary}</p>
                
                {results.aiSummary.priorityFixes.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Priority Fixes:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {results.aiSummary.priorityFixes.map((fix, index) => (
                        <li key={index} className="text-sm text-gray-700">{fix}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Recommendations:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {results.aiSummary.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-700">{rec}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Dependencies */}
            <Card>
              <CardHeader>
                <CardTitle>Dependencies Analysis</CardTitle>
                <CardDescription>
                  Found {results.dependencies.total} total dependencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Outdated Dependencies */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                      Outdated Dependencies ({results.dependencies.outdated.length})
                    </h4>
                    {results.dependencies.outdated.length > 0 ? (
                      <div className="space-y-2">
                        {results.dependencies.outdated.map((dep, index) => (
                          <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{dep.name}</p>
                                <p className="text-sm text-gray-600">
                                  {dep.current} → {dep.latest}
                                </p>
                              </div>
                              <Badge variant={dep.severity === 'high' ? 'destructive' : 'secondary'}>
                                {dep.severity}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-green-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        All dependencies are up to date
                      </p>
                    )}
                  </div>

                  {/* Vulnerable Dependencies */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                      Vulnerable Dependencies ({results.dependencies.vulnerable.length})
                    </h4>
                    {results.dependencies.vulnerable.length > 0 ? (
                      <div className="space-y-2">
                        {results.dependencies.vulnerable.map((vuln, index) => (
                          <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">{vuln.name}</p>
                                <p className="text-sm text-gray-600">v{vuln.version}</p>
                              </div>
                              <Badge variant="destructive">
                                {vuln.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-red-700">{vuln.vulnerability}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-green-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        No known vulnerabilities found
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Static Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Static Analysis Results</CardTitle>
                <CardDescription>
                  Analyzed {results.staticAnalysis.summary.totalFiles} files - 
                  Found {results.staticAnalysis.summary.totalErrors} errors and {results.staticAnalysis.summary.totalWarnings} warnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.staticAnalysis.errors.length > 0 ? (
                  <div className="space-y-3">
                    {results.staticAnalysis.errors.map((error, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border ${
                          error.severity === 'error' 
                            ? 'bg-red-50 border-red-200' 
                            : error.severity === 'warning'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{error.file}:{error.line}</p>
                            {error.rule && (
                              <p className="text-sm text-gray-600">{error.rule}</p>
                            )}
                          </div>
                          <Badge 
                            variant={error.severity === 'error' ? 'destructive' : 'secondary'}
                          >
                            {error.severity}
                          </Badge>
                        </div>
                        <p className="text-sm">{error.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    No issues found in static analysis
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}