# 🚀 JEEnie — AI-Powered Learning Platform for JEE/NEET

A comprehensive, production-ready learning platform for JEE/NEET aspirants with adaptive practice, AI doubt solving, gamification, and educator tools.

**Website**: [jeenie.website](https://jeenie.website)  
**Status**: ✅ Production Ready
**Last Updated**: March 25, 2026

---

## ✨ Key Features

### Student Features
- 🤖 **JEEnie AI Mentor** — AI doubt solver powered by Google Gemini
- 📚 **Adaptive Practice** — ELO-based difficulty adjustment, chapter/topic-wise practice
- 🎯 **Daily Limits & Goals** — Free: 15 questions/day, Pro: unlimited
- 🔥 **Streak System** — Daily streaks with smart goal tracking via `daily_progress` table
- 🏆 **Gamification** — Points, levels (Beginner→Legend), badges, leaderboard
- 📊 **Analytics Dashboard** — Subject-wise progress rings, accuracy trends, peer comparison
- ⏰ **Exam Countdown** — Dynamic countdown to JEE/NEET with urgency colors
- 👥 **Peer Comparison** — Percentile rank vs all students (scalable COUNT queries)
- 📝 **Mock Tests** — Full-length tests with detailed results & history
- 🔊 **Text-to-Speech & Voice Input** — Accessible learning
- 💳 **Razorpay Payments** — Subscription plans with referral rewards
- 📱 **PWA + Capacitor** — Installable app, Play Store ready
- 🌙 **Dark Mode** — Full dark mode support across all screens
- 🎓 **Onboarding Tutorial** — 3-step guided tour for new users

### Educator Features
- 📄 **Content Management** — Upload PDFs, videos, simulations
- 📋 **Group Tests** — Create tests with QR code join links
- 📊 **Student Analytics** — Track batch performance

### Admin Features
- 👤 **User Management** — Roles (student/educator/admin), bulk operations
- 📥 **PDF Question Extraction** — AI-powered question import
- 🏷️ **Batch Management** — Course batches with subject assignments
- 🔧 **Feature Flags** — Gradual feature rollout
- 📢 **Push Notifications** — Send targeted notifications

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 7 + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Edge Functions + Auth) |
| AI | Google Gemini API + OpenAI (TTS) |
| Payments | Razorpay |
| Mobile | Capacitor (Android/iOS) + PWA |
| Analytics | Mixpanel |
| Monitoring | Sentry |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase project (ref: `ngduavjaiqyiqjzelfpl`)

### Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL="https://ngduavjaiqyiqjzelfpl.supabase.co"
VITE_SUPABASE_ANON_KEY="your_anon_key"
VITE_RAZORPAY_KEY_ID="your_razorpay_key"
```

Backend secrets are configured via **Supabase Dashboard → Settings → Secrets**:
- `GEMINI_API_KEY` — Google Gemini for AI features
- `OPENAI_API_KEY` — OpenAI for Text-to-Speech
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — Payment processing

---

## 📁 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── admin/          # Admin dashboard components
│   ├── educator/       # Educator tools
│   ├── gamification/   # Badges, points
│   ├── landing/        # Landing page sections
│   ├── mobile/         # Mobile navigation
│   ├── study-planner/  # AI study planner widgets
│   └── ui/             # shadcn/ui components
├── pages/              # Route pages
├── hooks/              # Custom React hooks
├── services/           # API services & business logic
│   ├── api/            # API client modules
│   └── nlp/            # NLP/curriculum matching
├── contexts/           # React contexts (Auth, FeatureFlags)
├── config/             # App configuration
├── constants/          # Unified constants
├── utils/              # Utility functions
└── integrations/       # Supabase client & types

supabase/
├── functions/          # 15+ Edge Functions
├── migrations/         # Database migrations
└── config.toml         # Supabase config
```

---

## 🔧 Available Commands

```bash
npm run dev           # Start dev server (port 5173)
npm run build         # Production build
npm run preview       # Preview production build
npm run lint          # ESLint
npm run typecheck     # TypeScript check
npm run check         # Lint + TypeCheck
npm test              # Run Vitest tests
```

---

## 📱 Play Store Deployment

### Option A: TWA (Easiest — No Code)
1. Deploy to [jeenie.website](https://jeenie.website) via Vercel
2. Go to [pwabuilder.com](https://www.pwabuilder.com) → enter URL
3. Download Android `.aab` bundle
4. Upload to [Google Play Console](https://play.google.com/console) (₹2,100 one-time)

### Option B: Capacitor Native
```bash
npm run build
npx cap sync android
# Open in Android Studio → Build → Generate Signed Bundle
```

---

## 🗄️ Key Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles, streaks, points, subscription |
| `questions` / `questions_public` | Question bank (public view for students) |
| `question_attempts` | Practice mode attempts |
| `test_sessions` / `test_attempts` | Test mode data |
| `daily_progress` | Daily question counts, accuracy, goal tracking |
| `topic_mastery` | Per-topic mastery levels |
| `batches` / `chapters` / `topics` | Content hierarchy |
| `group_tests` | Educator-created group tests |
| `payments` | Razorpay payment records |
| `user_roles` | Role-based access (student/educator/admin) |

---

## 🔐 Security

- Row-Level Security (RLS) on all tables
- `user_roles` table for RBAC (never stored on profiles)
- `has_role()` security-definer function prevents recursive RLS
- `protect_premium_fields` trigger prevents client-side premium manipulation
- PKCE OAuth flow for Google login

---

## 📄 License

MIT License — See [LICENSE](LICENSE)

---

**Domain**: jeenie.website  
**Support**: support@jeenie.website  
**Maintainer**: JEEnie Team
