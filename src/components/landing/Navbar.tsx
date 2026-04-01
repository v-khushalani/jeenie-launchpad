import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <img src="/logo.png" alt="JEEnie" className="h-8 w-8 rounded-lg" />
          <span className="text-xl font-bold text-primary">JEEnie</span>
        </button>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/why-us')}>
            Why Us
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
            Sign In
          </Button>
          <Button size="sm" onClick={() => navigate('/signup')}>
            Start Free
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
