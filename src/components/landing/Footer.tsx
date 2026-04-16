import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="py-12 px-4 sm:px-6 border-t border-border bg-surface">
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="JEEnie AI Logo" className="h-6 w-6 rounded-md" loading="lazy" />
          <span className="font-semibold text-foreground">JEEnie AI</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link to="/why-us" className="hover:text-primary transition-colors">Why Us</Link>
          <Link to="/subscription-plans" className="hover:text-primary transition-colors">Pricing</Link>
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
          <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms</Link>
          <Link to="/refund-policy" className="hover:text-primary transition-colors">Refunds</Link>
          <a href="mailto:support@jeenie.website" className="hover:text-primary transition-colors">Contact</a>
        </nav>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-6">
        © {new Date().getFullYear()} JEEnie AI. All rights reserved. Made with ❤️ for JEE &amp; NEET aspirants in India.
      </p>
    </div>
  </footer>
);

export default Footer;
