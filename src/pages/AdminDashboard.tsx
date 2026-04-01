import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  BarChart3, Users, BookOpen, Bell, FileText,
  CheckSquare, Zap, Home, Package, Settings,
  Eye, LogOut, Shield, ChevronRight, ToggleLeft,
  Download,
} from 'lucide-react';

// Lazy load heavy admin components
const DashboardOverview = lazy(() => import('@/components/admin/dashboard/DashboardOverview'));
const UnifiedContentManager = lazy(() => import('@/components/admin/UnifiedContentManager').then(m => ({ default: m.UnifiedContentManager })));
const AdminAnalytics = lazy(() => import('@/components/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const UserManagement = lazy(() => import('@/components/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const ExamDateManager = lazy(() => import('@/components/admin/ExamDateManager'));
const NotificationManager = lazy(() => import('@/components/admin/NotificationManager').then(m => ({ default: m.NotificationManager })));
const PDFQuestionExtractor = lazy(() => import('@/components/admin/PDFQuestionExtractor').then(m => ({ default: m.PDFQuestionExtractor })));
const ExtractionReviewQueue = lazy(() => import('@/components/admin/ExtractionReviewQueue').then(m => ({ default: m.ExtractionReviewQueue })));
const AutoTopicAssignment = lazy(() => import('@/components/admin/AutoTopicAssignment').then(m => ({ default: m.AutoTopicAssignment })));
const BatchManager = lazy(() => import('@/components/admin/BatchManager').then(m => ({ default: m.BatchManager })));
const EducatorContentManager = lazy(() => import('@/components/admin/EducatorContentManager'));
const FeatureFlagManager = lazy(() => import('@/components/admin/FeatureFlagManager'));
const BulkImportManager = lazy(() => import('@/components/admin/BulkImportManager').then(m => ({ default: m.BulkImportManager })));

const UserReports = lazy(() => import('@/components/admin/UserReports').then(m => ({ default: m.UserReports })));
const QuestionReportsManager = lazy(() => import('@/components/admin/QuestionReportsManager').then(m => ({ default: m.QuestionReportsManager })));

// ─── Nav Config ────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  group: 'main' | 'content' | 'tools';
}

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('extracted_questions_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingReviewCount(count || 0);
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: Home, group: 'main' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'main' },
    { id: 'users', label: 'Users', icon: Users, group: 'main' },
    { id: 'user-reports', label: 'User Reports', icon: FileText, group: 'main' },
    { id: 'notifications', label: 'Notifications', icon: Bell, group: 'main' },
    { id: 'content', label: 'Content', icon: BookOpen, group: 'content' },
    
    { id: 'educator-content', label: 'Educator Content', icon: FileText, group: 'content' },
    { id: 'batches', label: 'Batches', icon: Package, group: 'content' },
    { id: 'exam-config', label: 'Exam Config', icon: Settings, group: 'content' },
    { id: 'pdf-extract', label: 'PDF Extractor', icon: FileText, group: 'tools' },
    { id: 'review-queue', label: 'Review Queue', icon: CheckSquare, badge: pendingReviewCount, group: 'tools' },
    { id: 'auto-assign', label: 'Auto-Assign', icon: Zap, group: 'tools' },
    { id: 'bulk-import', label: 'Bulk Import', icon: Download, group: 'tools' },
    { id: 'feature-flags', label: 'Feature Flags', icon: ToggleLeft, group: 'tools' },
    { id: 'question-reports', label: 'Question Reports', icon: Eye, group: 'main' },
  ];

  const getCurrentSection = (): string => {
    const path = location.pathname;
    if (path === '/admin') return 'overview';
    const match = path.match(/\/admin\/(.+)/);
    if (match) {
      const item = navItems.find(i => i.id === match[1]);
      if (item) return item.id;
    }
    return 'overview';
  };

  const currentSection = getCurrentSection();

  const handleNavigation = (id: string) => {
    navigate(id === 'overview' ? '/admin' : `/admin/${id}`);
  };

  const sectionTitles: Record<string, string> = {
    overview: 'Dashboard',
    analytics: 'Analytics',
    users: 'User Management',
    'user-reports': 'User Reports',
    notifications: 'Notifications',
    content: 'Content Manager',
    chapters: 'Chapter Manager',
    batches: 'Batch Manager',
    'educator-content': 'Educator Content',
    'exam-config': 'Exam Configuration',
    'pdf-extract': 'PDF Extractor',
    'review-queue': 'Review Queue',
    'auto-assign': 'Auto-Assignment',
    'bulk-import': 'Bulk Import',
    'feature-flags': 'Feature Flags',
    'question-reports': 'Question Reports',
  };

  const renderContent = () => {
    switch (currentSection) {
      case 'overview': return <DashboardOverview />;
      case 'content': return <UnifiedContentManager />;
      
      case 'educator-content': return <EducatorContentManager />;
      case 'batches': return <BatchManager />;
      case 'analytics': return <AdminAnalytics />;
      case 'users': return <UserManagement />;
      case 'user-reports': return <UserReports />;
      case 'notifications': return <NotificationManager />;
      case 'exam-config': return <ExamDateManager />;
      case 'pdf-extract': return <PDFQuestionExtractor />;
      case 'review-queue': return <ExtractionReviewQueue />;
      case 'auto-assign': return <AutoTopicAssignment />;
      case 'bulk-import': return <BulkImportManager />;
      case 'feature-flags': return <FeatureFlagManager />;
      case 'question-reports': return <QuestionReportsManager />;
      default: return <DashboardOverview />;
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        {/* ─── Sidebar ─────────────────────────────────── */}
        <Sidebar collapsible="icon" className="border-r border-border z-50">
          <SidebarContent>
            {/* Logo / Brand */}
            <div className="p-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm text-foreground group-data-[collapsible=icon]:hidden">
                Admin Panel
              </span>
            </div>

            <Separator className="mx-2" />

            {/* Main Group */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                Dashboard
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.filter(i => i.group === 'main').map(item => (
                    <NavItemButton
                      key={item.id}
                      item={item}
                      isActive={currentSection === item.id}
                      onClick={() => handleNavigation(item.id)}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Content Group */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                Content
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.filter(i => i.group === 'content').map(item => (
                    <NavItemButton
                      key={item.id}
                      item={item}
                      isActive={currentSection === item.id}
                      onClick={() => handleNavigation(item.id)}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Tools Group */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                AI Tools
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.filter(i => i.group === 'tools').map(item => (
                    <NavItemButton
                      key={item.id}
                      item={item}
                      isActive={currentSection === item.id}
                      onClick={() => handleNavigation(item.id)}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* ─── Main Area ───────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-foreground">
                  {sectionTitles[currentSection] || 'Admin'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/study-now', '_blank')}
                className="gap-1.5 text-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View as User</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 lg:p-6 max-w-7xl">
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              }>
                {renderContent()}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

// ─── Nav Item Sub-component ──────────────────────────────

interface NavItemButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

const NavItemButton: React.FC<NavItemButtonProps> = ({ item, isActive, onClick }) => {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={onClick}
        isActive={isActive}
        tooltip={item.label}
        className={cn(
          'transition-colors',
          isActive && 'bg-primary/10 text-primary font-medium'
        )}
      >
        <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && item.badge > 0 && (
          <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold">
            {item.badge > 99 ? '99+' : item.badge}
          </Badge>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export default AdminDashboard;
