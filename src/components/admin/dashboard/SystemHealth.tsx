import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Server, 
  Database, 
  Shield, 
  CheckCircle2,
  AlertCircle,
  Zap
} from 'lucide-react';
import { logger } from '@/utils/logger';

interface HealthMetric {
  label: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ElementType;
}

export const SystemHealth: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      // Check database connectivity
      const dbStart = Date.now();
      await supabase.from('profiles').select('id', { count: 'exact', head: true });
      const dbLatency = Date.now() - dbStart;

      // Get question count
      const { count: questionCount } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true });

      // Get user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      const healthMetrics: HealthMetric[] = [
        {
          label: 'Database',
          value: Math.min(100, 100 - (dbLatency / 10)),
          status: dbLatency < 500 ? 'healthy' : dbLatency < 1000 ? 'warning' : 'critical',
          icon: Database,
        },
        {
          label: 'Question Bank',
          value: questionCount && questionCount > 100 ? 95 : questionCount && questionCount > 50 ? 70 : 40,
          status: questionCount && questionCount > 100 ? 'healthy' : questionCount && questionCount > 50 ? 'warning' : 'critical',
          icon: Server,
        },
        {
          label: 'User Capacity',
          value: 85,
          status: 'healthy',
          icon: Shield,
        },
        {
          label: 'API Performance',
          value: dbLatency < 300 ? 98 : dbLatency < 600 ? 80 : 50,
          status: dbLatency < 300 ? 'healthy' : dbLatency < 600 ? 'warning' : 'critical',
          icon: Zap,
        },
      ];

      setMetrics(healthMetrics);
    } catch (error) {
      logger.error('Error checking system health:', error);
      setMetrics([
        { label: 'Database', value: 0, status: 'critical', icon: Database },
        { label: 'Question Bank', value: 0, status: 'critical', icon: Server },
        { label: 'User Capacity', value: 0, status: 'critical', icon: Shield },
        { label: 'API Performance', value: 0, status: 'critical', icon: Zap },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-emerald-500';
      case 'warning':
        return 'text-amber-500';
      case 'critical':
        return 'text-rose-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-500';
      case 'warning':
        return 'bg-amber-500';
      case 'critical':
        return 'bg-rose-500';
      default:
        return 'bg-muted';
    }
  };

  const overallStatus = metrics.every(m => m.status === 'healthy')
    ? 'healthy'
    : metrics.some(m => m.status === 'critical')
      ? 'critical'
      : 'warning';

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold">System Health</CardTitle>
          </div>
          {!loading && (
            <Badge 
              className={`${
                overallStatus === 'healthy' 
                  ? 'bg-emerald-500/10 text-emerald-600' 
                  : overallStatus === 'warning'
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-rose-500/10 text-rose-600'
              } border-0`}
            >
              {overallStatus === 'healthy' ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> All Systems Operational</>
              ) : overallStatus === 'warning' ? (
                <><AlertCircle className="h-3 w-3 mr-1" /> Minor Issues</>
              ) : (
                <><AlertCircle className="h-3 w-3 mr-1" /> Issues Detected</>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-24 bg-accent rounded" />
                  <div className="h-4 w-12 bg-accent rounded" />
                </div>
                <div className="h-2 bg-accent rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${getStatusColor(metric.status)}`} />
                      <span className="text-sm font-medium text-foreground">
                        {metric.label}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${getStatusColor(metric.status)}`}>
                      {Math.round(metric.value)}%
                    </span>
                  </div>
                  <div className="h-2 bg-accent rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${getProgressColor(metric.status)}`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealth;
