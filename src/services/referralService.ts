// src/services/referralService.ts
import { supabase } from '@/integrations/supabase/client';
const REFERRAL_MAX_REWARDS = 4; // Max 4 referrals = 1 month free
import UserLimitsService from './userLimitsService';
import { logger } from '@/utils/logger';

export class ReferralService {
  
  // Generate referral code (using user ID as code for simplicity)
  static generateReferralCode(userId: string): string {
    return `JEE${userId.slice(0, 8).toUpperCase()}`;
  }

  // Get referral link — points directly to /signup so the code survives
  static getReferralLink(userId: string): string {
    const code = this.generateReferralCode(userId);
    return `${window.location.origin}/signup?ref=${code}`;
  }

  // Create a referral entry when user shares
  static async createReferral(referrerId: string, referredEmail: string): Promise<boolean> {
    try {
      // Check if referral already exists
      const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrerId)
        .eq('referred_email', referredEmail)
        .single();

      if (existing) {
        logger.info('Referral already exists');
        return false;
      }

      await supabase.from('referrals').insert({
        referrer_id: referrerId,
        referred_id: referrerId, // placeholder, will be updated on signup
        referred_email: referredEmail,
        referral_code: referrerId.substring(0, 8),
        status: 'pending',
        reward_granted: false
      } as any);

      return true;
    } catch (error) {
      logger.error('Error creating referral:', error);
      return false;
    }
  }

  /**
   * Called right after a new user signs up.
   * referralCode = the ?ref= value from the signup URL.
   * Only the REFERRER gets 7 days Pro — the new user gets nothing extra.
   */
  static async processReferralOnSignup(newUserId: string, referralCode: string): Promise<boolean> {
    if (!referralCode) return false;
    try {
      // Look up the referrer by their stored referral_code
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode.toUpperCase())
        .maybeSingle();

      if (!referrerProfile) {
        logger.info('Referral code not found:', referralCode);
        return false;
      }

      const referrerId = referrerProfile.id;

      // Prevent self-referral
      if (referrerId === newUserId) {
        logger.warn('Self-referral detected, ignoring');
        return false;
      }

      // Check we haven't already rewarded this exact referral
      const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrerId)
        .eq('referred_id', newUserId)
        .maybeSingle();

      if (existing) {
        logger.info('Referral already recorded');
        return false;
      }

      // Record the referral via secure RPC
      const { data: rpcResult, error: rpcErr } = await supabase
        .rpc('create_referral', { p_referral_code: referralCode.toUpperCase() });
      const result = rpcResult as Record<string, unknown> | null;
      if (rpcErr || !result?.success) {
        logger.error('Failed to create referral:', rpcErr || result?.error);
        return false;
      }

      // Fetch the referral ID for reward granting
      const { data: newRef } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrerId)
        .eq('referred_id', newUserId)
        .single();

      if (!newRef) {
        logger.error('Referral created but could not fetch ID');
        return false;
      }

      // Grant 7 days Pro to REFERRER only
      await this.grantReferralReward(referrerId, newRef.id);

      logger.info('Referral processed: referrer', referrerId, 'earned 7 days Pro');
      return true;
    } catch (error) {
      logger.error('Error processing referral on signup:', error);
      return false;
    }
  }

  // Keep old method for backward-compat (does nothing new)
  static async completeReferral(referredUserId: string, referredEmail: string): Promise<boolean> {
    // Deprecated — use processReferralOnSignup instead
    logger.warn('completeReferral is deprecated, use processReferralOnSignup');
    return false;
  }

  // Grant referral reward
  static async grantReferralReward(referrerId: string, referralId: string): Promise<boolean> {
    try {
      // Check if max rewards reached
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', referrerId)
        .eq('reward_granted', true);

      if (count && count >= REFERRAL_MAX_REWARDS) {
        logger.warn('Max referral rewards reached');
        return false;
      }

      // Add 1 week Pro to referrer
      const success = await UserLimitsService.addReferralReward(referrerId);

      if (success) {
        // Mark reward as granted
        await supabase
          .from('referrals')
          .update({ reward_granted: true })
          .eq('id', referralId);
      }

      return success;
    } catch (error) {
      logger.error('Error granting referral reward:', error);
      return false;
    }
  }

  // Get user's referral stats
  static async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    rewardsEarned: number;
    weeksEarned: number;
    referralCode: string;
    referralLink: string;
  }> {
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId);

    const completed = referrals?.filter(r => r.status === 'completed') || [];
    const pending = referrals?.filter(r => r.status === 'pending') || [];
    const rewarded = referrals?.filter(r => r.reward_granted) || [];

    return {
      totalReferrals: referrals?.length || 0,
      completedReferrals: completed.length,
      pendingReferrals: pending.length,
      rewardsEarned: rewarded.length,
      weeksEarned: rewarded.length, // 1 week per referral
      referralCode: this.generateReferralCode(userId),
      referralLink: this.getReferralLink(userId)
    };
  }

  // Check if email was referred
  static async checkReferral(email: string): Promise<string | null> {
    const { data } = await supabase
      .from('referrals')
      .select('referrer_id')
      .eq('referred_email', email)
      .eq('status', 'pending')
      .single();

    return data?.referrer_id || null;
  }
}

export default ReferralService;
