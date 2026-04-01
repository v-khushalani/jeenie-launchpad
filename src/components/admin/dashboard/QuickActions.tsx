import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Bell, 
  HelpCircle, 
  FileText, 
  Upload, 
  BookOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface QuickAction {
  path: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: 'purple' | 'blue' | 'green' | 'orange' | 'rose' | 'cyan';
}

const quickActions: QuickAction[] = [
  { 
    path: '/admin/users', 
    label: 'Manage Users', 
    description: 'View and edit user accounts',
    icon: Users, 
    color: 'purple' 
  },
  { 
    path: '/admin/notifications', 
    label: 'Send Notification', 
    description: 'Broadcast announcements',
    icon: Bell, 
    color: 'blue' 
  },
  { 
    path: '/admin/questions', 
    label: 'Question Bank', 
    description: 'Add or edit questions',
    icon: HelpCircle, 
    color: 'green' 
  },
  { 
    path: '/admin/pdf-extract', 
    label: 'Extract Questions', 
    description: 'Upload and process PDFs',
    icon: Upload, 
    color: 'orange' 
  },
  { 
    path: '/admin/content', 
    label: 'Manage Content', 
    description: 'Organize chapters & topics',
    icon: BookOpen, 
    color: 'rose' 
  },
  { 
    path: '/admin/reports', 
    label: 'Export Reports', 
    description: 'Download analytics data',
    icon: FileText, 
    color: 'cyan' 
  },
];

const colorClasses = {
  purple: 'text-violet-500 bg-violet-500/10 group-hover:bg-violet-500/20',
  blue: 'text-blue-500 bg-blue-500/10 group-hover:bg-blue-500/20',
  green: 'text-emerald-500 bg-emerald-500/10 group-hover:bg-emerald-500/20',
  orange: 'text-orange-500 bg-orange-500/10 group-hover:bg-orange-500/20',
  rose: 'text-rose-500 bg-rose-500/10 group-hover:bg-rose-500/20',
  cyan: 'text-cyan-500 bg-cyan-500/10 group-hover:bg-cyan-500/20',
};

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={cn(
                  "group p-4 rounded-xl border border-border/50 hover:border-border",
                  "bg-card hover:bg-accent/30 transition-all duration-200",
                  "text-left flex items-start gap-3"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  colorClasses[action.color]
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground text-sm">{action.label}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
