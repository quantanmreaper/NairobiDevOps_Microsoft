'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ShieldCheckIcon, 
  ArrowLeftIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [githubUrl, setGithubUrl] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    // Handle GitHub OAuth callback
    const code = searchParams.get('code');
    if (code) {
      handleGithubCallback(code);
    }

    // Get GitHub OAuth URL
    fetchGithubUrl();
  }, [searchParams]);

  const fetchGithubUrl = async () => {
    try {
      const response = await authApi.getGithubUrl();
      if (response.success && response.data) {
        setGithubUrl(response.data.url);
      }
    } catch (error) {
      console.error('Failed to get GitHub URL:', error);
    }
  };

  const handleGithubCallback = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.githubLogin(code);
      if (response.success && response.data) {
        login(response.data.token, response.data.user);
        toast.success('Successfully logged in with GitHub!');
        router.push('/dashboard');
      } else {
        toast.error(response.error || 'GitHub login failed');
      }
    } catch (error: any) {
      console.error('GitHub login error:', error);
      toast.error(error.response?.data?.message || 'GitHub login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = () => {
    if (githubUrl) {
      window.location.href = githubUrl;
    } else {
      toast.error('GitHub OAuth not configured');
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.demoLogin();
      if (response.success && response.data) {
        login(response.data.token, response.data.user);
        toast.success('Welcome to the demo!');
        router.push('/dashboard');
      } else {
        toast.error(response.error || 'Demo login failed');
      }
    } catch (error: any) {
      console.error('Demo login error:', error);
      toast.error(error.response?.data?.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center space-x-2 mb-4"
          >
            <ShieldCheckIcon className="h-10 w-10 text-primary-400" />
            <span className="text-2xl font-bold text-white">Repo Guardian</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-300">
              Sign in to analyze your repositories and improve code quality
            </p>
          </motion.div>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardBody className="space-y-6">
              {/* GitHub Login */}
              <Button
                onClick={handleGithubLogin}
                disabled={isLoading || !githubUrl}
                loading={isLoading}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white border border-gray-700"
                size="lg"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                Continue with GitHub
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-gray-300">or</span>
                </div>
              </div>

              {/* Demo Login */}
              <Button
                onClick={handleDemoLogin}
                disabled={isLoading}
                loading={isLoading}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
                size="lg"
              >
                <PlayIcon className="w-5 h-5 mr-3" />
                Try Demo Mode
              </Button>

              {/* Demo Info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <PlayIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-300 mb-1">
                      Demo Mode
                    </h3>
                    <p className="text-sm text-blue-200">
                      Explore Repo Guardian with a pre-loaded vulnerable repository. 
                      No GitHub account required.
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-6"
        >
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-gray-300 hover:text-white"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 grid grid-cols-1 gap-4"
        >
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-4">
              What you'll get:
            </h3>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>AI-powered security analysis</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <span>Performance optimization suggestions</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full" />
                <span>Automated code fixes and PRs</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                <span>Interactive repository chat</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}