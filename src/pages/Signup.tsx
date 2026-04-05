import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, GraduationCap, Phone, ChevronDown } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrength } from '@/components/ui/password-strength';
import { supabase } from '@/integrations/supabase/client';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState<'student' | 'educator'>('student');
  const [emailFormOpen, setEmailFormOpen] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUpWithEmail, isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && ref.length > 0) {
      localStorage.setItem('jeenie_pending_ref', ref.trim().toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' });
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim().length < 2) {
      toast({ title: "Name required", description: "Please enter your full name (at least 2 characters)", variant: "destructive" });
      return;
    }

    const phoneClean = phone.replace(/\s/g, '');
    if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      toast({ title: "Invalid phone", description: "Please enter a valid 10-digit Indian mobile number", variant: "destructive" });
      return;
    }

    if (password.length < 8) {
      toast({ title: "Password too weak", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast({ title: "Password too weak", description: "Password must contain uppercase, lowercase, and a number", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const result = await signUpWithEmail(email.trim(), password, fullName.trim(), accountType, phone.replace(/\s/g, ''));
    
    if (result.error) {
      const isRateLimit = result.error.toLowerCase().includes('rate limit') || result.error.toLowerCase().includes('email');
      if (isRateLimit) {
        toast({ 
          title: "Email limit reached", 
          description: "Too many signups right now. Try Google Sign-In instead — it's instant!", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Signup Failed", description: result.error, variant: "destructive" });
      }
      setIsLoading(false);
    } else {
      toast({ title: "Account Created! 🎉", description: "Check your email to verify your account" });
      setIsLoading(false);
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      
      <div className="flex-1 flex items-center justify-center pt-16 px-4">
        <Card className="w-full max-w-md border-border shadow-xl">
          <CardHeader className="text-center space-y-1 pb-3 pt-4">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-primary">
              Create Account
            </CardTitle>
            <p className="text-sm text-muted-foreground">Join thousands of students preparing for competitive exams</p>
          </CardHeader>
          
          <CardContent className="pb-5">
            {/* Google Sign-In — Primary CTA */}
            <Button
              type="button"
              className="w-full py-5 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-2">Recommended — instant signup, no email verification needed</p>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
            </div>

            {/* Collapsible Email Form */}
            <Collapsible open={emailFormOpen} onOpenChange={setEmailFormOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground">
                  <Mail className="w-4 h-4 mr-2" />
                  Sign up with email
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${emailFormOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-primary font-semibold text-sm">Account Type</Label>
                    <Select value={accountType} onValueChange={(val) => setAccountType(val as 'student' | 'educator')}>
                      <SelectTrigger className="border-input focus:border-primary h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">
                          <span className="flex items-center gap-2"><User className="h-4 w-4" /> Student</span>
                        </SelectItem>
                        <SelectItem value="educator">
                          <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Educator</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-primary text-sm">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="fullName" type="text" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-9 h-9 border-input focus:border-primary" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-primary text-sm">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="phone" type="tel" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="pl-9 h-9 border-input focus:border-primary" required maxLength={10} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-primary text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="your.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-9 border-input focus:border-primary" required autoComplete="off" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-primary text-sm">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="password" type={showPassword ? "text" : "password"} placeholder="Strong password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-9 h-9 border-input focus:border-primary" required autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-primary text-sm">Confirm</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-9 pr-9 h-9 border-input focus:border-primary" required autoComplete="new-password" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <PasswordStrength password={password} className="-mt-1" />

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </form>
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
