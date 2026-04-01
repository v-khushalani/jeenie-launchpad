import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LandingHero from '@/components/landing/LandingHero';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="h-screen overflow-hidden bg-background">
      <main className="h-full">
        <div className="h-full">
          <LandingHero />
        </div>
      </main>
    </div>
  );
};

export default Index;
