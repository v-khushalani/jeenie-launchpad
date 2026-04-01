import React from 'react';

const Footer = () => (
  <footer className="py-12 px-4 sm:px-6 border-t border-border bg-surface">
    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="JEEnie" className="h-6 w-6 rounded-md" />
        <span className="font-semibold text-foreground">JEEnie AI</span>
      </div>
      <p className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} JEEnie AI. All rights reserved.
      </p>
    </div>
  </footer>
);

export default Footer;
