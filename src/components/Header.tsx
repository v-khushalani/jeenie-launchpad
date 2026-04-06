import React, { useState } from 'react';
import { Menu, X, LogOut, ChevronDown, Shield, Trophy, Award, LayoutDashboard, BookOpen, Brain, BarChart3, Home, HelpCircle, FileText, Settings, User as UserIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { logger } from '@/utils/logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signOut, isPremium, user, userRole } = useAuth();
  const { isAdmin } = useAdminAuth();

  const handleNavigation = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const publicNavItems = [
    { name: 'Home', path: '/' },
    { name: 'Why Us', path: '/why-us' },
  ];

  const isEducator = userRole === 'educator';

  const navItems = isAuthenticated ? (
    isAdmin ? [
      { name: 'Dashboard', path: '/admin' },
      { name: 'Analytics', path: '/admin/analytics' },
      { name: 'Users', path: '/admin/users' },
      { name: 'Content', path: '/admin/content' },
    ] : isEducator ? [
      { name: 'Educator Portal', path: '/educator' },
    ] : [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Study Now', path: '/study-now' },
      { name: 'AI Planner', path: '/ai-planner' },
      { name: 'Tests', path: '/tests' },
      { name: 'Analytics', path: '/analytics' },
      
    ]
  ) : publicNavItems;

  const handleLogout = async () => {
    try {
      setIsMenuOpen(false);
      await signOut();
      window.location.href = '/';
    } catch (error) {
      logger.error('Logout error:', error);
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const mobileNavIcons: Record<string, React.ReactNode> = {
    Home: <Home className="w-4 h-4" />,
    'Why Us': <HelpCircle className="w-4 h-4" />,
    Dashboard: <LayoutDashboard className="w-4 h-4" />,
    Study: <BookOpen className="w-4 h-4" />,
    'Study Now': <BookOpen className="w-4 h-4" />,
    'AI Planner': <Brain className="w-4 h-4" />,
    Tests: <FileText className="w-4 h-4" />,
    Analytics: <BarChart3 className="w-4 h-4" />,
    Profile: <UserIcon className="w-4 h-4" />,
    Badges: <Award className="w-4 h-4" />,
    Settings: <Settings className="w-4 h-4" />,
    Admin: <Shield className="w-4 h-4" />,
  };

  const mobilePrimaryNavItems = isAuthenticated && !isAdmin && !isEducator
    ? [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Study', path: '/study-now' },
        { name: 'Tests', path: '/tests' },
        { name: 'Profile', path: '/profile' },
      ]
    : navItems;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
          >
            <img 
              src="/logo.png" 
              alt="JEEnie" 
              className="w-9 h-9 rounded-lg object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <span className="font-bold text-xl text-primary">
              JEEnie
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.path)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'bg-primary text-white'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {item.name}
              </button>
            ))}
          </nav>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-9 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-medium">
                      {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-sm font-semibold text-foreground max-w-[120px] truncate">
                        {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                      </span>
                      {isPremium && (
                         <span className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-0.5">
                           <Trophy className="w-2 h-2" /> Premium
                         </span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 glass-card border-border/50 shadow-apple-lg p-1">
                  <DropdownMenuItem onClick={() => handleNavigation('/profile')} className="rounded-lg cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>Profile</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/badges')} className="rounded-lg cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Badges</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/settings')} className="rounded-lg cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span>⚙️</span>
                      <span>Settings</span>
                    </div>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => handleNavigation('/admin')} className="rounded-lg cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600" />
                        <span className="text-purple-600 font-medium">Admin</span>
                      </div>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-600 rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <Button 
                className="bg-primary hover:bg-primary/90 text-white px-6 h-9 rounded-lg font-semibold shadow-apple transition-all duration-200 hover:shadow-apple-lg"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 max-h-[calc(100dvh-var(--app-header-height))] overflow-y-auto">
            <nav className="flex flex-col gap-1">
              {mobilePrimaryNavItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.path)}
                  className={`text-left px-4 py-3 rounded-xl font-medium transition-all border-l-4 ${
                    location.pathname === item.path
                      ? 'bg-[#013062]/10 text-[#013062] border-l-[#013062] shadow-sm'
                      : 'text-foreground border-l-transparent hover:bg-[#e6eeff]/30 hover:border-l-[#e6eeff]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={location.pathname === item.path ? 'text-[#013062]' : 'text-muted-foreground'}>
                      {mobileNavIcons[item.name] || <LayoutDashboard className="w-4 h-4" />}
                    </span>
                    <span>{item.name}</span>
                  </div>
                </button>
              ))}
              
              <div className="pt-3 mt-3 border-t border-border/50 space-y-1">
                {isAuthenticated ? (
                  <>
                    <Button 
                      variant="ghost"
                      className="w-full justify-start h-12 rounded-xl bg-[#e6eeff]/30 hover:bg-[#e6eeff]/50 border border-[#e6eeff]"
                      onClick={() => handleNavigation('/badges')}
                    >
                      <div className="flex items-center gap-3">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Badges</span>
                      </div>
                    </Button>
                    <Button 
                      variant="ghost"
                      className="w-full justify-start h-12 rounded-xl bg-[#e6eeff]/30 hover:bg-[#e6eeff]/50 border border-[#e6eeff]"
                      onClick={() => handleNavigation('/settings')}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-4 h-4 text-[#013062]" />
                        <span>Settings</span>
                      </div>
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="ghost"
                        className="w-full justify-start h-12 rounded-xl bg-[#e6eeff]/30 hover:bg-[#e6eeff]/50 border border-[#e6eeff]"
                        onClick={() => handleNavigation('/admin')}
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="w-4 h-4 text-purple-600" />
                          <span className="text-purple-600 font-medium">Admin</span>
                        </div>
                      </Button>
                    )}
                    <Button 
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full justify-start h-12 rounded-xl border border-red-200 bg-red-50/70 text-red-700 hover:bg-red-100/70 hover:text-red-700"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </div>
                    </Button>
                  </>
                ) : (
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl shadow-apple"
                    onClick={() => handleNavigation('/login')}
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
