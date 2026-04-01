import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useExamDates } from '@/hooks/useExamDates';

interface ExamCountdownProps {
  targetExam?: string;
}

const ExamCountdown: React.FC<ExamCountdownProps> = ({ targetExam = 'JEE' }) => {
  const { getExamDate } = useExamDates();
  const examDate = getExamDate(targetExam);
  
  // Null guard — if no exam date configured, don't render
  if (!examDate) return null;

  const now = new Date();
  const exam = new Date(examDate);
  
  // Invalid date guard
  if (isNaN(exam.getTime())) return null;

  const diffMs = exam.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  
  if (daysLeft <= 0) return null;

  const urgency = daysLeft <= 30 ? 'urgent' : daysLeft <= 90 ? 'soon' : 'normal';
  const colors = {
    urgent: 'from-red-500 to-orange-500 text-white',
    soon: 'from-amber-400 to-orange-500 text-white',
    normal: 'from-primary to-blue-600 text-white',
  };

  return (
    <div className={`rounded-xl p-3 bg-gradient-to-r ${colors[urgency]} shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-semibold">{targetExam} Exam</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-lg font-bold">{daysLeft}</span>
          <span className="text-xs font-medium">days left</span>
        </div>
      </div>
    </div>
  );
};

export default ExamCountdown;
