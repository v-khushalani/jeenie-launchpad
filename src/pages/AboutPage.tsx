import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, Target, Trophy } from 'lucide-react';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import JsonLd, { breadcrumbSchema, organizationSchema } from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="About JEEnie AI"
        description="Learn about JEEnie AI's mission to help JEE Main, JEE Advanced, NEET and Olympiad aspirants with personalized learning, adaptive practice and clear explanations."
        canonical="https://www.jeenie.website/about"
      />
      <JsonLd data={organizationSchema} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', item: 'https://www.jeenie.website/' },
          { name: 'About', item: 'https://www.jeenie.website/about' },
        ])}
      />
      <Header />

      <main className="container mx-auto max-w-5xl px-4 py-8">
        <section className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-3">About JEEnie AI</h1>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            JEEnie AI helps students prepare for JEE Main, JEE Advanced, NEET and Olympiad exams
            through personalized learning paths, adaptive practice and explain-like-a-friend support.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <Card>
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Mission</h2>
              <p className="text-sm text-muted-foreground">
                Make high-quality exam prep accessible, measurable and affordable for every learner.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">How We Teach</h2>
              <p className="text-sm text-muted-foreground">
                AI-assisted explanations, weak-topic detection and adaptive difficulty to improve outcomes faster.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">What Students Get</h2>
              <p className="text-sm text-muted-foreground">
                Smart tests, structured practice, analytics and actionable next steps instead of random study.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Learning Momentum</h2>
              <p className="text-sm text-muted-foreground">
                Streaks, badges and progress loops that make consistency easier and more rewarding.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-xl border border-border p-6 bg-card">
          <h2 className="text-xl font-semibold text-primary mb-2">Why It Works</h2>
          <p className="text-muted-foreground mb-4">
            Most students do not need more content. They need better direction. JEEnie AI focuses on
            topic prioritization, feedback loops and practice quality so every hour of study creates progress.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild>
              <Link to="/signup">
                Start Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/faq">Read FAQs</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AboutPage;
