// src/pages/BadgesPage.tsx
// Full-page badge showcase with earning progress

import React from 'react';
import Header from '@/components/Header';
import BadgesShowcase from '@/components/gamification/BadgesShowcase';

const BadgesPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header />
      <div className="container mx-auto px-4 pt-20 pb-8 max-w-4xl">
        <BadgesShowcase />
      </div>
    </div>
  );
};

export default BadgesPage;
