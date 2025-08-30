'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  HomeIcon,
  FolderIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Repositories', href: '/repositories', icon: FolderIcon },
  { name: 'Analysis', href: '/analysis', icon: ShieldCheckIcon },
  { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      logout(); // Force logout even if API call fails
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <ShieldCheckIcon className="h-8 w-8 text-primary-600" />
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    Repo Guardian
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </Button>
              </div>
              <SidebarContent onNavigate={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex h-16 shrink-0 items-center px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Repo Guardian
              </span>
            </div>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            
            {/* User menu */}
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="flex items-center space-x-3">
                {user?.avatarUrl ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.avatarUrl}
                    alt={user.username}
                  />
                ) : (
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                )}
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <nav className="flex flex-1 flex-col px-4 py-4">
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <item.icon className="h-6 w-6 shrink-0" />
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </nav>
  );
}