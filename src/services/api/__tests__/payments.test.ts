import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentsAPI, SUBSCRIPTION_PLANS } from '../modules/payments';

// ─── Mock apiClient ─────────────────────────────────────────

const mockCallEdgeFunction = vi.fn();
const mockFrom = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockRpc = vi.fn();

vi.mock('../apiClient', () => ({
  apiClient: {
    callEdgeFunction: (...args: any[]) => mockCallEdgeFunction(...args),
    rawClient: {
      from: (...args: any[]) => mockFrom(...args),
      rpc: (...args: any[]) => mockRpc(...args),
    },
  },
}));

vi.mock('../cache', () => ({
  cache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidateByPattern: vi.fn(),
  },
  CACHE_TTL: {
    SHORT: 60000,
    MEDIUM: 300000,
    LONG: 1800000,
  },
}));

// ─── Tests ──────────────────────────────────────────────────

describe('paymentsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });
  });

  describe('getPlans', () => {
    it('returns subscription plans', () => {
      const plans = paymentsAPI.getPlans();
      expect(plans).toEqual(SUBSCRIPTION_PLANS);
      expect(plans).toHaveLength(2);
    });

    it('includes monthly plan at ₹99', () => {
      const plans = paymentsAPI.getPlans();
      const monthly = plans.find((p) => p.id === 'monthly');
      expect(monthly?.price).toBe(99);
      expect(monthly?.duration).toBe('monthly');
    });

    it('includes yearly plan at ₹499', () => {
      const plans = paymentsAPI.getPlans();
      const yearly = plans.find((p) => p.id === 'yearly');
      expect(yearly?.price).toBe(499);
      expect(yearly?.duration).toBe('yearly');
    });

    it('each plan has features', () => {
      const plans = paymentsAPI.getPlans();
      plans.forEach((plan) => {
        expect(plan.features.length).toBeGreaterThan(0);
      });
    });
  });

  describe('createOrder', () => {
    it('calls edge function with correct params', async () => {
      mockCallEdgeFunction.mockResolvedValueOnce({
        data: { orderId: 'order_123', amount: 9900, currency: 'INR' },
        error: null,
      });

      const result = await paymentsAPI.createOrder('user1', 'monthly');
      expect(mockCallEdgeFunction).toHaveBeenCalledWith(
        'create-razorpay-order',
        { planId: 'monthly' },
        { useQueue: false }
      );
      expect(result.data?.orderId).toBe('order_123');
      expect(result.error).toBeNull();
    });

    it('returns error on failure', async () => {
      mockCallEdgeFunction.mockRejectedValueOnce(new Error('Network error'));

      const result = await paymentsAPI.createOrder('user1', 'monthly');
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Network error');
      expect(result.error?.code).toBe('PAYMENT_ERROR');
    });
  });

  describe('verifyPayment', () => {
    it('calls edge function with verification data', async () => {
      mockCallEdgeFunction.mockResolvedValueOnce({
        data: { success: true, subscription_end_date: '2027-03-03' },
        error: null,
      });

      const verification = {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123',
        planId: 'monthly' as const,
      };

      const result = await paymentsAPI.verifyPayment(verification);
      expect(result.data?.success).toBe(true);
      expect(result.data?.subscription_end_date).toBe('2027-03-03');
    });

    it('invalidates cache on successful verification', async () => {
      const { cache } = await import('../cache');
      mockCallEdgeFunction.mockResolvedValueOnce({
        data: { success: true, subscription_end_date: '2027-03-03' },
        error: null,
      });

      await paymentsAPI.verifyPayment({
        razorpay_order_id: 'o1',
        razorpay_payment_id: 'p1',
        razorpay_signature: 's1',
        planId: 'yearly',
      });

      expect(cache.invalidateByPattern).toHaveBeenCalled();
    });

    it('returns error on verification failure', async () => {
      mockCallEdgeFunction.mockRejectedValueOnce(new Error('Invalid signature'));

      const result = await paymentsAPI.verifyPayment({
        razorpay_order_id: 'o1',
        razorpay_payment_id: 'p1',
        razorpay_signature: 'bad',
        planId: 'monthly',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('VERIFICATION_ERROR');
    });
  });

  describe('getSubscriptionStatus', () => {
    it('returns subscription status for premium user', async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      mockSingle.mockResolvedValueOnce({
        data: {
          is_premium: true,
          subscription_end_date: endDate.toISOString(),
        },
        error: null,
      });

      const result = await paymentsAPI.getSubscriptionStatus('user1');
      expect(result.data?.isPremium).toBe(true);
      expect(result.data?.plan).toBe('pro');
      expect(result.data?.daysRemaining).toBeGreaterThan(0);
    });

    it('returns non-premium for free user', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          is_premium: false,
          subscription_plan: null,
          subscription_end_date: null,
        },
        error: null,
      });

      const result = await paymentsAPI.getSubscriptionStatus('user1');
      expect(result.data?.isPremium).toBe(false);
      expect(result.data?.daysRemaining).toBeNull();
    });

    it('returns error when profile not found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found', code: 'NOT_FOUND' },
      });

      const result = await paymentsAPI.getSubscriptionStatus('nonexistent');
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('calculates 0 days remaining for expired subscription', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      mockSingle.mockResolvedValueOnce({
        data: {
          is_premium: true,
          subscription_plan: 'monthly',
          subscription_end_date: pastDate.toISOString(),
        },
        error: null,
      });

      const result = await paymentsAPI.getSubscriptionStatus('user1');
      expect(result.data?.daysRemaining).toBe(0);
    });
  });

  describe('cancelSubscription', () => {
    it('cancels subscription successfully', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });

      const result = await paymentsAPI.cancelSubscription('user1');
      expect(result.data?.success).toBe(true);
    });

    it('returns error on database failure', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB error', code: 'DB_ERROR' },
      });

      const result = await paymentsAPI.cancelSubscription('user1');
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('DB error');
    });
  });

  describe('createBatchOrder', () => {
    it('calls edge function with batchId', async () => {
      mockCallEdgeFunction.mockResolvedValueOnce({
        data: { orderId: 'order_batch_1', amount: 50000, currency: 'INR' },
        error: null,
      });

      const result = await paymentsAPI.createBatchOrder('user1', 'batch_123');
      expect(mockCallEdgeFunction).toHaveBeenCalledWith(
        'create-batch-order',
        { batchId: 'batch_123' },
        { useQueue: false }
      );
      expect(result.data?.orderId).toBe('order_batch_1');
    });

    it('returns error on failure', async () => {
      mockCallEdgeFunction.mockRejectedValueOnce(new Error('Batch not found'));

      const result = await paymentsAPI.createBatchOrder('user1', 'bad_batch');
      expect(result.error?.code).toBe('PAYMENT_ERROR');
    });
  });

  describe('syncBatchPayment', () => {
    it('syncs payment successfully', async () => {
      mockCallEdgeFunction.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const result = await paymentsAPI.syncBatchPayment(
        'order_1', 'pay_1', 'sig_1', 'batch_1'
      );
      expect(result.data?.success).toBe(true);
    });

    it('passes correct field names to edge function', async () => {
      mockCallEdgeFunction.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      await paymentsAPI.syncBatchPayment('o1', 'p1', 's1', 'b1');
      expect(mockCallEdgeFunction).toHaveBeenCalledWith(
        'sync-batch-payment',
        {
          razorpay_order_id: 'o1',
          razorpay_payment_id: 'p1',
          razorpay_signature: 's1',
          batchId: 'b1',
        },
        { useQueue: false }
      );
    });
  });
});
