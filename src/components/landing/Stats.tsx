import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Stats = () => {
  const [questionCount, setQuestionCount] = useState<string>('Loading…');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true });
        if (count !== null && count > 0) {
          const rounded = Math.floor(count / 1000) * 1000;
          setQuestionCount(rounded > 0 ? `${(rounded / 1000).toFixed(0)},000+` : `${count}+`);
        }
      } catch {
        // Keep default count on error
      }
    };
    fetchStats();
  }, []);

  const stats = [
    { value: questionCount, label: 'Practice Questions' },
    { value: '24/7', label: 'AI Doubt Solving' },
    { value: '3', label: 'Exam Categories' },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 gradient-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-4xl sm:text-5xl font-bold mb-2">{s.value}</div>
              <div className="text-sm sm:text-base opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
