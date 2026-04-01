import React from 'react';
import Header from '@/components/Header';
import AIStudyPlanner from '@/components/AIStudyPlanner';

const AIStudyPlannerPage = () => {
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto pt-16 sm:pt-20 pb-20 md:pb-4">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 max-w-7xl">
          <AIStudyPlanner />
        </div>
      </div>
    </div>
  );
};

export default AIStudyPlannerPage;
