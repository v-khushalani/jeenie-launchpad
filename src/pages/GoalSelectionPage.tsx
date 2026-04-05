import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useExamDates } from '@/hooks/useExamDates';
import { supabase } from '@/integrations/supabase/client';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { 
  ChevronRight, ChevronLeft, Calendar, BookOpen, Stethoscope, Calculator, 
  Clock, Rocket, Trophy, Target, Sparkles, Lock,
  GraduationCap, Atom, FlaskConical, Brain
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
// GoalChangeWarning removed — goal changes are no longer allowed
import {
  type TargetExam,
  isCompetitiveGrade,
  isFoundationGrade,
  getAllowedExams,
  getSubjects,
  normalizeTargetExam,
  buildGoalPayload,
  isGoalComplete,
  EXAM_LABELS,
} from '@/config/goalConfig';

const GoalSelectionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedExam, setSelectedExam] = useState<TargetExam | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [examDate, setExamDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [isStartingJourney, setIsStartingJourney] = useState(false);
  
  // Goal change is no longer allowed — these are kept only for type safety in JSX references below
  
  const redirectCheckedRef = useRef(false);
  const { getExamDate } = useExamDates();

  // Compute exam date based on grade
  const getExamDateForGrade = (exam: TargetExam): string | null => {
    if (exam === 'BOARDS') return null;
    if (!selectedGrade) return null;

    const baseDate = getExamDate(exam);
    if (!baseDate) return null;

    const date = new Date(baseDate);
    if (selectedGrade === 11) {
      date.setFullYear(date.getFullYear() + 1);
    }
    if (date.getTime() < Date.now()) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString().slice(0, 10);
  };

  // Check if user has already completed goal selection
  useEffect(() => {
    const checkUserProfile = async () => {
      if (redirectCheckedRef.current) return;
      if (!user?.id) { setIsLoading(false); return; }
  
      try {
        redirectCheckedRef.current = true;
        
        const cachedGoals = localStorage.getItem('userGoals');
        if (cachedGoals) {
          try {
            const goals = JSON.parse(cachedGoals);
            if (goals?.goal && goals?.grade) {
              setIsLoading(false);
              navigate('/dashboard', { replace: true });
              return;
            }
          } catch { /* invalid cache */ }
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, target_exam, grade')
          .eq('id', user.id)
          .maybeSingle();
  
        if (error && error.code !== 'PGRST116') {
          logger.error('Profile check error:', error);
          setIsLoading(false);
          return;
        }
  
        if (isGoalComplete(profile || {})) {
          // Goal is locked — no change mode allowed anymore
          setIsLoading(false);
          navigate('/dashboard', { replace: true });
          return;
        }
  
        setIsLoading(false);
      } catch (error) {
        logger.error('Error checking user profile:', error);
        setIsLoading(false);
      }
    };
  
    checkUserProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Update exam date when selections change
  useEffect(() => {
    if (selectedExam && selectedGrade) {
      const examDateStr = getExamDateForGrade(selectedExam);
      if (examDateStr) {
        const today = new Date();
        const exam = new Date(examDateStr);
        const timeDiff = exam.getTime() - today.getTime();
        const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
        setDaysRemaining(days > 0 ? days : 0);
        setExamDate(examDateStr);
      } else {
        setDaysRemaining(0);
        setExamDate('');
      }
    } else {
      setDaysRemaining(0);
      setExamDate('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, selectedGrade]);

  // Handle grade selection: auto-set exam for foundation, advance step
  const handleGradeSelect = (gradeId: number) => {
    setSelectedGrade(gradeId);
    
    if (isFoundationGrade(gradeId)) {
      // Foundation grades: auto-select Pre-Foundation and go directly to confirmation
      setSelectedExam('BOARDS');
      setCurrentStep(2);
    } else {
      // Competitive grades: go to exam selection
      setSelectedExam(null);
      setCurrentStep(2);
    }
  };

  const grades = [
    { id: 6, name: 'Class 6', icon: '🌱', desc: 'Building Basics', color: 'from-emerald-400 to-teal-500' },
    { id: 7, name: 'Class 7', icon: '🌿', desc: 'Growing Strong', color: 'from-green-400 to-emerald-500' },
    { id: 8, name: 'Class 8', icon: '🌳', desc: 'Skill Builder', color: 'from-teal-400 to-cyan-500' },
    { id: 9, name: 'Class 9', icon: '🏗️', desc: 'Foundation Year', color: 'from-cyan-400 to-blue-500' },
    { id: 10, name: 'Class 10', icon: '📚', desc: 'Board Ready', color: 'from-blue-400 to-indigo-500' },
    { id: 11, name: 'Class 11', icon: '🎯', desc: 'Competitive Edge', color: 'from-indigo-400 to-purple-500' },
    { id: 12, name: 'Class 12', icon: '🚀', desc: 'Final Sprint', color: 'from-purple-400 to-pink-500' },
  ];

  const examOptions: { id: TargetExam; name: string; icon: React.ReactNode; gradient: string; desc: string; tagline: string }[] = [
    { 
      id: 'JEE', 
      name: 'JEE Preparation', 
      icon: <Calculator className="w-7 h-7" />, 
      gradient: 'from-red-500 to-orange-500', 
      desc: 'IIT-JEE Main + Advanced',
      tagline: 'Physics • Chemistry • Maths'
    },
    { 
      id: 'NEET', 
      name: 'NEET Preparation', 
      icon: <Stethoscope className="w-7 h-7" />, 
      gradient: 'from-green-500 to-emerald-500', 
      desc: 'Medical Entrance Exam',
      tagline: 'Physics • Chemistry • Biology'
    },
    { 
      id: 'MH_CET', 
      name: 'MHT-CET Preparation', 
      icon: <Target className="w-7 h-7" />, 
      gradient: 'from-orange-500 to-amber-500', 
      desc: 'Maharashtra Common Entrance',
      tagline: 'Physics • Chemistry • Maths'
    },
  ];

  const handleStartJourney = () => {
    if (!selectedExam || !selectedGrade) return;
    setShowWelcomeDialog(true);
  };

  const confirmStartJourney = async () => {
    if (!selectedExam || !selectedGrade) return;
    
    setIsStartingJourney(true);
    setShowWelcomeDialog(false);
    
    try {
      if (!user?.id) {
        toast.error('Please login again');
        setIsStartingJourney(false);
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const payload = buildGoalPayload(selectedExam, selectedGrade);

      let targetExamDate: string | null = null;
      try {
        const baseExamDate = getExamDate(selectedExam === 'BOARDS' ? 'Foundation' : selectedExam);
        if (baseExamDate) {
          const base = new Date(baseExamDate);
          if (selectedGrade === 11 && selectedExam !== 'BOARDS') {
            base.setFullYear(base.getFullYear() + 1);
          }
          targetExamDate = base.toISOString().slice(0, 10);
        }
      } catch (err) {
        logger.warn('Failed to derive target exam date:', err);
      }

      logger.info('Updating profile with:', { ...payload, target_exam_date: targetExamDate });

      const { error: profileError, data: updateData } = await supabase
        .from('profiles')
        .update({
          ...payload,
          ...(targetExamDate ? { target_exam_date: targetExamDate } : {}),
        })
        .eq('id', user.id)
        .select();

      if (profileError) {
        logger.error('Profile update error:', profileError);
        toast.error('Error saving profile. Please try again.');
        setIsStartingJourney(false);
        return;
      }

      if (updateData && updateData.length > 0) {
        const saved = updateData[0];
        if (isGoalComplete(saved)) {
          logger.info('Profile verified successfully');
        } else {
          logger.warn('Profile update succeeded but missing some fields');
        }
      }

      toast.success('Your learning path is set! 🎯');

      const userGoals = {
        grade: selectedGrade,
        goal: selectedExam,
        subjects: getSubjects(selectedExam),
        name: profile?.full_name,
        daysRemaining,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('userGoals', JSON.stringify(userGoals));
      sessionStorage.setItem('goalSelectionComplete', 'true');

      await new Promise(resolve => setTimeout(resolve, 800));
      setIsStartingJourney(false);
      // Redirect to diagnostic quiz for first-time users
      const diagnosticDone = localStorage.getItem('diagnosticComplete');
      if (diagnosticDone) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/diagnostic', { replace: true });
      }
    } catch (error) {
      logger.error('Error saving goals:', error);
      toast.error('Something went wrong. Please try again.');
      setIsStartingJourney(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Setting up your learning journey..." />;
  }

  return (
    <>
      <div className="mobile-app-shell-header-only bg-background overflow-hidden">
        {/* Decorative background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
        </div>

        <div className="relative h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 text-center pt-6 pb-3 md:pt-8 md:pb-5 px-4">
            <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                Get Started
              </span>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-extrabold mb-1 text-foreground tracking-tight">
              Choose Your Path
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              Select your grade and we'll personalize everything for you
            </p>
            
            {/* Step indicators */}
            <div className="flex justify-center mt-4 gap-2">
              {[1, 2].map((step) => (
                <div 
                  key={step} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    step <= currentStep 
                      ? 'w-12 bg-primary' 
                      : 'w-6 bg-muted-foreground/20'
                  }`} 
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
            {/* Step 1: Grade Selection */}
            {currentStep === 1 && (
              <div className="max-w-2xl mx-auto">
                <h2 className="text-lg md:text-xl font-bold text-center mb-1 text-foreground">
                  Which class are you in? 
                </h2>
                <p className="text-center text-muted-foreground text-xs md:text-sm mb-5">
                  Tap your class to continue
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {grades.map((grade) => (
                    <button
                      key={grade.id}
                      onClick={() => handleGradeSelect(grade.id)}
                      className={`relative group p-4 md:p-5 rounded-2xl cursor-pointer transition-all duration-300 border-2 text-left ${
                        selectedGrade === grade.id
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]'
                          : 'border-border bg-card hover:border-primary/40 hover:shadow-md'
                      }`}
                    >
                      {/* Gradient accent line */}
                      <div className={`absolute top-0 left-4 right-4 h-1 rounded-b-full bg-gradient-to-r ${grade.color} opacity-0 group-hover:opacity-100 transition-opacity ${
                        selectedGrade === grade.id ? 'opacity-100' : ''
                      }`} />
                      
                      <div className="text-2xl md:text-3xl mb-2">{grade.icon}</div>
                      <h3 className="text-sm md:text-base font-bold text-foreground">{grade.name}</h3>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{grade.desc}</p>
                      
                      {selectedGrade === grade.id && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-primary-foreground text-xs font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Foundation info card */}
                <div className="mt-5 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Class 6-10: Pre-Foundation Course</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                        Build a strong base in Physics, Chemistry, Maths & Biology for future competitive exams
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Exam Selection (competitive) or Confirmation (foundation) */}
            {currentStep === 2 && selectedGrade && (
              <div className="max-w-2xl mx-auto">
                {isFoundationGrade(selectedGrade) ? (
                  /* Foundation: Show confirmation card */
                  <div className="text-center">
                    <h2 className="text-lg md:text-xl font-bold mb-1 text-foreground">
                      Pre-Foundation Course 🧪
                    </h2>
                    <p className="text-muted-foreground text-xs md:text-sm mb-5">
                      Class {selectedGrade} — Build strong concepts for future competitive exams
                    </p>
                    
                    <div className="max-w-sm mx-auto p-5 md:p-6 rounded-2xl border-2 border-primary bg-primary/5 shadow-lg">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1">Pre-Foundation</h3>
                      <p className="text-sm text-muted-foreground mb-4">Complete PCMB syllabus for Class {selectedGrade}</p>
                      
                      <div className="flex flex-wrap justify-center gap-2 mb-4">
                        {['Physics', 'Chemistry', 'Mathematics', 'Biology'].map((subject) => (
                          <span key={subject} className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                            {subject}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-background/80 border border-border">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">4</div>
                          <div className="text-[10px] text-muted-foreground">Subjects</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">PCMB</div>
                          <div className="text-[10px] text-muted-foreground">Coverage</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Competitive: Show exam options */
                  <>
                    <h2 className="text-lg md:text-xl font-bold text-center mb-1 text-foreground">
                      What's your target exam? 🎯
                    </h2>
                    <p className="text-center text-muted-foreground text-xs md:text-sm mb-5">
                      Class {selectedGrade} — Choose your competitive exam
                    </p>
                    
                    <div className="space-y-3">
                      {examOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSelectedExam(option.id)}
                          className={`w-full group relative overflow-hidden p-4 md:p-5 rounded-2xl text-left transition-all duration-300 border-2 ${
                            selectedExam === option.id
                              ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                              : 'border-border bg-card hover:border-primary/40 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center text-white flex-shrink-0 transition-transform group-hover:scale-105`}>
                              {option.icon}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base md:text-lg font-bold text-foreground">{option.name}</h3>
                              <p className="text-xs md:text-sm text-muted-foreground">{option.desc}</p>
                              <p className="text-[10px] md:text-xs text-primary font-medium mt-1">{option.tagline}</p>
                            </div>
                            
                            {selectedExam === option.id ? (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <span className="text-primary-foreground text-xs font-bold">✓</span>
                              </div>
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          
                          {/* Exam date info */}
                          {examDate && selectedExam === option.id && (
                            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span>Exam Date</span>
                              </div>
                              <span className="font-semibold text-foreground">
                                {new Date(examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <div className="flex items-center gap-1.5 text-destructive">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-bold">{daysRemaining} days left</span>
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="flex-shrink-0 px-4 py-3 md:py-4 border-t border-border bg-background/80 backdrop-blur-sm safe-area-bottom">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              {currentStep === 2 && (
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    if (isFoundationGrade(selectedGrade || 0)) {
                      setSelectedExam(null);
                    }
                  }}
                  className="px-4 py-2.5 md:py-3 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-all text-sm font-medium flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              
              {currentStep === 2 && (
                <button
                  onClick={handleStartJourney}
                  disabled={!selectedExam || !selectedGrade}
                  className={`flex-1 py-2.5 md:py-3 rounded-xl font-bold text-sm md:text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                    selectedExam && selectedGrade
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <Rocket className="w-4 h-4 md:w-5 md:h-5" />
                  Start My Journey!
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Dialog */}
      {showWelcomeDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-card rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300 border border-border">
            <div className="mb-5 relative">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center animate-bounce shadow-lg shadow-primary/30">
                <Trophy className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2 text-foreground">
              Welcome Aboard! 🎉
            </h2>
            <p className="text-muted-foreground text-sm mb-5">
              Your personalized learning journey starts now!
            </p>

            {/* Goal Lock Notice */}
            <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
              <div className="flex items-start space-x-2.5">
                <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Goal is Now Locked</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    You can change it later from Settings, but it will reset your progress.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick features */}
            <div className="space-y-2.5 mb-6 text-left">
              {[
                { icon: <Target className="w-4 h-4 text-green-500" />, title: 'Personalized Study Plans', desc: 'Built for your grade & goals' },
                { icon: <Brain className="w-4 h-4 text-blue-500" />, title: 'Adaptive Learning', desc: 'Questions match your level' },
                { icon: <Sparkles className="w-4 h-4 text-purple-500" />, title: 'AI-Powered Insights', desc: 'Get smarter every day' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0 border border-border">
                    {feature.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{feature.title}</p>
                    <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={confirmStartJourney}
              disabled={isStartingJourney}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 bg-primary text-primary-foreground shadow-lg ${
                isStartingJourney 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'hover:shadow-xl active:scale-[0.98]'
              }`}
            >
              {isStartingJourney ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Let's Begin!</span>
                </>
              )}
            </button>

            {!isStartingJourney && (
              <button
                onClick={() => setShowWelcomeDialog(false)}
                className="w-full mt-2 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Review my choices
              </button>
            )}
          </div>
        </div>
      )}

      {/* Goal Change Warning Dialog removed — goal changes no longer allowed */}
    </>
  );
};

export default GoalSelectionPage;
