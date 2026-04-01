import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { 
  Activity,
  UserPlus,
  FileQuestion,
  CheckCircle,
  Clock
} from 'lucide-react';
import { logger } from '@/utils/logger';

interface ActivityItem {
  id: string;
  type: 'user_signup' | 'question_attempt' | 'question_added';
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export const RecentActivity: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent signups
      const { data: recentUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (usersError) throw usersError;

      // Fetch recent question attempts
      const { data: recentAttempts, error: attemptsError } = await supabase
        .from('question_attempts')
        .select('id, is_correct, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (attemptsError) throw attemptsError;

      // Combine and sort activities
      const allActivities: ActivityItem[] = [
        ...(recentUsers || []).map(user => ({
          id: `user-${user.id}`,
          type: 'user_signup' as const,
          description: `${user.full_name || 'New user'} joined the platform`,
          timestamp: user.created_at || new Date().toISOString(),
        })),
        ...(recentAttempts || []).map(attempt => ({
          id: `attempt-${attempt.id}`,
          type: 'question_attempt' as const,
          description: attempt.is_correct 
            ? 'A question was answered correctly'
            : 'A question was attempted',
          timestamp: attempt.created_at || new Date().toISOString(),
          metadata: { isCorrect: attempt.is_correct }
        })),
      ];

      // Sort by timestamp
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, 8));
    } catch (error) {
      logger.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return UserPlus;
      case 'question_attempt':
        return FileQuestion;
      case 'question_added':
        return CheckCircle;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string, metadata?: Record<string, any>) => {
    switch (type) {
      case 'user_signup':
        return 'text-blue-500 bg-blue-500/10';
      case 'question_attempt':
        return metadata?.isCorrect 
          ? 'text-emerald-500 bg-emerald-500/10'
          : 'text-amber-500 bg-amber-500/10';
      default:
        return 'text-muted-foreground bg-accent';
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-lg bg-accent" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-accent rounded" />
                    <div className="h-3 w-1/4 bg-accent rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                const colorClass = getActivityColor(activity.type, activity.metadata);
                
                return (
                  <div 
                    key={activity.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    {activity.type === 'question_attempt' && (
                      <Badge 
                        variant="secondary" 
                        className={activity.metadata?.isCorrect 
                          ? 'bg-emerald-500/10 text-emerald-600 border-0'
                          : 'bg-amber-500/10 text-amber-600 border-0'
                        }
                      >
                        {activity.metadata?.isCorrect ? 'Correct' : 'Attempted'}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
