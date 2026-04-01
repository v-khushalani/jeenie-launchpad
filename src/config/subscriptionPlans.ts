// src/config/subscriptionPlans.ts
// Synced pricing structure for JEEnie

export interface SubscriptionPlan {
  name: string;
  price: number;
  displayDuration: string;
  duration: number; // duration in days
  popular: boolean;
  bestValue: boolean;
  savings: number;
  originalPrice: number | null;
  features: string[];
  tagline: string;
  razorpayPlanId: string;
  // Optional metadata
  isFamily?: boolean;
  maxMembers?: number;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  monthly: {
    name: 'Pro Monthly',
    price: 99,
    displayDuration: 'per month',
    duration: 30,
    popular: false,
    bestValue: false,
    savings: 0,
    originalPrice: null,
    features: [
      '✨ Unlimited Practice Questions',
      '📊 Unlimited Tests',
      '🤖 AI Doubt Solver (24/7)',
      '🎯 AI Study Planner',
      '🏆 Full Leaderboard Access',
      '⚡ Priority Support'
    ],
    tagline: '☕ Less than a Coffee — but can change your rank!',
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_MONTHLY || 'plan_monthly_99'
  },

  yearly: {
    name: 'Pro Yearly',
    price: 499,
    displayDuration: 'per year',
    duration: 365,
    popular: true,
    bestValue: true,
    savings: 689,
    originalPrice: 1188,
    features: [
      '✨ Everything in Pro Monthly',
      '🎁 Save ₹689 (58% OFF!)',
      '🤖 Unlimited AI Doubt Solver',
      '🎯 AI Study Planner',
      '🏆 Premium Leaderboard Badges',
      '⚡ Priority Support 24/7',
      '🚀 Early Access to New Features'
    ],
    tagline: '🔥 ₹1.37/day — Cheaper than a samosa! Most students choose this.',
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_YEARLY || 'plan_yearly_499'
  },

  family_yearly: {
    name: 'Family Pro Yearly',
    price: 899,
    displayDuration: 'per year (family)',
    duration: 365,
    popular: false,
    bestValue: true,
    savings: 2200,
    originalPrice: 3099,
    features: [
      '👨‍👩‍👧‍👦 Up to 3 siblings under one plan',
      '✨ Everything in Pro Yearly',
      '🏆 Shared family leaderboard bragging rights',
      '📊 Track each child’s progress separately'
    ],
    tagline: 'Perfect for siblings preparing together — one plan, up to 3 kids.',
    razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_FAMILY || 'plan_family_yearly_899',
    isFamily: true,
    maxMembers: 3
  }
};

// Free Plan Limits - Synced across app
export const FREE_LIMITS = {
  questionsPerDay: 15,
  testsPerMonth: 2,
  aiDoubtSolver: false,
  aiStudyPlanner: false,
  analyticsAdvanced: false
};

// Pro Plan Features
export const PRO_FEATURES = {
  questionsPerDay: Infinity,
  testsPerMonth: Infinity,
  aiDoubtSolver: true,
  aiStudyPlanner: true,
  analyticsAdvanced: true,
  prioritySupport: true
};

// Referral System Config
export const REFERRAL_CONFIG = {
  enabled: true,
  rewardDays: 7, // 1 week free Pro per referral
  maxRewards: 4, // Max 4 referrals = 1 month free
  message: 'Refer 4 friends & get 1 month FREE Pro!'
};

// Conversion Messages - Make it feel like a steal
export const CONVERSION_MESSAGES = {
  dailyLimit: {
    title: '🚀 Daily Limit Reached!',
    message: "You've crushed 15 questions today! Come back tomorrow or unlock UNLIMITED practice.",
    cta: 'Go Unlimited — ₹499/year',
    subtitle: '🔥 Just ₹1.37/day — Less than a samosa!'
  },
  testLimit: {
    title: '📝 Test Limit Reached',
    message: "You've taken 2 free tests this month. Get unlimited tests with Pro!",
    cta: 'Unlock Unlimited Tests',
    subtitle: '🎯 Practice makes perfect!'
  },
  aiDoubtBlocked: {
    title: '🤖 AI Doubt Solver — Pro Feature',
    message: 'Get instant doubt solving 24/7 with your personal AI tutor!',
    cta: 'Unlock AI Doubt Solver',
    subtitle: '⚡ Your doubts, solved in seconds'
  },
  studyPlannerBlocked: {
    title: '📅 AI Study Planner — Pro Feature',
    message: 'Get a smart study plan that adapts to YOUR progress and exam date!',
    cta: 'Get Smart Study Plan',
    subtitle: '🧠 Plan smarter, not harder'
  }
};

// Payment Config
export const PAYMENT_CONFIG = {
  currency: 'INR',
  acceptedMethods: ['card', 'upi', 'netbanking', 'wallet'],
  refundPolicy: '7-day money-back guarantee',
  support: 'support@jeenie.website'
};
