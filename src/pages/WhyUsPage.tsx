import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  CircleAlert,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

const coreFeatures = [
  {
    icon: Brain,
    title: 'AI Doubt Solver',
    desc: 'Step-by-step explanation in simple Hinglish, instantly.',
  },
  {
    icon: Zap,
    title: 'Adaptive Difficulty',
    desc: 'Too easy? It levels up. Too hard? It recovers your confidence.',
  },
  {
    icon: BookOpen,
    title: 'Comprehensive Questions',
    desc: 'Physics, Chemistry, Maths practice mapped to exam needs.',
  },
  {
    icon: Target,
    title: 'Smart Practice',
    desc: 'Weak topics auto-prioritized for faster improvement.',
  },
  {
    icon: BarChart3,
    title: 'Action Analytics',
    desc: 'See what to fix next, not just pretty charts.',
  },
  {
    icon: Trophy,
    title: 'Gamified Momentum',
    desc: 'Points, streaks, and badges that reward consistency.',
  },
];

const timelineSteps = [
  {
    step: '01',
    title: 'Start',
    subtitle: 'Open app -> know exactly what to do',
    chips: ['Goal lock', 'Topic pick'],
    outcome: 'No confusion at session start',
  },
  {
    step: '02',
    title: 'Practice',
    subtitle: 'Adaptive questions + instant doubts',
    chips: ['Adaptive level', 'Instant doubt'],
    outcome: 'Faster correction and better understanding',
  },
  {
    step: '03',
    title: 'Improve',
    subtitle: 'Weak-spot map + next best action',
    chips: ['Weak-spot map', 'Next action'],
    outcome: 'Daily momentum and visible progress',
  },
];

const WhyUsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-20 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          <section className="relative overflow-hidden rounded-3xl gradient-primary p-7 sm:p-10 text-primary-foreground">
            <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 max-w-3xl space-y-4">
              <Badge className="bg-white/20 border-white/30 text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                Why JEEnie
              </Badge>

              <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
                Bas 3 cheezein: Start. Practice. Improve.
              </h1>

              <p className="text-white/90 text-base sm:text-lg">
                Itna simple ki dekhte hi samajh aa jaaye. Itna powerful ki marks mein dikhe.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="rounded-lg bg-white/15 border border-white/25 px-3 py-2 text-sm font-medium">Clarity</div>
                <div className="rounded-lg bg-white/15 border border-white/25 px-3 py-2 text-sm font-medium">Adaptive AI</div>
                <div className="rounded-lg bg-white/15 border border-white/25 px-3 py-2 text-sm font-medium">Instant Doubts</div>
                <div className="rounded-lg bg-white/15 border border-white/25 px-3 py-2 text-sm font-medium">Daily Momentum</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <Button
                  onClick={() => navigate('/signup')}
                  className="bg-white text-[#013062] hover:bg-white/90 font-semibold"
                >
                  Start Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="bg-transparent !text-white !border-white/70 hover:bg-white/15 hover:!text-white"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CircleAlert className="w-5 h-5 text-destructive" />
                  <p className="font-semibold text-foreground">Other Platforms</p>
                </div>
                <div className="flex items-start gap-2">
                  <CircleAlert className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-muted-foreground">Too many features, no clear next step</p>
                </div>
                <div className="flex items-start gap-2">
                  <CircleAlert className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-muted-foreground">Practice without feedback loop</p>
                </div>
                <div className="flex items-start gap-2">
                  <CircleAlert className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-muted-foreground">Progress looks busy, not useful</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary-light/20">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <p className="font-semibold text-foreground">With JEEnie</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                  <p className="text-sm text-foreground">Daily next-step shown first</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                  <p className="text-sm text-foreground">Doubts solved in-context, instantly</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                  <p className="text-sm text-foreground">Only action-focused analytics</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="py-1">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">Everything you need to crack it</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                One app. One workflow. No platform hopping.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {coreFeatures.map((f) => (
                <Card key={f.title} className="glass-card border-border hover:shadow-apple-lg transition-apple">
                  <CardContent className="p-5">
                    <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center mb-3">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-base font-semibold text-foreground">{f.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <div className="mb-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Userflow Timeline</h2>
              <p className="text-sm text-muted-foreground">Read kam, samajh zyada. Bas follow the line.</p>
            </div>

            <div className="relative mt-6">
              <div className="hidden md:block absolute left-0 right-0 top-5 h-px bg-border" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {timelineSteps.map((item) => (
                  <Card key={item.step} className="relative border-border hover:shadow-apple transition-apple">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                          {item.step}
                        </div>
                        <div className="hidden md:flex items-center gap-1 text-primary text-xs font-semibold">
                          <span>Flow</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>

                      <div>
                        <p className="text-lg font-bold text-foreground">{item.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{item.subtitle}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.chips.map((chip) => (
                          <Badge key={chip} variant="secondary" className="text-xs">
                            {chip}
                          </Badge>
                        ))}
                      </div>

                      <div className="rounded-lg bg-primary-light/30 border border-primary/20 p-3">
                        <p className="text-xs font-semibold text-primary mb-1">Outcome</p>
                        <p className="text-sm text-foreground">{item.outcome}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl gradient-primary text-primary-foreground p-7 sm:p-10 text-center space-y-4">
            <Badge className="mx-auto bg-white/20 border-white/30 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Simple. Fast. Effective.
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Switch to JEEnie and feel progress from Day 1.</h2>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-1">
              <Button
                onClick={() => navigate('/signup')}
                className="bg-white text-[#013062] hover:bg-white/90 font-semibold"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="bg-transparent !text-white !border-white/70 hover:bg-white/15 hover:!text-white"
              >
                Already a User? Sign In
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default WhyUsPage;
