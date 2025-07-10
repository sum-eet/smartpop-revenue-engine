import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppBridge } from '@/hooks/useAppBridge';
import { Button } from '@/components/ui/button';
import { Home, BarChart3, Settings, ArrowLeft } from 'lucide-react';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: <Home className="w-4 h-4" />,
  },
  {
    path: '/analytics',
    label: 'Analytics',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: <Settings className="w-4 h-4" />,
  },
];

interface EmbeddedNavigationProps {
  currentPath?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const EmbeddedNavigation: React.FC<EmbeddedNavigationProps> = ({
  currentPath = '',
  showBack = false,
  onBack,
}) => {
  const { isEmbedded, navigate: appBridgeNavigate } = useAppBridge();
  const reactNavigate = useNavigate();

  const handleNavigation = (path: string) => {
    if (isEmbedded) {
      // Use App Bridge navigation for embedded apps
      appBridgeNavigate(path);
    } else {
      // Use React Router for standalone apps
      reactNavigate(path);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (isEmbedded) {
      // Navigate back in embedded context
      appBridgeNavigate('/dashboard');
    } else {
      // Use browser back
      window.history.back();
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Back button or logo */}
          <div className="flex items-center">
            {showBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">SmartPop</h1>
            </div>
          </div>

          {/* Center - Navigation items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  variant={currentPath === item.path ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleNavigation(item.path)}
                  className="flex items-center"
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center">
            {!isEmbedded && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigation('/install')}
              >
                Install App
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant={currentPath === item.path ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleNavigation(item.path)}
              className="w-full justify-start"
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
};

// Hook for easy navigation with App Bridge support
export const useEmbeddedNavigation = () => {
  const { isEmbedded, navigate: appBridgeNavigate } = useAppBridge();
  const reactNavigate = useNavigate();

  const navigate = (path: string) => {
    if (isEmbedded) {
      appBridgeNavigate(path);
    } else {
      reactNavigate(path);
    }
  };

  return { navigate, isEmbedded };
};