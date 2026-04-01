import React, { useState } from 'react';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Zap, BookOpen, Trophy, MessageSquare, Sparkles, Bell, Users, CreditCard, FileText, TestTube, DatabaseZap } from 'lucide-react';
import { logger } from '@/utils/logger';

const CATEGORY_COLORS: Record<string, string> = {
  engagement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ai: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  content: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  growth: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  monetization: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  general: 'bg-muted text-muted-foreground',
};

const FLAG_ICONS: Record<string, React.ElementType> = {
  leaderboard: Trophy,
  badges: Sparkles,
  ai_doubt_solver: MessageSquare,
  study_planner: Zap,
  push_notifications: Bell,
  referral_system: Users,
  pyq_explorer: BookOpen,
  test_mode: TestTube,
  educator_content: FileText,
  pricing_plans: CreditCard,
};

export const FeatureFlagManager: React.FC = () => {
  const { flags, refetch } = useFeatureFlags();
  const [seeding, setSeeding] = useState(false);

  const DEFAULT_FLAGS = [
    { flag_key: 'leaderboard', label: 'Leaderboard', description: 'Show student leaderboard and rankings', is_enabled: true, rollout_percentage: 100, category: 'engagement' },
    { flag_key: 'badges', label: 'Badges & Achievements', description: 'Enable achievement badges for students', is_enabled: true, rollout_percentage: 100, category: 'engagement' },
    { flag_key: 'ai_doubt_solver', label: 'AI Doubt Solver', description: 'Enable AI-powered doubt resolution', is_enabled: true, rollout_percentage: 100, category: 'ai' },
    { flag_key: 'study_planner', label: 'AI Study Planner', description: 'Personalized AI study plan generation', is_enabled: true, rollout_percentage: 100, category: 'ai' },
    { flag_key: 'push_notifications', label: 'Push Notifications', description: 'Browser push notifications for reminders', is_enabled: true, rollout_percentage: 100, category: 'engagement' },
    { flag_key: 'referral_system', label: 'Referral System', description: 'Student referral and invite system', is_enabled: true, rollout_percentage: 100, category: 'growth' },
    { flag_key: 'pyq_explorer', label: 'PYQ Explorer', description: 'Previous year question paper explorer', is_enabled: true, rollout_percentage: 100, category: 'content' },
    { flag_key: 'test_mode', label: 'Test Mode', description: 'Timed test and mock exam feature', is_enabled: true, rollout_percentage: 100, category: 'content' },
    { flag_key: 'educator_content', label: 'Educator Content', description: 'Allow educators to upload study material', is_enabled: true, rollout_percentage: 100, category: 'content' },
    { flag_key: 'pricing_plans', label: 'Pricing Plans', description: 'Subscription and pricing page', is_enabled: true, rollout_percentage: 100, category: 'monetization' },
    { flag_key: 'streak_tracking', label: 'Streak Tracking', description: 'Daily study streak tracker', is_enabled: true, rollout_percentage: 100, category: 'engagement' },
    { flag_key: 'adaptive_difficulty', label: 'Adaptive Difficulty', description: 'Auto-adjust question difficulty based on performance', is_enabled: true, rollout_percentage: 100, category: 'ai' },
    { flag_key: 'gamification', label: 'Gamification', description: 'Points, XP, and level-up system', is_enabled: true, rollout_percentage: 100, category: 'engagement' },
    { flag_key: 'live_notifications', label: 'Live Notifications', description: 'Real-time notification banners', is_enabled: true, rollout_percentage: 100, category: 'engagement' },
  ];

  const handleSeedFlags = async () => {
    setSeeding(true);
    try {
      // Upsert to avoid duplicates
      const { error } = await supabase
        .from('feature_flags')
        .upsert(DEFAULT_FLAGS, { onConflict: 'flag_key' });

      if (error) throw error;

      toast.success(`Seeded ${DEFAULT_FLAGS.length} default feature flags`);
      await refetch();
    } catch (err) {
      logger.error('Failed to seed feature flags:', err);
      toast.error('Failed to seed feature flags');
    } finally {
      setSeeding(false);
    }
  };

  const handleToggle = async (flagKey: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !currentValue })
        .eq('flag_key', flagKey);

      if (error) throw error;

      toast.success(`${flags[flagKey]?.label || flagKey} ${!currentValue ? 'enabled' : 'disabled'}`);
      await refetch();
    } catch (err) {
      toast.error('Failed to update feature flag');
    }
  };

  const sortedFlags = Object.values(flags).sort((a, b) => {
    const catOrder = ['content', 'engagement', 'ai', 'growth', 'monetization', 'general'];
    return catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
  });

  const groupedFlags = sortedFlags.reduce<Record<string, typeof sortedFlags>>((acc, flag) => {
    const cat = flag.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(flag);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Control which features are visible to students. Changes apply instantly.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedFlags}
            disabled={seeding}
          >
            <DatabaseZap className="w-4 h-4 mr-2" />
            {seeding ? 'Seeding...' : 'Seed Defaults'}
          </Button>
          <Badge variant="outline" className="text-xs">
            {Object.values(flags).filter(f => f.is_enabled).length} / {Object.values(flags).length} active
          </Badge>
        </div>
      </div>

      {Object.keys(flags).length === 0 && (
        <Card className="border-2 border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-8 text-center">
            <DatabaseZap className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Feature Flags Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The feature_flags table is empty. Click "Seed Defaults" to add standard feature flags.
            </p>
            <Button onClick={handleSeedFlags} disabled={seeding}>
              <DatabaseZap className="w-4 h-4 mr-2" />
              {seeding ? 'Seeding...' : 'Seed Default Feature Flags'}
            </Button>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge className={`text-[10px] uppercase ${CATEGORY_COLORS[category] || CATEGORY_COLORS.general}`}>
                {category}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {categoryFlags.map((flag) => {
              const Icon = FLAG_ICONS[flag.flag_key] || Zap;
              return (
                <div
                  key={flag.flag_key}
                  className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${flag.is_enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`w-4 h-4 ${flag.is_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${flag.is_enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {flag.label}
                      </p>
                      {flag.description && (
                        <p className="text-xs text-muted-foreground">{flag.description}</p>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={flag.is_enabled}
                    onCheckedChange={() => handleToggle(flag.flag_key, flag.is_enabled)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FeatureFlagManager;
