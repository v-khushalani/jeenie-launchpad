import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ReferralService from '@/services/referralService';
import { User, Session } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { identifyUser, AnalyticsEvents } from '@/utils/analytics';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPremium: boolean;
  userRole: 'admin' | 'student' | 'super_admin' | 'educator' | null;
  refreshPremium: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, fullName: string, accountType?: 'student' | 'educator', phone?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateProfile: (profileData: Record<string, unknown>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'student' | 'super_admin' | 'educator' | null>(null);
  const listenerRef = React.useRef<{ subscription: { unsubscribe: () => void } } | null>(null);

  // Check premium status and user role
  const checkPremiumStatus = async (userId: string) => {
    try {
      // Get premium status from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, subscription_end_date')
        .eq('id', userId)
        .single();

    // ✅ FIX: Check is_premium flag OR valid subscription_end_date
    const isPremiumActive = profile?.is_premium || 
      (profile?.subscription_end_date && new Date(profile.subscription_end_date) > new Date());

    setIsPremium(!!isPremiumActive);
      
      // Get role from user_roles table (secure, service-role-only table)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      let resolvedRole: 'admin' | 'student' | 'super_admin' | 'educator' = 'student';
      if (roleData?.role) {
        resolvedRole = roleData.role as typeof resolvedRole;
      } else if (roleError) {
        // Fallback: check user_metadata.account_type if user_roles query fails (e.g. RLS)
        logger.warn('user_roles query failed, falling back to metadata:', roleError.message);
        const metaType = (await supabase.auth.getUser()).data?.user?.user_metadata?.account_type;
        if (metaType === 'educator') resolvedRole = 'educator';
      }

      setUserRole(resolvedRole);
      logger.log('✅ Premium status:', isPremiumActive ? 'PREMIUM' : 'FREE');
      logger.log('✅ User role:', resolvedRole);
    } catch (error) {
      logger.error('❌ Premium check error:', error);
      setIsPremium(false);
      setUserRole('student');
    }
  };

  useEffect(() => {
    let mounted = true;
    logger.log("🚀 Setting up Supabase Auth listener (runs once)");
  
    const updateAuthState = async (session: Session | null) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check premium status when user logs in
      if (session?.user) {
        await checkPremiumStatus(session.user.id);
      } else {
        setIsPremium(false);
        setUserRole(null);
      }
      
      setIsLoading(false);
    };
  
    // 1️⃣ Fetch initial session FIRST
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) logger.error("❌ Initial session error:", error);
      logger.log("🔍 Initial session check:", session?.user?.id || "none");
      updateAuthState(session);
    });
  
    // 2️⃣ Remove any existing listener before creating a new one
    if (listenerRef.current) {
      logger.log("🧹 Removing old auth listener...");
      listenerRef.current.subscription.unsubscribe();
    }
  
    // 3️⃣ Listen for subsequent auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.info("Auth event", { event, userId: session?.user?.id || "none" });
        updateAuthState(session);
  
        if (event === "SIGNED_IN" && session?.user) {
          setTimeout(() => createUserProfileIfNeeded(session.user), 0);
        }

        // Handle password recovery — redirect to reset page if not already there
        if (event === "PASSWORD_RECOVERY" && session) {
          logger.info("Password recovery event detected, redirecting to reset page");
          if (!window.location.pathname.includes('/reset-password')) {
            window.location.href = '/reset-password';
          }
        }
  
        if (event === "SIGNED_OUT") {
          setUser(null);
          setSession(null);
          setUserRole(null);
        }
      }
    );
  
    listenerRef.current = listener; // ✅ store listener reference
  
    return () => {
      mounted = false;
      if (listenerRef.current) {
        logger.info("Cleaning up Supabase listener on unmount");
        listenerRef.current.subscription.unsubscribe();
        listenerRef.current = null;
      }
    };
  }, []);

  
  const createUserProfileIfNeeded = async (user: User) => {
    try {
      logger.info('Checking profile for user', { userId: user.id });
      
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Profile doesn't exist, create it
        logger.info('Creating new profile');
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Student',
            email: user.email || '',
            avatar_url: user.user_metadata?.avatar_url,
            target_exam: null,
            grade: null,
            subjects: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          logger.error('Profile creation failed:', insertError);
        } else {
          logger.info('Profile created successfully');
        }
      }
    } catch (error) {
      logger.error('Profile check/creation error:', error);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      logger.log('🚀 Starting email sign in...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('❌ Email sign in error:', error);
        setIsLoading(false);
        return { error: error.message };
      }

      logger.log('✅ Email sign in successful');
      if (data.user) {
        identifyUser(data.user.id, { email: data.user.email });
        AnalyticsEvents.signIn('email');
      }
      setIsLoading(false);
      return {};
    } catch (error: any) {
      logger.error('❌ Sign-in error:', error);
      setIsLoading(false);
      return { error: error.message || 'Failed to sign in' };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string, accountType?: 'student' | 'educator', phone?: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      logger.log('🚀 Starting email sign up...');

      const finalName = accountType === 'educator' ? `${fullName} (Educator)` : fullName;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: finalName,
            account_type: accountType || 'student',
            phone: phone || undefined,
          },
        },
      });

      if (error) {
        logger.error('❌ Email sign up error:', error);
        setIsLoading(false);
        return { error: error.message };
      }

      // Profile is auto-created by the handle_new_user database trigger

      logger.log('✅ Email sign up successful');
      if (data.user) {
        identifyUser(data.user.id, { email: data.user.email });
        AnalyticsEvents.signUp('email');

        // Process pending referral (stored by Signup page from ?ref= URL param)
        const pendingRef = localStorage.getItem('jeenie_pending_ref');
        if (pendingRef) {
          try {
            await ReferralService.processReferralOnSignup(data.user.id, pendingRef);
            localStorage.removeItem('jeenie_pending_ref');
            logger.log('✅ Referral processed for new user', data.user.id);
          } catch (refErr) {
            // Non-fatal — don't block signup if referral fails
            logger.warn('⚠️ Referral processing failed (non-fatal):', refErr);
            localStorage.removeItem('jeenie_pending_ref');
          }
        }
      }
      setIsLoading(false);
      return {};
    } catch (error: any) {
      logger.error('❌ Sign-up error:', error);
      setIsLoading(false);
      return { error: error.message || 'Failed to sign up' };
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    try {
      logger.log('🚀 Sending password reset email...');

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        logger.error('❌ Password reset error:', error);
        return { error: error.message };
      }

      logger.log('✅ Password reset email sent');
      return {};
    } catch (error: any) {
      logger.error('❌ Reset password error:', error);
      return { error: error.message || 'Failed to send reset email' };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ error?: string }> => {
    try {
      logger.log('🚀 Updating password...');

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        logger.error('❌ Update password error:', error);
        return { error: error.message };
      }

      logger.log('✅ Password updated successfully');
      return {};
    } catch (error: any) {
      logger.error('❌ Update password error:', error);
      return { error: error.message || 'Failed to update password' };
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    logger.info('Signing out...');

    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out error:', error);
    }

    // Clear localStorage
    localStorage.removeItem('userGoals');
    localStorage.removeItem('studyProgress');

    // Immediately clear auth state to update UI
    setUser(null);
    setSession(null);
    setUserRole(null);

    AnalyticsEvents.signOut();
    setIsLoading(false);
    logger.info('Signed out successfully');
  };

  const updateProfile = async (profileData: Record<string, unknown>): Promise<{ error?: string }> => {
    if (!user) return { error: 'No user found' };
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData as any)
        .eq('id', user.id);
      
      if (error) {
        logger.error('Profile update error:', error);
        return { error: error.message };
      }
      
      return {};
    } catch (error: any) {
      logger.error('Profile update error:', error);
      return { error: error.message || 'Failed to update profile' };
    }
  };

  const refreshPremium = async () => {
    if (user) {
      await checkPremiumStatus(user.id);
    }
  };

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    isPremium,
    userRole,
    refreshPremium,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
