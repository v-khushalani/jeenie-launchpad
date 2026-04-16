import React, { useState, useEffect, useRef, useCallback } from 'react';

const GravitySimulator = () => {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [particleCount, setParticleCount] = useState(50);
  const [gravityStrength, setGravityStrength] = useState(1);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;
  const G = 0.5 * gravityStrength; // Gravity constant
  const SOFTENING = 50; // Softening factor to prevent singularities
  const PARTICLE_MASS = 1;
  const PARTICLE_SIZE = 3;
  const FRICTION = 0.998;
  const MAX_VELOCITY = 15;

  // Initialize particles
  const initializeParticles = useCallback((count) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        mass: PARTICLE_MASS,
        color: `hsl(${(i / count) * 360}, 80%, 50%)`,
        trail: [],
        maxTrailLength: 30,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Calculate forces and update particles
  const updateParticles = useCallback(() => {
    const particles = particlesRef.current;
    const n = particles.length;

    // Calculate forces
    for (let i = 0; i < n; i++) {
      let ax = 0;
      let ay = 0;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;

        const dx = particles[j].x - particles[i].x;
        const dy = particles[j].y - particles[i].y;
        const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
        const dist = Math.sqrt(distSq);

        // F = G * (m1 * m2) / r^2
        // a = F / m = G * m2 / r^2
        const force = (G * particles[j].mass) / distSq;

        ax += (force * dx) / dist;
        ay += (force * dy) / dist;
      }

      particles[i].vx += ax;
      particles[i].vy += ay;

      // Limit velocity
      const speed = Math.sqrt(particles[i].vx ** 2 + particles[i].vy ** 2);
      if (speed > MAX_VELOCITY) {
        particles[i].vx = (particles[i].vx / speed) * MAX_VELOCITY;
        particles[i].vy = (particles[i].vy / speed) * MAX_VELOCITY;
      }

      // Apply friction
      particles[i].vx *= FRICTION;
      particles[i].vy *= FRICTION;

      // Update position
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;

      // Wrap around edges
      if (particles[i].x < 0) particles[i].x = CANVAS_WIDTH;
      if (particles[i].x > CANVAS_WIDTH) particles[i].x = 0;
      if (particles[i].y < 0) particles[i].y = CANVAS_HEIGHT;
      if (particles[i].y > CANVAS_HEIGHT) particles[i].y = 0;

      // Store trail
      particles[i].trail.push({ x: particles[i].x, y: particles[i].y });
      if (particles[i].trail.length > particles[i].maxTrailLength) {
        particles[i].trail.shift();
      }
    }
  }, []);

  // Draw on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with semi-transparent background for trail effect
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const particles = particlesRef.current;

    // Draw particles and trails
    particles.forEach((particle) => {
      // Draw trail
      if (particle.trail.length > 1) {
        ctx.strokeStyle = particle.color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
        for (let i = 1; i < particle.trail.length; i++) {
          ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Draw particle
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, PARTICLE_SIZE, 0, Math.PI * 2);
      ctx.fill();

      // Draw glow
      ctx.strokeStyle = particle.color;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, PARTICLE_SIZE + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Draw info
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Particles: ${particles.length}`, 15, 25);
    ctx.fillText(`Gravity: ${gravityStrength.toFixed(1)}x`, 15, 45);
    ctx.fillText(`Status: ${isPlaying ? '▶ Running' : '⏸ Paused'}`, 15, 65);
  }, [isPlaying, gravityStrength]);

  // Animation loop
  useEffect(() => {
    initializeParticles(particleCount);
  }, [particleCount, initializeParticles]);

  useEffect(() => {
    const animate = () => {
      if (isPlaying) {
        updateParticles();
      }
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, updateParticles, draw]);

  const handleReset = () => {
    initializeParticles(particleCount);
  };

  const handleExplode = () => {
    const particles = particlesRef.current;
    particles.forEach((p) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
    });
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '20px',
        boxSizing: 'border-box',
        color: '#e2e8f0',
      }}
    >
      <h1 style={{ marginTop: 0, marginBottom: 10, color: '#60a5fa', fontSize: '36px', textAlign: 'center' }}>
        🌌 Gravity Particle System
      </h1>
      <p style={{ marginBottom: 20, color: '#94a3b8', fontSize: '14px', maxWidth: 600, textAlign: 'center' }}>
        An N-body gravity simulation demonstrating Newton's laws of universal gravitation. Watch particles attract and orbit each other!
      </p>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          border: '2px solid #475569',
          borderRadius: '12px',
          backgroundColor: '#1e293b',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          marginBottom: '30px',
          cursor: 'pointer',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          width: '100%',
          maxWidth: '600px',
        }}
      >
        {/* Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#cbd5e1' }}>
              Particles: <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{particleCount}</span>
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={particleCount}
              onChange={(e) => setParticleCount(Number(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: '#334155',
                outline: 'none',
                accentColor: '#60a5fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#cbd5e1' }}>
              Gravity: <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{gravityStrength.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={gravityStrength}
              onChange={(e) => setGravityStrength(Number(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: '#334155',
                outline: 'none',
                accentColor: '#60a5fa',
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '15px',
          }}
        >
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: isPlaying ? '#ef4444' : '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <button
            onClick={handleReset}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            }}
          >
            🔄 Reset
          </button>

          <button
            onClick={handleExplode}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              gridColumn: '1 / -1',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            }}
          >
            💥 Explode
          </button>
        </div>

        {/* Info */}
        <div
          style={{
            padding: '15px',
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            borderLeft: '4px solid #60a5fa',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#cbd5e1',
            lineHeight: '1.6',
          }}
        >
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>📚 Educational:</strong> This simulation demonstrates Newton's law of universal gravitation. Each particle attracts every other particle with a force proportional to their masses and inversely proportional to the square of the distance between them.
          </p>
          <p style={{ margin: '0' }}>
            <strong>🎮 Interactive:</strong> Adjust particle count and gravity strength to see different behaviors - from stable orbits to chaotic systems!
          </p>
        </div>
      </div>
    </div>
  );
};

export default GravitySimulator;
