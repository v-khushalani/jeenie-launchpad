import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SUBSCRIPTION_PLANS, REFERRAL_CONFIG } from '@/config/subscriptionPlans';
import { initializePayment } from '@/utils/razorpay';
import { Check, X, Crown, Zap, Share2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import ReferralService from '@/services/referralService';
import { logger } from '@/utils/logger';
import SEOHead from '@/components/SEOHead';

const SubscriptionPlans = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate('/login?redirect=/subscription-plans');
      return;
    }

    try {
      setLoading(planId);
      await initializePayment(
        planId,
        user.id,
        user.email || '',
        user.user_metadata?.name || 'Student'
      );
    } catch (error: any) {
      logger.error('Payment error:', error);
      const message = typeof error?.message === 'string'
        ? error.message
        : 'Failed to initiate payment. Please try again.';
      alert(message);
    } finally {
      setLoading(null);
    }
  };

  const handleWhatsAppShare = () => {
    if (!user) {
      navigate('/login?redirect=/subscription-plans');
      return;
    }

    const referralCode = ReferralService.generateReferralCode(user.id);
    // Direct link to /signup so the ref code is preserved even on first visit
    const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
    const message = `🎯 Hey! I'm using JEEnie for JEE/NEET prep and it's amazing!\n\n✨ Use my referral code: *${referralCode}*\n📚 Sign up here: ${referralLink}\n\nSign up with my link and I get 1 week FREE Pro! 🎁`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const pricing = {
    monthly: { price: 99, perDay: '₹3.3/day' },
    yearly: { price: 499, original: 1188, perDay: '₹1.37/day', savings: 689 }
  };

  const comparison = [
    { feature: 'Questions/Day', free: '15', pro: '∞' },
    { feature: 'Mock Tests', free: '2/mo', pro: '∞' },
    { feature: 'JEEnie AI', free: false, pro: true },
    { feature: 'Study Planner', free: false, pro: true },
    { feature: 'Analytics', free: false, pro: true },
  ];

  return (
    <div className="mobile-app-shell bg-gradient-to-b from-background to-primary/5 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col overflow-hidden">
      <SEOHead
        title="Subscription Plans"
        description="JEEnie AI premium plans and pricing."
        canonical="https://www.jeenie.website/subscription-plans"
        noIndex
      />
      <Header />
      <div className="flex-1 min-h-0 px-4 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-4">
            <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 mb-2 font-semibold">
              🔥 STEAL DEAL
            </Badge>
            <h1 className="text-xl font-bold text-foreground">
              Upgrade to Pro
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {billingCycle === 'yearly' 
                ? `Just ${pricing.yearly.perDay} — Cheaper than a samosa!` 
                : `Just ${pricing.monthly.perDay} — Less than a Pizza!`}
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all relative ${
                billingCycle === 'yearly'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              Yearly
              <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold">
                58%
              </span>
            </button>
          </div>

          {/* Price Display */}
          <div className="text-center mb-4">
            <div className="flex items-baseline justify-center gap-1.5">
              {billingCycle === 'yearly' && (
                <span className="text-base text-muted-foreground line-through">
                  ₹{pricing.yearly.original}
                </span>
              )}
              <span className="text-3xl font-bold text-primary">
                ₹{pricing[billingCycle].price}
              </span>
              <span className="text-sm text-muted-foreground">
                /{billingCycle === 'yearly' ? 'yr' : 'mo'}
              </span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-xs text-green-600 font-medium">
                Save ₹{pricing.yearly.savings}
              </p>
            )}
          </div>

          {/* Compact Comparison Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden mb-4 shadow-sm">
            <div className="grid grid-cols-3 bg-muted/30 border-b border-border">
              <div className="p-2 text-xs font-medium text-muted-foreground">Feature</div>
              <div className="p-2 text-xs font-medium text-center text-muted-foreground">Free</div>
              <div className="p-2 text-xs font-medium text-center text-primary flex items-center justify-center gap-1">
                <Crown className="w-3 h-3" />
                Pro
              </div>
            </div>
            {comparison.map((item, idx) => (
              <div key={idx} className="grid grid-cols-3 border-b border-border/50 last:border-0">
                <div className="p-2 text-xs text-foreground">{item.feature}</div>
                <div className="p-2 text-center flex items-center justify-center">
                  {typeof item.free === 'boolean' ? (
                    item.free ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-red-400" />
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">{item.free}</span>
                  )}
                </div>
                <div className="p-2 text-center bg-primary/5 flex items-center justify-center">
                  {typeof item.pro === 'boolean' ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <span className="text-xs font-semibold text-primary">{item.pro}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={() => handleSelectPlan(billingCycle)}
            disabled={loading === billingCycle}
            className="w-full h-11 text-sm font-bold shadow-lg"
          >
            {loading === billingCycle ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Get Pro Now
              </>
            )}
          </Button>

          {/* Referral Section */}
          <div className="mt-4 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-foreground">
                  Get 1 week FREE!
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsAppShare}
                className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white border-0"
              >
                <Share2 className="w-3 h-3 mr-1" />
                Share on WhatsApp
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Refer friends — you get 1 week Pro free per referral (max {REFERRAL_CONFIG.maxRewards})
            </p>
          </div>

          {/* Continue Free */}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Continue with Free Plan →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
