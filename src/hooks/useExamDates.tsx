import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ExamConfig {
  exam_name: string;
  exam_date: string;
}

export type ExamType = 'JEE' | 'NEET' | 'Scholarship' | 'Foundation' | string;

export const useExamDates = () => {
  const [jeeDate, setJeeDate] = useState('2026-05-24');
  const [neetDate, setNeetDate] = useState('2026-05-05');
  const [scholarshipDate, setScholarshipDate] = useState('2026-02-15');
  const [foundationDate, setFoundationDate] = useState('2026-03-15');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExamDates();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('exam_dates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_config'
        },
        () => {
          loadExamDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadExamDates = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_config')
        .select('exam_name, exam_date');

      if (error) throw error;

      const jee = data?.find((e: ExamConfig) => e.exam_name === 'JEE');
      const neet = data?.find((e: ExamConfig) => e.exam_name === 'NEET');
      const scholarship = data?.find((e: ExamConfig) => e.exam_name === 'Scholarship');
      const foundation = data?.find((e: ExamConfig) => e.exam_name === 'Foundation');

      if (jee) setJeeDate(jee.exam_date);
      if (neet) setNeetDate(neet.exam_date);
      if (scholarship) setScholarshipDate(scholarship.exam_date);
      if (foundation) setFoundationDate(foundation.exam_date);
    } catch (error) {
      logger.error('Error loading exam dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExamDate = (examType: ExamType): string => {
    if (examType === 'JEE' || examType === 'JEE Main' || examType === 'JEE Advanced') return jeeDate;
    if (examType === 'NEET') return neetDate;
    if (examType === 'Scholarship') return scholarshipDate;
    if (examType?.startsWith('Foundation')) return foundationDate;
    return jeeDate; // Default fallback
  };

  return { jeeDate, neetDate, scholarshipDate, foundationDate, getExamDate, loading };
};