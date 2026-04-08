import React from 'react';
import { Home, BookOpen, User, Target, History } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const MobileNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const baseItems = isAuthenticated ? [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Study', path: '/study-now' },
    { icon: Target, label: 'Tests', path: '/tests' },
    { icon: History, label: 'History', path: '/test-history' },
    { icon: User, label: 'Profile', path: '/profile' }
  ] : [
    { icon: Home, label: 'Home', path: '/' },
    { icon: User, label: 'Sign In', path: '/login' }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border px-2 z-50 h-[var(--app-mobile-nav-height)]">
      <div className="flex h-full items-center justify-around max-w-md mx-auto pb-[env(safe-area-inset-bottom,0px)]">
        {baseItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-200 min-w-0 flex-1 ${
                isActive 
                  ? 'text-primary bg-secondary' 
                  : 'text-muted-foreground hover:text-primary hover:bg-secondary/50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
              <span className={`text-xs font-medium truncate ${isActive ? 'text-primary font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 bg-primary rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;
