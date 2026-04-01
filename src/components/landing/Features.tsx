import React from 'react';
import { Zap, BookOpen, Trophy, Brain, Target, BarChart3 } from 'lucide-react';

const features = [
  { icon: Brain, title: 'AI Doubt Solver', desc: 'Ask JEEnie anything — get detailed step-by-step solutions in Hinglish, instantly.' },
  { icon: Zap, title: 'Adaptive Difficulty', desc: 'Questions auto-adjust to your level. Too easy? It gets harder. Struggling? It backs off.' },
  { icon: BookOpen, title: 'Comprehensive Questions', desc: 'Curated question bank covering Physics, Chemistry & Maths for JEE, NEET & Boards.' },
  { icon: Target, title: 'Smart Practice', desc: 'Focus on weak topics with AI-generated practice sessions tailored just for you.' },
  { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track your progress with SWOT analysis, accuracy trends, and topic mastery maps.' },
  { icon: Trophy, title: 'Gamified Learning', desc: 'Earn points, badges, maintain streaks, and climb the leaderboard against peers.' },
];

const Features = () => (
  <section className="py-24 px-4 sm:px-6 bg-surface">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Everything you need to crack it
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Built by educators & engineers who understand what JEE/NEET aspirants actually need.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="group glass-card rounded-2xl p-6 hover:shadow-apple-lg transition-apple animate-fade-in-up"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <f.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
