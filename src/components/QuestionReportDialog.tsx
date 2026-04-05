import React, { useState } from 'react';
import { AlertTriangle, Flag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuestionReportDialogProps {
  questionId: string;
  questionText?: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'wrong_answer', label: 'Wrong answer marked' },
  { value: 'wrong_options', label: 'Options are incorrect' },
  { value: 'unclear_question', label: 'Question is unclear' },
  { value: 'wrong_explanation', label: 'Explanation is wrong' },
  { value: 'missing_diagram', label: 'Missing diagram/image' },
  { value: 'duplicate', label: 'Duplicate question' },
  { value: 'other', label: 'Other issue' },
];

export const QuestionReportDialog: React.FC<QuestionReportDialogProps> = ({
  questionId,
  questionText,
  onClose,
}) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason || !user?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('question_reports').insert({
        question_id: questionId,
        user_id: user.id,
        reason: selectedReason,
        status: 'pending',
        description: description.trim() || null,
      });
      if (error) throw error;
      toast.success('Report submitted! We\'ll review it soon.');
      onClose();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || 'Failed to submit report')
          : 'Failed to submit report';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-sm border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" />
            <h3 className="font-bold text-sm">Report Question</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {questionText && (
          <div className="px-4 pt-3">
            <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded-lg p-2">
              {questionText.substring(0, 120)}...
            </p>
          </div>
        )}

        <div className="p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">What's wrong?</p>
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason.value}
              onClick={() => setSelectedReason(reason.value)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border-2 transition-all ${
                selectedReason === reason.value
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              {reason.label}
            </button>
          ))}
        </div>

        {selectedReason && (
          <div className="px-4 pb-2">
            <textarea
              placeholder="Add details (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border-2 border-border rounded-xl p-3 bg-background resize-none h-16 focus:outline-none focus:border-primary"
              maxLength={500}
            />
          </div>
        )}

        <div className="p-4 pt-2 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={!selectedReason || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Small trigger button to use inline
export const ReportButton: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ${className || ''}`}
    title="Report this question"
  >
    <AlertTriangle className="w-3.5 h-3.5" />
    <span className="hidden sm:inline">Report</span>
  </button>
);
