import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BookOpenCheck, Layers3, UsersRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type LiveStats = {
  questions: number;
  chapters: number;
  attempts: number;
  learners: number;
};

const initialStats: LiveStats = {
  questions: 0,
  chapters: 0,
  attempts: 0,
  learners: 0,
};

const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);

const Testimonials = () => {
  const [stats, setStats] = useState<LiveStats>(initialStats);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const load = async () => {
      const [q, c, a, u] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('chapters').select('id', { count: 'exact', head: true }),
        supabase.from('question_attempts').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        questions: q.count || 0,
        chapters: c.count || 0,
        attempts: a.count || 0,
        learners: u.count || 0,
      });
      setUpdatedAt(new Date());
    };

    load();
  }, []);

  const cards = useMemo(() => [
    {
      icon: BookOpenCheck,
      label: 'Questions In Bank',
      value: fmt(stats.questions),
      tone: 'from-blue-500/15 to-cyan-500/10 border-blue-200/50',
    },
    {
      icon: Layers3,
      label: 'Chapters Available',
      value: fmt(stats.chapters),
      tone: 'from-purple-500/15 to-pink-500/10 border-purple-200/50',
    },
    {
      icon: Activity,
      label: 'Questions Attempted',
      value: fmt(stats.attempts),
      tone: 'from-emerald-500/15 to-lime-500/10 border-emerald-200/50',
    },
    {
      icon: UsersRound,
      label: 'Registered Learners',
      value: fmt(stats.learners),
      tone: 'from-orange-500/15 to-amber-500/10 border-orange-200/50',
    },
  ], [stats]);

  return (
    <section className="py-24 px-4 sm:px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Live Platform Pulse
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Real-time numbers from the learning platform. No mock metrics.
          </p>
          {updatedAt && (
            <p className="text-xs text-muted-foreground mt-3">
              Last updated: {updatedAt.toLocaleString('en-IN')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card, i) => (
            <div
              key={card.label}
              className={`rounded-2xl border bg-gradient-to-br ${card.tone} p-5 shadow-sm hover:shadow-lg transition-all duration-300 animate-fade-in-up`}
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/70 border border-white/60 flex items-center justify-center mb-4">
                <card.icon className="w-5 h-5 text-foreground" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{card.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{card.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
