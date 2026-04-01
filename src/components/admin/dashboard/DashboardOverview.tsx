import React, { useState, useEffect } from 'react';
import {
  Users, BookOpen, TrendingUp, Award,
  ClipboardCheck, ArrowUpRight, ArrowDownRight,
  Database, IndianRupee, Layers, GraduationCap, Package,
  FileText, Zap, Bell, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { fetchAllPaginated } from '@/utils/supabasePagination';

interface DashboardStats {
  totalUsers: number;
  activeToday: number;
  totalAttempts: number;
  premiumUsers: number;
  pendingReview: number;
  questionsBank: number;
  userGrowth: number;
  totalChapters: number;
  totalTopics: number;
  totalRevenue: number;
  activeBatches: number;
  newUsersThisWeek: number;
}

export const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const [
        usersResult, activeTodayResult, attemptsResult, premiumResult,
        lastWeekResult, questionsResult, pendingReviewResult,
        chaptersResult, topicsResult, revenueResult, batchesResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        fetchAllPaginated(() =>
          supabase.from('question_attempts')
            .select('user_id')
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        ),
        supabase.from('question_attempts').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('extracted_questions_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('chapters').select('id', { count: 'exact', head: true }),
        supabase.from('topics').select('id', { count: 'exact', head: true }),
        fetchAllPaginated(() =>
          supabase.from('payments').select('amount').eq('status', 'paid')
        ),
        supabase.from('batches').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const totalUsers = usersResult.count || 0;
      const uniqueActiveToday = new Set((activeTodayResult as any[])?.map(a => a.user_id) || []).size;
      const premiumUsers = premiumResult.count || 0;
      const newUsersThisWeek = lastWeekResult.count || 0;
      const totalRevenue = ((revenueResult as any[]) || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const userGrowth = totalUsers > 0
        ? parseFloat(((newUsersThisWeek / totalUsers) * 100).toFixed(1))
        : 0;

      setStats({
        totalUsers,
        activeToday: uniqueActiveToday,
        totalAttempts: attemptsResult.count || 0,
        premiumUsers,
        pendingReview: pendingReviewResult.count || 0,
        questionsBank: questionsResult.count || 0,
        userGrowth,
        totalChapters: chaptersResult.count || 0,
        totalTopics: topicsResult.count || 0,
        totalRevenue,
        activeBatches: batchesResult.count || 0,
        newUsersThisWeek,
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const conversionRate = stats?.totalUsers
    ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* ─── Welcome + Quick Stats ────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Welcome back 👋</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening on your platform today.</p>
      </div>

      {/* ─── Key Metric Cards ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          icon={Users} label="Total Users" value={stats?.totalUsers || 0}
          trend={stats?.userGrowth} trendLabel="this week"
          onClick={() => navigate('/admin/users')}
        />
        <MetricCard
          icon={TrendingUp} label="Active Today" value={stats?.activeToday || 0}
          accent
        />
        <MetricCard
          icon={Award} label="Premium" value={stats?.premiumUsers || 0}
          sub={`${conversionRate}% conversion`}
        />
        <MetricCard
          icon={Database} label="Questions" value={stats?.questionsBank || 0}
          onClick={() => navigate('/admin/content')}
        />
        <MetricCard
          icon={ClipboardCheck} label="Pending Review" value={stats?.pendingReview || 0}
          onClick={() => navigate('/admin/review-queue')}
          alert={!!stats?.pendingReview && stats.pendingReview > 0}
        />
        <MetricCard
          icon={IndianRupee} label="Revenue" value={stats?.totalRevenue || 0}
          prefix="₹"
        />
      </div>

      {/* ─── Bottom Section ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Content Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Content Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HealthRow icon={Layers} label="Chapters" value={stats?.totalChapters || 0} />
            <HealthRow icon={GraduationCap} label="Topics" value={stats?.totalTopics || 0} />
            <HealthRow icon={Package} label="Active Batches" value={stats?.activeBatches || 0} />
            <HealthRow icon={Database} label="Total Attempts" value={stats?.totalAttempts || 0} />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={BookOpen} label="Content" onClick={() => navigate('/admin/content')} />
              <QuickAction icon={FileText} label="PDF Extract" onClick={() => navigate('/admin/pdf-extract')} />
              <QuickAction icon={Zap} label="Auto-Assign" onClick={() => navigate('/admin/auto-assign')} />
              <QuickAction icon={Users} label="Users" onClick={() => navigate('/admin/users')} />
              <QuickAction icon={BarChart3} label="Analytics" onClick={() => navigate('/admin/analytics')} />
              <QuickAction icon={Bell} label="Notify" onClick={() => navigate('/admin/notifications')} />
            </div>
          </CardContent>
        </Card>

        {/* Platform Pulse */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Platform Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PulseRow
              label="Conversion Rate"
              value={`${conversionRate}%`}
              sub={`${stats?.premiumUsers || 0} of ${stats?.totalUsers || 0} users`}
            />
            <PulseRow
              label="Avg Revenue/User"
              value={stats?.premiumUsers ? `₹${Math.round((stats.totalRevenue || 0) / stats.premiumUsers)}` : '₹0'}
              sub="per paid user"
            />
            <PulseRow
              label="New This Week"
              value={`${stats?.newUsersThisWeek || 0}`}
              sub="user registrations"
            />
            <PulseRow
              label="Q/User Avg"
              value={stats?.totalUsers ? `${Math.round((stats.totalAttempts || 0) / Math.max(stats.totalUsers, 1))}` : '0'}
              sub="questions per user"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  prefix?: string;
  onClick?: () => void;
  alert?: boolean;
  accent?: boolean;
  sub?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, trend, trendLabel, prefix, onClick, alert, accent, sub }) => (
  <Card
    onClick={onClick}
    className={cn(
      'transition-all hover:shadow-sm',
      onClick && 'cursor-pointer hover:border-primary/30',
      alert && 'border-destructive/40',
      accent && 'border-primary/30',
    )}
  >
    <CardContent className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          'p-1.5 rounded-md',
          alert ? 'bg-destructive/10' : accent ? 'bg-primary/15' : 'bg-muted'
        )}>
          <Icon className={cn(
            'h-3.5 w-3.5',
            alert ? 'text-destructive' : accent ? 'text-primary' : 'text-muted-foreground'
          )} />
        </div>
        <p className="text-[11px] font-medium text-muted-foreground truncate">{label}</p>
      </div>
      <h3 className="text-xl font-bold text-foreground">
        {prefix || ''}{value.toLocaleString()}
      </h3>
      {trend !== undefined && (
        <div className={cn(
          'flex items-center gap-1 text-[10px] font-medium mt-1',
          trend >= 0 ? 'text-primary' : 'text-muted-foreground'
        )}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
        </div>
      )}
      {sub && (
        <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
      )}
    </CardContent>
  </Card>
);

const HealthRow: React.FC<{ label: string; value: number; icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <span className="text-sm font-bold text-foreground">{value.toLocaleString()}</span>
  </div>
);

const PulseRow: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div className="flex items-baseline justify-between">
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground/70">{sub}</p>
    </div>
    <p className="text-lg font-bold text-primary">{value}</p>
  </div>
);

const QuickAction: React.FC<{ icon: React.ElementType; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    className="h-auto py-2.5 px-3 flex items-center gap-2 justify-start text-xs font-medium"
  >
    <Icon className="w-4 h-4 text-muted-foreground" />
    <span className="truncate">{label}</span>
  </Button>
);

export default DashboardOverview;
