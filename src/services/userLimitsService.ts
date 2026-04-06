// src/services/userLimitsService.ts
import { supabase } from '@/integrations/supabase/client';
import StreakService from './streakService';
import { FREE_LIMITS } from '@/config/subscriptionPlans';
import { logger } from '@/utils/logger';

export class UserLimitsService {

  // Daily limit: 15 for free, unlimited for pro
  static async getDailyLimit(userId: string): Promise<number> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, subscription_end_date')
      .eq('id', userId)
      .single();

    const isPremiumActive = profile?.is_premium ||
      (profile?.subscription_end_date && new Date(profile.subscription_end_date) > new Date());

    return isPremiumActive ? Infinity : FREE_LIMITS.questionsPerDay;
  }

  static async isPro(userId: string): Promise<boolean> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, subscription_end_date')
      .eq('id', userId)
      .single();

    if (!profile) return false;

    const isPremiumActive = profile.is_premium ||
      (profile.subscription_end_date && new Date(profile.subscription_end_date) > new Date());

    return isPremiumActive;
  }

  /** Get IST date string (YYYY-MM-DD) for "today" in India */
  static getISTDateString(): string {
    const now = new Date();
    // IST = UTC + 5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  }

  static async getTodayUsage(userId: string): Promise<number> {
    const todayIST = this.getISTDateString();
    // Convert IST midnight boundaries to UTC for querying
    const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString();
    const endUTC = new Date(`${todayIST}T23:59:59.999+05:30`).toISOString();

    const { count } = await supabase
      .from('question_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mode', 'practice')
      .gte('created_at', startUTC)
      .lte('created_at', endUTC);

    return count || 0;
  }

  // Monthly test limit: 2 for free, unlimited for pro
  static async getMonthlyTestUsage(userId: string): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await supabase
      .from('test_sessions')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', monthStart)
      .limit(FREE_LIMITS.testsPerMonth + 1);

    if (error) {
      logger.warn('Monthly test usage lookup failed, defaulting to 0', { userId, error: error.message });
      return 0;
    }

    return data?.length || 0;
  }

  static async canStartTest(userId: string): Promise<{
    canStart: boolean;
    testsUsed: number;
    testsLimit: number;
    reason?: string;
  }> {
    const isPro = await this.isPro(userId);
    if (isPro) {
      return { canStart: true, testsUsed: 0, testsLimit: Infinity };
    }

    const testsUsed = await this.getMonthlyTestUsage(userId);
    const testsLimit = FREE_LIMITS.testsPerMonth;

    if (testsUsed >= testsLimit) {
      return {
        canStart: false,
        testsUsed,
        testsLimit,
        reason: 'monthly_test_limit_reached',
      };
    }

    return { canStart: true, testsUsed, testsLimit };
  }

  static async canSolveMore(userId: string): Promise<{
    canSolve: boolean;
    reason?: string;
    limit: number;
    used: number;
    remaining: number;
  }> {
    const isPro = await this.isPro(userId);
    const limit = await this.getDailyLimit(userId);
    const used = await this.getTodayUsage(userId);

    if (isPro) {
      return {
        canSolve: true,
        limit: Infinity,
        used,
        remaining: Infinity
      };
    }

    const remaining = limit - used;

    if (remaining <= 0) {
      return {
        canSolve: false,
        reason: 'daily_limit_reached',
        limit,
        used,
        remaining: 0
      };
    }

    return {
      canSolve: true,
      limit,
      used,
      remaining
    };
  }

  static async shouldShowUpgradePrompt(userId: string): Promise<{
    show: boolean;
    promptType: string;
    data?: any;
  }> {
    const isPro = await this.isPro(userId);
    if (isPro) return { show: false, promptType: 'none' };

    const { canSolve, remaining, used } = await this.canSolveMore(userId);

    if (!canSolve) {
      return {
        show: true,
        promptType: 'daily_limit_reached',
        data: { remaining: 0 }
      };
    }

    // Show soft prompt at 10-12 questions (66-80% of 15 limit)
    if (used >= 10 && used <= 12) {
      return {
        show: true,
        promptType: 'momentum_prompt',
        data: { questionsCompleted: used }
      };
    }

    if (remaining <= 3) {
      return {
        show: true,
        promptType: 'approaching_limit',
        data: { remaining }
      };
    }

    const streakStatus = await StreakService.getStreakStatus(userId);
    const limit = await this.getDailyLimit(userId);

    if (streakStatus.todayTarget > limit) {
      return {
        show: true,
        promptType: 'target_exceeds_limit',
        data: {
          target: streakStatus.todayTarget,
          limit,
          currentStreak: streakStatus.currentStreak
        }
      };
    }

    const nextTarget = await this.predictNextTarget(userId);
    if (nextTarget > limit) {
      return {
        show: true,
        promptType: 'next_target_warning',
        data: {
          currentTarget: streakStatus.todayTarget,
          nextTarget,
          limit
        }
      };
    }

    return { show: false, promptType: 'none' };
  }

  private static async predictNextTarget(userId: string): Promise<number> {
    const streakStatus = await StreakService.getStreakStatus(userId);
    const accuracy = streakStatus.accuracy7Day;

    let weeklyIncrease = 0;
    if (accuracy < 50) weeklyIncrease = 0;
    else if (accuracy < 70) weeklyIncrease = 2;
    else if (accuracy < 85) weeklyIncrease = 3;
    else weeklyIncrease = 5;

    return Math.min(streakStatus.todayTarget + weeklyIncrease, 75);
  }

  static async logConversionPrompt(
    userId: string,
    promptType: string,
    converted: boolean = false
  ) {
    await supabase.from('conversion_prompts').insert({
      user_id: userId,
      prompt_type: promptType,
      converted
    });
  }

  static async upgradeToPRO(
    userId: string,
    durationDays: number = 365
  ): Promise<boolean> {
    try {
      const subscriptionStart = new Date();
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + durationDays);

      await supabase
        .from('profiles')
        .update({
          is_premium: true,
          subscription_end_date: subscriptionEnd.toISOString()
        })
        .eq('id', userId);

      await this.logConversionPrompt(userId, 'upgrade_completed', true);

      return true;
    } catch (error) {
      logger.error('Error upgrading to PRO:', error);
      return false;
    }
  }

  // Add referral reward (1 week free Pro)
  static async addReferralReward(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_end_date, is_premium')
        .eq('id', userId)
        .single();

      let newEndDate: Date;

      if (profile?.subscription_end_date && new Date(profile.subscription_end_date) > new Date()) {
        // Extend existing subscription by 7 days
        newEndDate = new Date(profile.subscription_end_date);
        newEndDate.setDate(newEndDate.getDate() + 7);
      } else {
        // Start new subscription for 7 days
        newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + 7);
      }

      await supabase
        .from('profiles')
        .update({
          is_premium: true,
          subscription_end_date: newEndDate.toISOString()
        })
        .eq('id', userId);

      return true;
    } catch (error) {
      logger.error('Error adding referral reward:', error);
      return false;
    }
  }

  static async getConversionStats() {
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: proUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_premium', true);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count: promptsShown } = await supabase
      .from('conversion_prompts')
      .select('*', { count: 'exact', head: true })
      .gte('shown_at', weekAgo.toISOString());

    const { count: conversions } = await (supabase
      .from('conversion_prompts') as any)
      .select('*', { count: 'exact', head: true })
      .eq('converted', true)
      .gte('shown_at', weekAgo.toISOString());

    const conversionRate = promptsShown && conversions
      ? ((conversions / promptsShown) * 100).toFixed(1)
      : '0';

    return {
      totalUsers: totalUsers || 0,
      proUsers: proUsers || 0,
      freeUsers: (totalUsers || 0) - (proUsers || 0),
      proPercentage: totalUsers ? ((proUsers || 0) / totalUsers * 100).toFixed(1) : '0',
      weeklyPromptsShown: promptsShown || 0,
      weeklyConversions: conversions || 0,
      weeklyConversionRate: conversionRate
    };
  }

  static getUpgradeMessage(promptType: string, data?: any): {
    title: string;
    message: string;
    cta: string;
    subtitle: string;
  } {
    switch (promptType) {
      case 'daily_limit_reached':
        return {
          title: 'Daily Limit Reached!',
          message: `You've crushed ${FREE_LIMITS.questionsPerDay} questions today! Upgrade for UNLIMITED.`,
          cta: 'Go Unlimited — ₹499/year',
          subtitle: 'Just ₹1.37/day'
        };

      case 'momentum_prompt':
        return {
          title: 'Great Progress!',
          message: `${data.questionsCompleted} questions done! Go unlimited to keep the momentum.`,
          cta: 'Upgrade to Pro',
          subtitle: '₹1.37/day — Cheaper than a samosa!'
        };

      case 'approaching_limit':
        return {
          title: 'Almost at Limit',
          message: `Only ${data.remaining} questions left today.`,
          cta: 'Go Unlimited',
          subtitle: '₹499/year'
        };

      case 'target_exceeds_limit':
        return {
          title: 'Your Growth is Amazing!',
          message: `Target: ${data.target} questions. FREE limit: ${FREE_LIMITS.questionsPerDay}. Upgrade to continue!`,
          cta: 'Save My Streak',
          subtitle: 'Don\'t let limits stop you!'
        };

      case 'next_target_warning':
        return {
          title: 'Target Increasing!',
          message: `Next week's target: ${data.nextTarget}. Upgrade now!`,
          cta: 'Upgrade to Pro',
          subtitle: 'Stay ahead!'
        };

      default:
        return {
          title: 'Upgrade to Pro',
          message: 'Unlock unlimited questions, JEEnie AI, and more!',
          cta: 'Get Pro — ₹499/year',
          subtitle: 'Best decision for JEE prep!'
        };
    }
  }
}

export default UserLimitsService;
