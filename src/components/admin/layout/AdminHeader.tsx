import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Eye, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

const routeTitles: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/analytics': 'Analytics',
  '/admin/users': 'User Management',
  '/admin/reports': 'Reports',
  '/admin/notifications': 'Notifications',
  '/admin/content': 'Content Manager',
  '/admin/topics': 'Topics',
  '/admin/exam-config': 'Exam Config',
  '/admin/questions': 'Question Bank',
  '/admin/pdf-extract': 'PDF Extractor',
  '/admin/review-queue': 'Review Queue',
  '/admin/auto-assign': 'Auto-Assignment',
  '/admin/batches': 'Batch Manager',
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  
  const pageTitle = routeTitles[location.pathname] || 'Admin';

  const handleViewAsUser = () => {
    window.open('/study-now', '_blank');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary hidden lg:block" />
          <h1 className="text-base lg:text-lg font-semibold text-foreground">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewAsUser}
          className="gap-1.5 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">View as User</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default AdminHeader;
