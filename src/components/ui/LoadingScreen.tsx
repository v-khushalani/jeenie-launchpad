import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = React.forwardRef<HTMLDivElement, LoadingScreenProps>(
  ({ message = 'Loading...' }, ref) => (
    <div ref={ref} className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <img
        src="/logo.png"
        alt="JEEnie learning logo"
        className="h-14 w-14 rounded-xl animate-pulse"
        loading="eager"
      />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
);

LoadingScreen.displayName = 'LoadingScreen';

export default LoadingScreen;
