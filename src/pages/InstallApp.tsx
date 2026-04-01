import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Share, MoreVertical, Plus, Check, ArrowLeft, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Install JEEnie AI</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-8 max-w-lg mx-auto w-full space-y-6">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <img src="/logo.png" alt="JEEnie AI" className="w-14 h-14" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">JEEnie AI</h2>
          <p className="text-muted-foreground text-sm">
            Install the app for a faster, native experience — works offline too!
          </p>
        </div>

        {isInstalled ? (
          <Card className="border-primary/20 bg-secondary">
            <CardContent className="p-6 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Already Installed!</h3>
              <p className="text-sm text-muted-foreground">
                JEEnie AI is installed. Open it from your home screen.
              </p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Native install button if available */}
            {deferredPrompt && (
              <Card className="border-primary/30">
                <CardContent className="p-6 space-y-4">
                  <Button onClick={handleInstall} size="lg" className="w-full gap-2 text-base">
                    <Download className="w-5 h-5" />
                    Install App Now
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    No app store needed • Takes 2 seconds • &lt;2MB
                  </p>
                </CardContent>
              </Card>
            )}

            {/* iOS instructions */}
            {isIOS && (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h3 className="font-semibold text-foreground text-center">Install on iPhone / iPad</h3>
                  <div className="space-y-4">
                    <Step number={1}>
                      Tap the <strong>Share</strong> button <Share className="w-4 h-4 inline text-primary" /> at the bottom of Safari
                    </Step>
                    <Step number={2}>
                      Scroll down and tap <strong>"Add to Home Screen"</strong>
                    </Step>
                    <Step number={3}>
                      Tap <strong>"Add"</strong> — Done! Open from home screen
                    </Step>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android / Chrome instructions (show when no native prompt available) */}
            {!isIOS && !deferredPrompt && (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h3 className="font-semibold text-foreground text-center">
                    {isAndroid ? 'Install on Android' : 'Install from Chrome'}
                  </h3>
                  <div className="space-y-4">
                    <Step number={1}>
                      Tap the <strong>menu</strong> <MoreVertical className="w-4 h-4 inline text-primary" /> (⋮) in your browser's top-right corner
                    </Step>
                    <Step number={2}>
                      Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>
                    </Step>
                    <Step number={3}>
                      Confirm and open from your home screen
                    </Step>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Desktop Chrome instructions */}
            {!isIOS && !isAndroid && (
              <Card className="bg-muted/30">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Chrome className="w-4 h-4 text-primary" />
                    Desktop? Look for the install icon ⊕ in Chrome's address bar
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Benefits */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Why install?</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { emoji: '⚡', text: 'Instant loading' },
              { emoji: '📴', text: 'Works offline' },
              { emoji: '🔔', text: 'Home screen icon' },
              { emoji: '🎯', text: 'Full-screen experience' },
            ].map((item) => (
              <div key={item.text} className="bg-secondary/50 rounded-xl p-3 text-center">
                <span className="text-xl">{item.emoji}</span>
                <p className="text-xs text-muted-foreground mt-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Step = ({ number, children }: { number: number; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
      {number}
    </div>
    <p className="text-sm text-foreground pt-1">{children}</p>
  </div>
);

export default InstallApp;
