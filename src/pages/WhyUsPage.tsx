import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SEOHead from '@/components/SEOHead';
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

const comparisonData = [
  { feature: 'AI Doubt Solving', us: true, others: false },
  { feature: 'Adaptive Difficulty', us: true, others: false },
  { feature: 'Personalized Study Plan', us: true, others: false },
  { feature: 'Parent Dashboard', us: true, others: false },
  { feature: 'Smart Analytics', us: true, others: 'Basic' },
  { feature: 'Gamification', us: true, others: 'Basic' },
  { feature: 'Affordable Pricing', us: '₹99/mo', others: '₹500+' },
];

const WhyUsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Why Choose JEEnie AI for JEE &amp; NEET Prep"
        description="Compare JEEnie AI with other coaching apps. AI doubt solving, adaptive difficulty, personalized study plans, parent dashboard & gamified learning at ₹99/mo."
        canonical="https://jeenie.website/why-us"
      />
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero */}
        <section className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" /> Why Students Choose Us
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-3">
            Not Just Another Coaching App
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            JEEnie AI adapts to your weaknesses, explains in Hinglish, and
            costs less than a pizza per month. Here's why 10,000+ students
            trust us.
          </p>
        </section>

        {/* Core Features */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8 text-primary">
            What Makes JEEnie AI Different
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreFeatures.map((f) => (
              <Card key={f.title} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8 text-primary">
            JEEnie AI vs Others
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-primary/20">
                  <th className="text-left py-3 px-4 text-foreground font-semibold">Feature</th>
                  <th className="text-center py-3 px-4 text-primary font-semibold">JEEnie AI</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-semibold">
                    Others
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row) => (
                  <tr key={row.feature} className="border-b border-border hover:bg-muted/30">
                    <td className="py-3 px-4 text-foreground text-sm">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {row.us === true ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-sm font-semibold text-primary">{row.us}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.others === false ? (
                        <CircleAlert className="w-5 h-5 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-sm text-muted-foreground">{row.others}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Social Proof */}
        <section className="mb-16 text-center">
          <h2 className="text-2xl font-bold mb-6 text-primary">Trusted by Students</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Active Students', value: '10,000+' },
              { label: 'Questions Solved', value: '5L+' },
              { label: 'Avg Score Boost', value: '+23%' },
              { label: 'AI Sessions', value: '50K+' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl bg-card border border-border">
                <div className="text-2xl font-bold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <h2 className="text-2xl font-bold mb-3 text-primary">Ready to Start?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of JEE & NEET aspirants who are studying smarter.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate('/signup')}>
              Start Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/subscription-plans')}>
              View Plans
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WhyUsPage;
