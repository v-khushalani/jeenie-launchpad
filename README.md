# 🚀 JEEnie — AI-Powered Learning Platform for JEE/NEET

A complete student, educator, and admin platform built for competitive exam preparation with adaptive practice, AI assistance, and content management.

**Website**: [jeenie.website](https://jeenie.website)  
**Status**: ✅ Production Ready

---

## ✨ Key Features

### Student Features
- 🤖 **AI Doubt Solver** — Instant conceptual help with Google Gemini and KaTeX-backed math rendering
- 📚 **Adaptive Practice** — Chapter/topic filtering, subject tests, and difficulty adjustment
- 🎯 **Daily Goals & Limits** — Free users get daily question caps, Pro users enjoy unlimited practice
- 🔥 **Streak System** — Point-backed streaks and daily progress tracking
- 🏆 **Gamification** — Levels, badges, leaderboard, and study incentives
- 📊 **Analytics Dashboard** — Visual mastery and accuracy tracking
- 📝 **Mock Tests** — Full-length tests with reporting and review flow
- 📱 **PWA + Capacitor** — Installable web app with mobile support
- 🌙 **Dark Mode** — System-aware theme support

### Educator Features
- 📄 **Content Management** — Manage batches, chapters, topics, and questions
- 📋 **Group Tests** — Create shareable group tests with QR and join links
- 📊 **Student Analytics** — Track batch performance and summaries

### Admin Features
- 👤 **User & Role Management** — Admin, educator, and student access control
- 🏷️ **Batches & Content Manager** — Unified course content with synced JEE/NEET Physics and Chemistry chapters
- 📥 **PDF Question Extraction** — AI-assisted import of question banks
- 📢 **Announcements & Notifications** — Send targeted updates to users
- 🔧 **Feature Flags** — Controlled feature rollout and experimentation

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Edge Functions + Auth) |
| AI | Google Gemini + OpenAI |
| Payments | Razorpay |
| Mobile | Capacitor (Android/iOS) + PWA |
| Testing | Vitest + Playwright |

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- npm
- Supabase project configured with environment variables

### Install & Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Useful Commands

```bash
npm run dev           # Start local development server
npm run build         # Create production build
npm run preview       # Preview production build
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript checks
npm run check         # Run lint + typecheck
npm test              # Run Vitest unit tests
```

---

## ✅ Recommended Environment Variables

```env
VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
VITE_RAZORPAY_KEY_ID="your_razorpay_key"
```

Sensitive keys such as `GEMINI_API_KEY`, `OPENAI_API_KEY`, and Razorpay keys should be configured through your Supabase secrets.

---

## 📁 Project Structure

```
src/
├── components/         # Reusable UI and admin components
│   ├── admin/          # Admin dashboard tools
│   ├── educator/       # Educator-facing workflows
│   ├── ui/             # Shared UI primitives
├── pages/              # Route pages
├── hooks/              # Custom React hooks
├── services/           # External service integration and API logic
├── contexts/           # React providers and auth context
├── config/             # App configuration
├── constants/          # Shared constants and enums
├── utils/              # Utility helpers
└── integrations/       # Supabase and external integrations

supabase/
├── functions/          # Edge functions
├── migrations/         # Database migrations
└── config.toml         # Supabase configuration
```

---

## 📘 Notes

- The admin content manager supports shared Physics and Chemistry chapter metadata across JEE and NEET when these subjects are managed together.
- KaTeX math rendering has been tuned to avoid red error artifacts in questions, options, and explanations.
- The app supports both exam-specific content and shared senior-secondary chapter views.

---

## 🔐 Security Practices

- Row-Level Security (RLS) on core tables
- RBAC via `user_roles`
- Secure auth via Supabase Auth and session handling
- Protected premium and admin-only features via server-side policies

---

## 📄 License

MIT License — See [LICENSE](LICENSE)

---

**Support**: support@jeenie.website
