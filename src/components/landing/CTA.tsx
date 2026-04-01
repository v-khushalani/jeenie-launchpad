import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Ready to study smarter, not harder?
        </h2>
        <p className="text-lg text-muted-foreground">
          Join thousands of students who are already using AI to ace their exams. Start for free — no credit card needed.
        </p>
        <Button size="lg" className="text-lg px-12 py-6 rounded-full shadow-apple-lg" onClick={() => navigate('/signup')}>
          Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </section>
  );
};

export default CTA;
