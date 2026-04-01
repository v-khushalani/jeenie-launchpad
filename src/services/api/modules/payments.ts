/**
 * Payments API Module
 * 
 * Handles all payment-related API operations
 */

import { apiClient } from '../apiClient';
import { cache, CACHE_TTL } from '../cache';
import type { PaymentOrder, PaymentVerification, ApiResponse } from '../types';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: 'monthly' | 'yearly';
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly Pro',
    price: 99,
    duration: 'monthly',
    features: [
      'Unlimited AI Doubt Solving',
      'Personalized Study Plans',
      'All Practice Tests',
      'Progress Analytics',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly Pro',
    price: 499,
    duration: 'yearly',
    features: [
      'Everything in Monthly',
      '58% Savings',
      'Priority Support',
      'Early Access to Features',
    ],
  },
];

export const paymentsAPI = {
  /**
   * Get available plans
   */
  getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  },

  /**
   * Create Razorpay order
   */
  async createOrder(
    _userId: string,
    planId: 'monthly' | 'yearly' | 'family_yearly'
  ): Promise<ApiResponse<PaymentOrder>> {
    try {
      const result = await apiClient.callEdgeFunction<
        { planId: string },
        PaymentOrder
      >(
        'create-razorpay-order',
        { planId },
        { useQueue: false }
      );

      return result;
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'PAYMENT_ERROR' },
      };
    }
  },

  /**
   * Verify payment
   */
  async verifyPayment(
    verification: PaymentVerification
  ): Promise<ApiResponse<{ success: boolean; subscription_end_date: string }>> {
    try {
      // Ensure we send the correct field names the edge function expects
      const payload = {
        razorpay_order_id: verification.razorpay_order_id,
        razorpay_payment_id: verification.razorpay_payment_id,
        razorpay_signature: verification.razorpay_signature,
        planId: verification.planId,
      };
      const result = await apiClient.callEdgeFunction<
        typeof payload,
        { success: boolean; subscription_end_date: string }
      >(
        'verify-payment',
        payload,
        { useQueue: false }
      );

      if (result.data?.success) {
        // Invalidate user cache to reflect new subscription
        cache.invalidateByPattern(/user:.*/);
      }

      return result;
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'VERIFICATION_ERROR' },
      };
    }
  },

  /**
   * Get user's subscription status
   */
  async getSubscriptionStatus(userId: string): Promise<ApiResponse<{
    isPremium: boolean;
    plan: string | null;
    expiresAt: string | null;
    daysRemaining: number | null;
  }>> {
    const cacheKey = `subscription:${userId}`;
    const cached = cache.get<{
      isPremium: boolean;
      plan: string | null;
      expiresAt: string | null;
      daysRemaining: number | null;
    }>(cacheKey);
    if (cached) {
      return { data: cached, error: null };
    }

    type ProfileRow = { is_premium: boolean | null; subscription_end_date: string | null };
    
    try {
      const { data: profile, error } = await apiClient.rawClient
        .from('profiles')
        .select('is_premium, subscription_end_date')
        .eq('id', userId)
        .single() as unknown as { data: ProfileRow | null; error: { message: string; code: string } | null };

      if (error || !profile) {
        return { data: null, error: error ? { message: error.message, code: error.code } : { message: 'Profile not found', code: 'NOT_FOUND' } };
      }

      let daysRemaining: number | null = null;
      if (profile.subscription_end_date) {
        const endDate = new Date(profile.subscription_end_date);
        const now = new Date();
        daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) daysRemaining = 0;
      }

      // Check both is_premium flag AND subscription_end_date expiry
      const isSubscriptionActive = profile.subscription_end_date 
        ? new Date(profile.subscription_end_date) > new Date()
        : false;
      const isPremiumActive = (profile.is_premium && isSubscriptionActive) || isSubscriptionActive;

      const status = {
        isPremium: isPremiumActive,
        plan: isPremiumActive ? 'pro' : null,
        expiresAt: profile.subscription_end_date,
        daysRemaining,
      };

      cache.set(cacheKey, status, CACHE_TTL.MEDIUM);

      return { data: status, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'ERROR' },
      };
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(_userId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { data, error } = await apiClient.rawClient
        .rpc('cancel_subscription');

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      const result = data as Record<string, unknown> | null;
      if (result?.error) {
        return { data: null, error: { message: String(result.error), code: 'ERROR' } };
      }

      // Invalidate cache
      cache.invalidateByPattern(/subscription:.*/);
      cache.invalidateByPattern(/user:.*/);

      return { data: { success: true }, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'ERROR' },
      };
    }
  },

  /**
   * Create batch purchase order
   */
  async createBatchOrder(
    _userId: string,
    batchId: string,
    _amount?: number
  ): Promise<ApiResponse<PaymentOrder>> {
    try {
      // Edge function only needs batchId - it fetches price from DB server-side
      const result = await apiClient.callEdgeFunction<
        { batchId: string },
        PaymentOrder
      >(
        'create-batch-order',
        { batchId },
        { useQueue: false }
      );

      return result;
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'PAYMENT_ERROR' },
      };
    }
  },

  /**
   * Sync batch payment
   */
  async syncBatchPayment(
    orderId: string,
    paymentId: string,
    signature: string,
    batchId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    try {
      // Field names must match what the edge function expects
      const result = await apiClient.callEdgeFunction<
        { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; batchId: string },
        { success: boolean }
      >(
        'sync-batch-payment',
        { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, batchId },
        { useQueue: false }
      );

      if (result.data?.success) {
        cache.invalidateByPattern(/user:.*/);
      }

      return result;
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'SYNC_ERROR' },
      };
    }
  },
};
