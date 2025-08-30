'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  PlusIcon,
  FolderIcon,
  ShieldExclamationIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth';
import { repositoryApi } from '@/lib/api';
import { Repository } from '@repo-guardian/shared';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RepositoryCard } from '@/components/repository/repository-card';
import { AddRepositoryModal } from '@/components/repository/add-repository-modal';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({
    totalRepos: 0,
    totalIssues: 0,
    criticalIssues: 0,
    lastAnalysis: null as Date | null,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    fetchRepositories();
  }, [isAuthenticated, router]);

  const fetchRepositories = async () => {
    try {
      setIsLoading(true);
      const response = await repositoryApi.getRepositories({ limit: 10 });
      
      if (response.success && response.data) {
        setRepositories(response.data);
        
        // Calculate stats
        const totalRepos = response.pagination?.total || response.data.length;
        let totalIssues = 0;
        let criticalIssues = 0;
        let lastAnalysis: Date | null = null;

        // In a real app, you'd fetch analysis stats for each repo
        // For demo, we'll use mock data
        if (response.data.length > 0) {
          totalIssues = Math.floor(Math.random() * 50) + 10;
          criticalIssues = Math.floor(totalIssues * 0.2);
          lastAnalysis = new Date();
        }

        setStats({
          totalRepos,
          totalIssues,
          criticalIssues,
          lastAnalysis,
        });
      }
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      toast.error('Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepositoryAdded = (repository: Repository) => {
    setRepositories(prev => [repository, ...prev]);
    setStats(prev => ({ ...prev, totalRepos: prev.totalRepos + 1 }));
    toast.success('Repository added successfully!');
  };

  const handleAnalyzeRepository = (repositoryId: string) => {
    router.push(`/repository/${repositoryId}/analysis`);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor and improve your code quality with AI-powered analysis
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Repository
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardBody className="flex items-center">
                <div className="flex-shrink-0">
                  <FolderIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Repositories
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalRepos}
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardBody className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldExclamationIcon className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Issues
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalIssues}
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardBody className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Critical Issues
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.criticalIssues}
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardBody className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Last Analysis
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.lastAnalysis 
                      ? formatDistanceToNow(stats.lastAnalysis, { addSuffix: true })
                      : 'Never'
                    }
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </div>

        {/* Repositories Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Your Repositories
            </h2>
            {repositories.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => router.push('/repositories')}
                className="text-primary-600 hover:text-primary-700"
              >
                View All
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardBody>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : repositories.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No repositories yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Get started by adding your first repository for analysis
                </p>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Repository
                </Button>
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {repositories.map((repository, index) => (
                <motion.div
                  key={repository.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <RepositoryCard
                    repository={repository}
                    onAnalyze={() => handleAnalyzeRepository(repository.id)}
                    onView={() => router.push(`/repository/${repository.id}`)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {repositories.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/repositories')}
                  className="justify-start"
                >
                  <FolderIcon className="h-5 w-5 mr-3" />
                  Manage Repositories
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/analysis')}
                  className="justify-start"
                >
                  <ChartBarIcon className="h-5 w-5 mr-3" />
                  View All Analysis
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(true)}
                  className="justify-start"
                >
                  <PlusIcon className="h-5 w-5 mr-3" />
                  Add Repository
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Add Repository Modal */}
      <AddRepositoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onRepositoryAdded={handleRepositoryAdded}
      />
    </DashboardLayout>
  );
}