'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  LinkIcon,
  CloudArrowUpIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { Repository } from '@repo-guardian/shared';
import { repositoryApi, uploadApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepositoryAdded: (repository: Repository) => void;
}

type TabType = 'github' | 'upload';

export function AddRepositoryModal({ isOpen, onClose, onRepositoryAdded }: AddRepositoryModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('github');
  const [isLoading, setIsLoading] = useState(false);
  
  // GitHub form state
  const [githubUrl, setGithubUrl] = useState('');
  const [repoName, setRepoName] = useState('');
  const [repoDescription, setRepoDescription] = useState('');

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/zip': ['.zip'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setUploadedFile(acceptedFiles[0]);
      }
    },
    onDropRejected: (rejectedFiles) => {
      const error = rejectedFiles[0]?.errors[0];
      if (error?.code === 'file-too-large') {
        toast.error('File is too large. Maximum size is 100MB.');
      } else if (error?.code === 'file-invalid-type') {
        toast.error('Only ZIP files are supported.');
      } else {
        toast.error('File upload failed.');
      }
    },
  });

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!githubUrl.trim()) {
      toast.error('Please enter a GitHub repository URL');
      return;
    }

    setIsLoading(true);
    try {
      const response = await repositoryApi.addGithubRepository({
        url: githubUrl.trim(),
        name: repoName.trim() || undefined,
        description: repoDescription.trim() || undefined,
      });

      if (response.success && response.data) {
        onRepositoryAdded(response.data);
        handleClose();
      } else {
        toast.error(response.error || 'Failed to add repository');
      }
    } catch (error: any) {
      console.error('Add repository error:', error);
      toast.error(error.response?.data?.message || 'Failed to add repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadedFile) {
      toast.error('Please select a ZIP file to upload');
      return;
    }

    setIsLoading(true);
    try {
      const response = await uploadApi.uploadZip(uploadedFile, {
        name: repoName.trim() || undefined,
        description: repoDescription.trim() || undefined,
      });

      if (response.success && response.data) {
        // Convert upload response to Repository format
        const repository: Repository = {
          id: response.data.id,
          name: response.data.name,
          fullName: response.data.fullName,
          description: response.data.description,
          url: `file://${uploadedFile.name}`,
          isPrivate: false,
          language: response.data.languages[0]?.language || 'unknown',
          stars: 0,
          forks: 0,
          createdAt: new Date(),
        };

        onRepositoryAdded(repository);
        handleClose();
        toast.success(`Repository uploaded with ${response.data.filesCount} files`);
      } else {
        toast.error(response.error || 'Failed to upload repository');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setGithubUrl('');
    setRepoName('');
    setRepoDescription('');
    setUploadedFile(null);
    setActiveTab('github');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add Repository
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </CardHeader>

              <CardBody className="space-y-6">
                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('github')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'github'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <LinkIcon className="h-4 w-4" />
                    <span>GitHub URL</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'upload'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <CloudArrowUpIcon className="h-4 w-4" />
                    <span>Upload ZIP</span>
                  </button>
                </div>

                {/* GitHub Tab */}
                {activeTab === 'github' && (
                  <form onSubmit={handleGithubSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Repository URL *
                      </label>
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/username/repository"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Custom Name (optional)
                      </label>
                      <input
                        type="text"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        placeholder="Leave empty to use repository name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        value={repoDescription}
                        onChange={(e) => setRepoDescription(e.target.value)}
                        placeholder="Brief description of the repository"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="flex-1"
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        loading={isLoading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700"
                      >
                        Add Repository
                      </Button>
                    </div>
                  </form>
                )}

                {/* Upload Tab */}
                {activeTab === 'upload' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Upload ZIP File
                      </label>
                      <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                          isDragActive
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                        }`}
                      >
                        <input {...getInputProps()} />
                        <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        {uploadedFile ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {uploadedFile.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {isDragActive
                                ? 'Drop the ZIP file here...'
                                : 'Drag & drop a ZIP file here, or click to select'
                              }
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Maximum file size: 100MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Repository Name (optional)
                      </label>
                      <input
                        type="text"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        placeholder="Leave empty to use filename"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        value={repoDescription}
                        onChange={(e) => setRepoDescription(e.target.value)}
                        placeholder="Brief description of the repository"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="flex-1"
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleFileUpload}
                        loading={isLoading}
                        disabled={!uploadedFile}
                        className="flex-1 bg-primary-600 hover:bg-primary-700"
                      >
                        Upload Repository
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}