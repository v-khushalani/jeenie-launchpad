import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, BookOpen, Trophy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingHero = () => {
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    setMousePosition({
      x: (clientX / innerWidth - 0.5) * 20,
      y: (clientY / innerHeight - 0.5) * 20,
    });
  };

  const features = [
    { icon: Zap, label: 'Adaptive AI', desc: 'AI that learns your style' },
    { icon: BookOpen, label: 'Deep Question Bank', desc: 'Every major topic covered' },
    { icon: Trophy, label: 'Gamified', desc: 'Learn, compete, win' },
  ];

  return (
    <section 
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-background"
      onMouseMove={handleMouseMove}
    >
      {/* Subtle geometric grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{ backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
      />
      
      {/* Animated Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-primary/8 via-primary/4 to-transparent rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl transition-transform duration-500 ease-out"
          style={{ transform: `translate(calc(25% + ${mousePosition.x}px), calc(-33% + ${mousePosition.y}px))` }}
        />
        <div 
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-primary/6 to-transparent rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl transition-transform duration-500 ease-out"
          style={{ transform: `translate(calc(-25% - ${mousePosition.x * 0.5}px), calc(33% - ${mousePosition.y * 0.5}px))` }}
        />
        {/* Accent orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      {/* Top Right Navigation */}
      <nav aria-label="Primary" className="absolute top-8 right-8 flex gap-3 z-50 pointer-events-auto">
        <button
          onClick={() => navigate('/why-us')}
          className="px-6 py-2.5 text-base font-medium text-primary hover:text-primary hover:bg-primary-light/30 transition-all duration-300 rounded-full backdrop-blur-sm border border-transparent hover:border-primary/20"
        >
          Why Us
        </button>
        <button
          onClick={() => navigate('/login')}
          className="px-8 py-2.5 text-base font-semibold text-white bg-primary rounded-full hover:bg-primary/90 hover:shadow-2xl transition-all duration-300 active:scale-95 shadow-lg hover:-translate-y-1"
        >
          Sign In
        </button>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 space-y-6 pt-16 pb-16 flex flex-col items-center justify-center h-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-light to-primary-light/50 text-primary text-sm font-medium animate-fade-in backdrop-blur-sm border border-primary/10 hover:border-primary/30 transition-all duration-300 cursor-default group hover:shadow-lg">
          <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" />
          AI-Powered Learning for JEE, NEET & Boards
        </div>

        {/* Headline - Compact sizing */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-primary animate-fade-in-up max-w-4xl">
          <span className="block">Where AI</span>
          <span className="block">adapts to YOU</span>
        </h1>

        {/* Subtitle - Smaller */}
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up leading-relaxed font-medium" style={{ animationDelay: '0.15s' }}>
          The smartest way to prepare for JEE, NEET & Foundation. Personalized learning that evolves with every question you solve.
        </p>

        {/* CTA Buttons - Compact */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Button 
            size="sm"
            className="text-sm px-8 py-2.5 rounded-full shadow-apple group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            onClick={() => navigate('/signup')}
          >
            Start Learning Free 
            <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-sm px-8 py-2.5 rounded-full h-auto hover:bg-primary-light/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            onClick={() => navigate('/why-us')}
          >
            Why JEEnie?
          </Button>
        </div>

        {/* Feature pills - Interactive, Compact */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
          {features.map((f) => (
            <div
              key={f.label}
              onMouseEnter={() => setHoveredFeature(f.label)}
              onMouseLeave={() => setHoveredFeature(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-card/60 backdrop-blur-md border border-border shadow-sm text-xs sm:text-sm text-muted-foreground font-medium hover:bg-card/80 hover:border-primary/30 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-light to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <f.icon className="w-4 h-4 text-primary group-hover:text-primary-glow transition-colors duration-300" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-bold text-primary text-xs">{f.label}</div>
                {hoveredFeature === f.label && (
                  <div className="text-xs text-muted-foreground animate-fade-in">{f.desc}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
