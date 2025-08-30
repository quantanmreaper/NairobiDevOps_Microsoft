'use client';

import { Repository } from '@repo-guardian/shared';
import { 
  FolderIcon,
  StarIcon,
  CodeBracketIcon,
  CalendarIcon,
  EyeIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface RepositoryCardProps {
  repository: Repository;
  onView: () => void;
  onAnalyze: () => void;
}

export function RepositoryCard({ repository, onView, onAnalyze }: RepositoryCardProps) {
  return (
    <Card hover className="h-full">
      <CardBody className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <FolderIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {repository.name}
            </h3>
          </div>
          {repository.isPrivate && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              Private
            </span>
          )}
        </div>

        {repository.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {repository.description}
          </p>
        )}

        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
          {repository.language && (
            <div className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded-full ${getLanguageColor(repository.language)}`} />
              <span>{repository.language}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <StarIcon className="h-3 w-3" />
            <span>{repository.stars}</span>
          </div>

          <div className="flex items-center space-x-1">
            <CodeBracketIcon className="h-3 w-3" />
            <span>{repository.forks}</span>
          </div>
        </div>

        {repository.lastCommit && (
          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
            <CalendarIcon className="h-3 w-3" />
            <span>Updated {formatDistanceToNow(new Date(repository.lastCommit), { addSuffix: true })}</span>
          </div>
        )}

        <div className="mt-auto flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            onClick={onAnalyze}
            className="flex-1 bg-primary-600 hover:bg-primary-700"
          >
            <PlayIcon className="h-4 w-4 mr-1" />
            Analyze
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    javascript: 'bg-yellow-400',
    typescript: 'bg-blue-500',
    python: 'bg-green-500',
    java: 'bg-orange-500',
    cpp: 'bg-blue-600',
    c: 'bg-gray-600',
    csharp: 'bg-purple-500',
    php: 'bg-indigo-500',
    ruby: 'bg-red-500',
    go: 'bg-cyan-500',
    rust: 'bg-orange-600',
    swift: 'bg-orange-400',
    kotlin: 'bg-purple-600',
    scala: 'bg-red-600',
    html: 'bg-orange-500',
    css: 'bg-blue-400',
    scss: 'bg-pink-500',
    json: 'bg-gray-500',
    markdown: 'bg-gray-700',
  };

  return colors[language.toLowerCase()] || 'bg-gray-400';
}