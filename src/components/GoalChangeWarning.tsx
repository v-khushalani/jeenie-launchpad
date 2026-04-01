import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2, RotateCcw, Flame, Trophy, Target, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface GoalChangeWarningProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: string;
  newGoal: string;
  newGrade: number;
  newTargetExam: string;
  userId: string;
  onSuccess?: () => void;
}

export const GoalChangeWarning: React.FC<GoalChangeWarningProps> = ({
  isOpen,
  onClose,
  currentGoal,
  newGoal,
  newGrade,
  newTargetExam,
  userId,
  onSuccess
}) => {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');

  const CONFIRM_TEXT = 'CHANGE GOAL';

  // Points and streaks are PRESERVED! Only question/test history is cleared
  const dataToBeDeleted = [
    { icon: <Target className="w-4 h-4" />, label: 'Question attempts & history', color: 'text-blue-600' },
    { icon: <BookOpen className="w-4 h-4" />, label: 'Test attempts & scores', color: 'text-purple-600' },
    { icon: <RotateCcw className="w-4 h-4" />, label: 'Batch subscriptions', color: 'text-green-600' },
  ];
  
  const dataPreserved = [
    { icon: <Flame className="w-4 h-4" />, label: 'Your streaks (current & longest)', color: 'text-orange-500' },
    { icon: <Trophy className="w-4 h-4" />, label: 'JEEnie Points earned', color: 'text-yellow-500' },
  ];

  const handleProceedToConfirm = () => {
    setStep('confirm');
  };

  const handleConfirmReset = async () => {
    if (confirmText !== CONFIRM_TEXT) {
      toast.error(`Please type "${CONFIRM_TEXT}" to confirm`);
      return;
    }

    setIsResetting(true);
    try {
      // Call the database function to change goal with reset
      const { data, error } = await (supabase.rpc as any)('change_user_goal', {
        p_user_id: userId,
        p_new_goal: newGoal.toLowerCase(),
        p_new_grade: newGrade,
        p_new_target_exam: newTargetExam,
        p_confirm_reset: true
      });

      if (error) {
        logger.error('Goal change error:', error);
        toast.error(`Failed to change goal: ${error.message || 'Please try again'}`);
        return;
      }

      if ((data as any)?.success) {
        toast.success('Goal changed successfully! Starting fresh 🎯');
        
        // Clear local storage
        localStorage.removeItem('userGoals');
        
        // Trigger success callback or navigate
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/dashboard', { replace: true });
        }
        
        onClose();
      } else {
        toast.error((data as any)?.reason || 'Failed to change goal');
      }
    } catch (error) {
      logger.error('Error changing goal:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    setStep('warning');
    setConfirmText('');
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        {step === 'warning' ? (
          <>
            <AlertDialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <AlertDialogTitle className="text-center text-xl">
                Change Your Goal?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                <div className="space-y-4 mt-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-amber-800 font-medium text-sm">
                      Changing from <strong className="uppercase">{currentGoal || 'Current'}</strong> to <strong className="uppercase">{newGoal}</strong>
                    </p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                    <p className="text-red-800 font-bold text-sm mb-3 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      The following will be cleared:
                    </p>
                    <ul className="space-y-2">
                      {dataToBeDeleted.map((item, i) => (
                        <li key={i} className={`flex items-center gap-2 text-sm ${item.color}`}>
                          {item.icon}
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                    <p className="text-green-800 font-bold text-sm mb-3 flex items-center gap-2">
                      ✅ Good news! These will be PRESERVED:
                    </p>
                    <ul className="space-y-2">
                      {dataPreserved.map((item, i) => (
                        <li key={i} className={`flex items-center gap-2 text-sm ${item.color}`}>
                          {item.icon}
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-gray-600 text-sm">
                    This helps us provide you with accurate recommendations for your new goal.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row">
              <AlertDialogCancel onClick={handleClose} className="w-full sm:w-auto">
                Keep Current Goal
              </AlertDialogCancel>
              <Button 
                variant="destructive" 
                onClick={handleProceedToConfirm}
                className="w-full sm:w-auto"
              >
                I Understand, Continue
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
              </div>
              <AlertDialogTitle className="text-center text-xl text-blue-600">
                Confirm Goal Change
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                <div className="space-y-4 mt-4">
                  <p className="text-gray-700 font-medium">
                    Your question/test history will be cleared for accurate tracking.
                  </p>
                  <p className="text-green-600 text-sm font-medium">
                    ✅ Your points and streaks will be preserved!
                  </p>
                  
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      Type <strong className="font-mono bg-gray-200 px-2 py-1 rounded">{CONFIRM_TEXT}</strong> to confirm:
                    </p>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                      placeholder="Type here..."
                      className="font-mono text-center uppercase"
                      disabled={isResetting}
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row">
              <Button 
                variant="outline" 
                onClick={() => setStep('warning')}
                disabled={isResetting}
                className="w-full sm:w-auto"
              >
                Go Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmReset}
                disabled={confirmText !== CONFIRM_TEXT || isResetting}
                className="w-full sm:w-auto"
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All & Change Goal
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default GoalChangeWarning;
