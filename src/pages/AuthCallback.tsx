import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { logger } from '@/utils/logger';
import { isGoalComplete } from '@/config/goalConfig';
import SEOHead from '@/components/SEOHead';

const AuthCallback = () => {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const url = new URL(window.location.href);
    const errorParam = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (errorParam) {
      logger.error('Auth error from URL:', errorParam, errorDescription);
      navigate(`/login?error=${encodeURIComponent(errorDescription || errorParam)}`, { replace: true });
      return;
    }

    // PKCE flow: exchange code for session
    const code = url.searchParams.get('code');
    if (code) {
      logger.log('PKCE code detected, exchanging for session...');
      supabase.auth.exchangeCodeForSession(code).catch((err) => {
        logger.error('Code exchange failed:', err);
      });
      // Session will be picked up by the listener below
    }

    // Primary: listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info('AuthCallback onAuthStateChange:', event);

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session?.user) {
        clearTimeout(timeout);
        await checkProfileAndRedirect(session.user.id);
      }

      if (event === 'PASSWORD_RECOVERY' && session) {
        clearTimeout(timeout);
        navigate('/reset-password', { replace: true });
      }
    });

    // Timeout fallback
    const timeout = setTimeout(async () => {
      // One last try
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        await checkProfileAndRedirect(data.session.user.id);
      } else {
        logger.error('Auth callback timeout — no session after 10s');
        navigate('/login?error=timeout', { replace: true });
      }
    }, 10000);

    async function checkProfileAndRedirect(userId: string) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('target_exam, grade')
          .eq('id', userId)
          .single();

        if (error && error.code === 'PGRST116') {
          navigate('/goal-selection', { replace: true });
          return;
        }

        if (isGoalComplete(profile || {})) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/goal-selection', { replace: true });
        }
      } catch (err) {
        logger.error('Profile check error:', err);
        navigate('/goal-selection', { replace: true });
      }
    }

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center">
      <SEOHead
        title="Authentication Callback"
        description="Authentication in progress."
        canonical="https://www.jeenie.website/auth/callback"
        noIndex
      />
      <Card className="max-w-md mx-4">
        <CardContent className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-primary">
            Completing sign-in...
          </h2>
          <p className="text-muted-foreground">
            Verifying your account and setting things up.
          </p>
          <p className="text-muted-foreground text-xs mt-4">
            This should take a few seconds.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
