import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, ChevronRight, Loader2, Layers, FileText,
  Search, ArrowLeft, Hash, CheckCircle, Eye, ChevronLeft,
  ArrowLeftRight, GripVertical,
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { getSubjectsForGrade, getExamTypeForGrade, getQuestionExamField } from '@/constants/unified';
import { FilterPills } from '@/components/ui/FilterPills';
import { fetchAllPaginated } from '@/utils/supabasePagination';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Batch {
  id: string;
  name: string;
  exam_type: string;
  grade: number;
}

interface Chapter {
  id: string;
  chapter_name: string;
  chapter_number: number;
  subject: string;
  description: string | null;
  is_free: boolean | null;
  batch_id: string | null;
  sourceChapterIds?: string[];
}

interface Topic {
  id: string;
  chapter_id: string | null;
  topic_number: number | null;
  topic_name: string;
  description?: string | null;
  sourceTopicIds?: string[];
}

interface Question {
  id: string;
  topic_id: string | null;
  chapter_id: string | null;
  batch_id: string | null;
  subject: string;
  chapter: string | null;
  topic: string | null;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  difficulty: string | null;
  exam: string | null;
  is_active: boolean;
  is_verified: boolean;
}

// ─── Sortable Chapter Item ──────────────────────────────────────────────────

interface SortableChapterItemProps {
  chapter: Chapter;
  questionCount: number;
  selectedGrade: number;
  onNavigate: (ch: Chapter) => void;
  onEdit: (ch: Chapter) => void;
  onDelete: (ch: Chapter) => void;
  onMoveGrade: (ch: Chapter, targetGrade: number) => void;
}

const SortableChapterItem = ({ chapter: ch, questionCount, selectedGrade, onNavigate, onEdit, onDelete, onMoveGrade }: SortableChapterItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ch.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onNavigate(ch)}
      className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-colors group"
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted touch-none"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <Badge variant="secondary" className="shrink-0">Ch {ch.chapter_number}</Badge>
        <div className="min-w-0">
          <p className="font-medium truncate">{ch.chapter_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{questionCount} questions</span>
            {ch.is_free && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Free</Badge>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {selectedGrade >= 11 && (
          <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 text-xs gap-1"
            onClick={e => { e.stopPropagation(); onMoveGrade(ch, selectedGrade === 11 ? 12 : 11); }}>
            <ArrowLeftRight className="w-3 h-3" />
            → {selectedGrade === 11 ? '12th' : '11th'}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100"
          onClick={e => { e.stopPropagation(); onEdit(ch); }}>
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive"
          onClick={e => { e.stopPropagation(); onDelete(ch); }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
};

// ─── Constants ──────────────────────────────────────────────────────────────

const GRADES = [6, 7, 8, 9, 10, 11, 12];

// Exam type options for grades 11-12
const SENIOR_EXAM_TYPES = ['JEE', 'NEET'] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export const UnifiedContentManager = () => {
  // Navigation state
  const [selectedGrade, setSelectedGrade] = useState<number>(11);
  const [selectedExamType, setSelectedExamType] = useState<string>('JEE');
  const [selectedSubject, setSelectedSubject] = useState<string>('Physics');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [viewMode, setViewMode] = useState<'chapters' | 'topics' | 'questions'>('chapters');

  // Data
  const [batches, setBatches] = useState<Batch[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [chapterQuestionCounts, setChapterQuestionCounts] = useState<Record<string, number>>({});
  const [topicQuestionCounts, setTopicQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [questionPage, setQuestionPage] = useState(1);
  const [questionTotal, setQuestionTotal] = useState(0);
  const QUESTIONS_PER_PAGE = 50;

  // Dialogs
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionDetailOpen, setQuestionDetailOpen] = useState(false);
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);

  // Edit state
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Forms
  const [chapterForm, setChapterForm] = useState({ chapter_name: '', chapter_number: 1, description: '', is_free: true });
  const [topicForm, setTopicForm] = useState({ topic_name: '', topic_number: 1, description: '' });
  const [questionForm, setQuestionForm] = useState({
    question: '', option_a: '', option_b: '', option_c: '', option_d: '',
    correct_option: 'A' as string, explanation: '', difficulty: 'Medium'
  });

  // ─── Batch Helper ─────────────────────────────────────────────────────────

  const getOrCreateBatch = useCallback(async (grade: number): Promise<Batch | null> => {
    const examType = getExamTypeForGrade(grade, grade >= 11 ? selectedExamType : null);
    let batch = batches.find(b => b.grade === grade && b.exam_type === examType);
    if (batch) return batch;

    try {
      const batchName = grade >= 11 
        ? `Grade ${grade} - ${examType}` 
        : `Foundation Grade ${grade}`;

      const { data: newBatch, error } = await supabase
        .from('batches')
        .insert({
          name: batchName, exam_type: examType, grade,
          description: `${batchName} Study Material`,
          is_active: true, is_free: true, display_order: grade,
        })
        .select('id, name, exam_type, grade')
        .single();

      if (error) throw error;

      const subjects = getSubjectsForGrade(grade, grade >= 11 ? examType : null);
      await supabase.from('batch_subjects').insert(
        subjects.map((subject, i) => ({ batch_id: newBatch.id, subject, display_order: i + 1 }))
      );

      setBatches(prev => [...prev, newBatch]);
      toast.success(`Batch "${batchName}" auto-created`);
      return newBatch;
    } catch (error) {
      logger.error('Error creating batch:', error);
      toast.error('Failed to create batch');
      return null;
    }
  }, [batches, selectedExamType]);

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('batches')
      .select('id, name, exam_type, grade')
      .eq('is_active', true)
      .order('grade');
    if (!error) setBatches(data || []);
  }, []);

  const getChapterSubjectGroup = useCallback(() => {
    if (selectedGrade >= 11 && ['Physics', 'Chemistry'].includes(selectedSubject)) {
      return [selectedSubject];
    }
    return [selectedSubject];
  }, [selectedGrade, selectedSubject]);

  const dedupeChapters = useCallback((chapterRows: Chapter[]) => {
    const seen = new Map<string, Chapter>();
    chapterRows.forEach((row) => {
      const key = `${row.chapter_number}:${row.chapter_name.trim().toLowerCase()}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, { ...row, sourceChapterIds: [row.id] });
      } else {
        existing.sourceChapterIds = [...new Set([...(existing.sourceChapterIds || [existing.id]), row.id])];
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.chapter_number - b.chapter_number);
  }, []);

  const getRelevantBatchIds = useCallback(() => {
    if (selectedGrade < 11) {
      const batch = batches.find(b => b.grade === selectedGrade && b.exam_type === getExamTypeForGrade(selectedGrade, null));
      return batch ? [batch.id] : [];
    }

    if (['Physics', 'Chemistry'].includes(selectedSubject)) {
      const gradeBatches = batches.filter(b => b.grade === selectedGrade && ['JEE', 'NEET'].includes(b.exam_type));
      return gradeBatches.map((b) => b.id);
    }

    const batch = batches.find(b => b.grade === selectedGrade && b.exam_type === getExamTypeForGrade(selectedGrade, selectedExamType));
    return batch ? [batch.id] : [];
  }, [batches, selectedGrade, selectedSubject, selectedExamType]);

  const fetchChapters = useCallback(async () => {
    setLoading(true);
    try {
      const batchIds = getRelevantBatchIds();
      const chapterSubjects = getChapterSubjectGroup();
      const query = supabase.from('chapters').select('*').in('subject', chapterSubjects as string[]).order('chapter_number');
      if (batchIds.length > 0) {
        query.in('batch_id', batchIds);
      } else {
        query.is('batch_id', null);
      }
      const { data } = await query;
      setChapters(dedupeChapters(data || []));
    } catch (e) {
      logger.error('Error fetching chapters:', e);
    } finally {
      setLoading(false);
    }
  }, [getChapterSubjectGroup, getRelevantBatchIds, dedupeChapters]);

  const fetchChapterQuestionCounts = useCallback(async () => {
    const sourceIds = chapters.flatMap((c) => c.sourceChapterIds || [c.id]);
    if (sourceIds.length === 0) { setChapterQuestionCounts({}); return; }

    const chapterMapping = new Map<string, string>();
    chapters.forEach((c) => {
      const ids = c.sourceChapterIds || [c.id];
      ids.forEach((id) => chapterMapping.set(id, c.id));
    });

    try {
      const data = await fetchAllPaginated(() =>
        supabase
          .from('questions')
          .select('chapter_id')
          .in('chapter_id', sourceIds)
      );
      
      const counts: Record<string, number> = {};
      chapters.forEach((c) => { counts[c.id] = 0; });
      data?.forEach(q => {
        if (q.chapter_id) {
          const canonicalId = chapterMapping.get(q.chapter_id) || q.chapter_id;
          counts[canonicalId] = (counts[canonicalId] || 0) + 1;
        }
      });
      setChapterQuestionCounts(counts);
    } catch (e) {
      logger.error('Error fetching chapter question counts:', e);
    }
  }, [chapters]);

  const dedupeTopics = useCallback((topicRows: Topic[]) => {
    const seen = new Map<string, Topic>();
    topicRows.forEach((row) => {
      const key = `${row.topic_number}:${row.topic_name.trim().toLowerCase()}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, { ...row, sourceTopicIds: [row.id] });
      } else {
        existing.sourceTopicIds = [...new Set([...(existing.sourceTopicIds || [existing.id]), row.id])];
      }
    });
    return Array.from(seen.values()).sort((a, b) => (a.topic_number ?? 0) - (b.topic_number ?? 0));
  }, []);

  const fetchTopics = useCallback(async () => {
    if (!selectedChapter) { setTopics([]); return; }
    setLoading(true);
    try {
      const chapterIds = selectedChapter.sourceChapterIds || [selectedChapter.id];
      const { data } = await supabase
        .from('topics')
        .select('*')
        .in('chapter_id', chapterIds)
        .order('topic_number');
      setTopics(dedupeTopics(data || []));
    } catch (e) {
      logger.error('Error fetching topics:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedChapter, dedupeTopics]);

  const fetchTopicQuestionCounts = useCallback(async () => {
    if (!selectedChapter) return;
    const topicIds = topics.flatMap((t) => t.sourceTopicIds || [t.id]);
    if (topicIds.length === 0) { setTopicQuestionCounts({}); return; }

    const topicMapping = new Map<string, string>();
    topics.forEach((t) => {
      const ids = t.sourceTopicIds || [t.id];
      ids.forEach((id) => topicMapping.set(id, t.id));
    });

    try {
      const chapterIds = selectedChapter.sourceChapterIds || [selectedChapter.id];
      const data = await fetchAllPaginated(() =>
        supabase
          .from('questions')
          .select('topic_id')
          .in('chapter_id', chapterIds)
      );
      
      const counts: Record<string, number> = {};
      topics.forEach((t) => { counts[t.id] = 0; });
      counts['__chapter_only__'] = 0;
      
      data?.forEach(q => {
        if (q.topic_id && topicMapping.has(q.topic_id)) {
          const canonicalId = topicMapping.get(q.topic_id)!;
          counts[canonicalId] = (counts[canonicalId] || 0) + 1;
        } else if (!q.topic_id) {
          counts['__chapter_only__']++;
        }
      });
      setTopicQuestionCounts(counts);
    } catch (e) {
      logger.error('Error fetching topic question counts:', e);
    }
  }, [topics, selectedChapter]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('questions').select('*', { count: 'exact' });

      if (selectedTopic) {
        const topicIds = selectedTopic.sourceTopicIds || [selectedTopic.id];
        query = query.in('topic_id', topicIds);
      } else if (selectedChapter) {
        const chapterIds = selectedChapter.sourceChapterIds || [selectedChapter.id];
        query = query.in('chapter_id', chapterIds);
      }

      if (searchQuery.trim()) {
        query = query.ilike('question', `%${searchQuery.trim()}%`);
      }

      const from = (questionPage - 1) * QUESTIONS_PER_PAGE;
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, from + QUESTIONS_PER_PAGE - 1);
      
      if (error) throw error;
      setQuestions(data || []);
      setQuestionTotal(count || 0);
    } catch (e) {
      logger.error('Error fetching questions:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedTopic, selectedChapter, searchQuery, questionPage]);

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => { fetchBatches(); }, [fetchBatches]);
  useEffect(() => { if (batches.length > 0) fetchChapters(); }, [fetchChapters, batches]);
  useEffect(() => { if (chapters.length > 0) fetchChapterQuestionCounts(); }, [fetchChapterQuestionCounts, chapters]);
  useEffect(() => { fetchTopics(); }, [fetchTopics]);
  useEffect(() => { if (topics.length > 0) fetchTopicQuestionCounts(); }, [fetchTopicQuestionCounts, topics]);
  useEffect(() => { if (viewMode === 'questions') fetchQuestions(); }, [fetchQuestions, viewMode]);

  useEffect(() => {
    setSelectedChapter(null);
    setSelectedTopic(null);
    setViewMode('chapters');
    setQuestions([]);
    setQuestionPage(1);
    setQuestionTotal(0);
    // When grade changes, reset subject to first available
    const subjects = getSubjectsForGrade(selectedGrade, selectedGrade >= 11 ? selectedExamType : null);
    if (!subjects.includes(selectedSubject)) {
      setSelectedSubject(subjects[0]);
    }
  }, [selectedGrade, selectedSubject, selectedExamType]);

  // ─── CRUD: Chapters ──────────────────────────────────────────────────────

  const openAddChapter = () => {
    setEditingChapter(null);
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) + 1 : 1;
    setChapterForm({ chapter_name: '', chapter_number: nextNum, description: '', is_free: true });
    setChapterDialogOpen(true);
  };

  const openEditChapter = (ch: Chapter) => {
    setEditingChapter(ch);
    setChapterForm({
      chapter_name: ch.chapter_name,
      chapter_number: ch.chapter_number,
      description: ch.description || '',
      is_free: ch.is_free ?? true
    });
    setChapterDialogOpen(true);
  };

  const handleSaveChapter = async () => {
    if (!chapterForm.chapter_name.trim()) { toast.error('Chapter name is required'); return; }
    const batch = await getOrCreateBatch(selectedGrade);
    if (!batch) return;

    try {
      if (editingChapter) {
        const { error } = await supabase.from('chapters').update({
          chapter_name: chapterForm.chapter_name,
          chapter_number: chapterForm.chapter_number,
          description: chapterForm.description || null,
          is_free: chapterForm.is_free
        }).eq('id', editingChapter.id);
        if (error) throw error;
        toast.success('Chapter updated');
      } else {
        const { error } = await supabase.from('chapters').insert({
          chapter_name: chapterForm.chapter_name,
          chapter_number: chapterForm.chapter_number,
          subject: selectedSubject,
          description: chapterForm.description || null,
          is_free: chapterForm.is_free,
          batch_id: batch.id
        });
        if (error) throw error;
        toast.success('Chapter added');
      }
      setChapterDialogOpen(false);
      fetchChapters();
    } catch (e: any) {
      logger.error('Error saving chapter:', e);
      toast.error(`Failed: ${e.message}`);
    }
  };

  const handleDeleteChapter = async (ch: Chapter) => {
    const count = chapterQuestionCounts[ch.id] || 0;
    if (!confirm(`Delete "${ch.chapter_name}"? This will delete all its topics and ${count} question(s).`)) return;
    try {
      const { error } = await supabase.from('chapters').delete().eq('id', ch.id);
      if (error) throw error;
      toast.success('Chapter deleted');
      if (selectedChapter?.id === ch.id) { setSelectedChapter(null); setViewMode('chapters'); }
      fetchChapters();
    } catch (e: any) {
      logger.error('Error deleting chapter:', e);
      toast.error(`Failed: ${e.message}`);
    }
  };

  // ─── Move Chapter to Another Grade ────────────────────────────────────────

  const moveChapterToGrade = async (ch: Chapter, targetGrade: number) => {
    const examType = getExamTypeForGrade(targetGrade, targetGrade >= 11 ? selectedExamType : null);
    // Find or create target batch
    let targetBatch = batches.find(b => b.grade === targetGrade && b.exam_type === examType);
    if (!targetBatch) {
      const created = await getOrCreateBatch(targetGrade);
      if (!created) return;
      targetBatch = created;
    }

    try {
      // Move chapter to new batch
      const { error } = await supabase.from('chapters').update({ batch_id: targetBatch.id }).eq('id', ch.id);
      if (error) throw error;
      // Move all questions in this chapter to the new batch
      await supabase.from('questions').update({ batch_id: targetBatch.id }).eq('chapter_id', ch.id);
      toast.success(`"${ch.chapter_name}" moved to Grade ${targetGrade}`);
      fetchChapters();
    } catch (e: any) {
      logger.error('Error moving chapter:', e);
      toast.error(`Failed: ${e.message}`);
    }
  };

  // ─── Drag & Drop Reorder ───────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapters.findIndex(c => c.id === active.id);
    const newIndex = chapters.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic reorder — update chapter_number in local state too
    const reordered = arrayMove(chapters, oldIndex, newIndex)
      .map((ch, i) => ({ ...ch, chapter_number: i + 1 }));
    setChapters(reordered);

    // Persist new chapter_number for all affected items
    try {
      const updates = reordered.map((ch, i) => 
        supabase.from('chapters').update({ chapter_number: i + 1, display_order: i + 1 }).eq('id', ch.id)
      );
      await Promise.all(updates);
      toast.success('Chapter order updated');
    } catch (e: any) {
      logger.error('Error reordering:', e);
      toast.error(`Failed: ${e.message}`);
      fetchChapters(); // Rollback
    }
  };

  // ─── CRUD: Topics ─────────────────────────────────────────────────────────

  const openAddTopic = () => {
    setEditingTopic(null);
    const nextNum = topics.length > 0 ? Math.max(...topics.map(t => t.topic_number || 0)) + 1 : 1;
    setTopicForm({ topic_name: '', topic_number: nextNum, description: '' });
    setTopicDialogOpen(true);
  };

  const openEditTopic = (t: Topic) => {
    setEditingTopic(t);
    setTopicForm({
      topic_name: t.topic_name,
      topic_number: t.topic_number || 1,
      description: t.description || ''
    });
    setTopicDialogOpen(true);
  };

  const handleSaveTopic = async () => {
    if (!topicForm.topic_name.trim()) { toast.error('Topic name is required'); return; }
    if (!selectedChapter) { toast.error('Select a chapter first'); return; }

    try {
      if (editingTopic) {
        const { error } = await supabase.from('topics').update({
          topic_name: topicForm.topic_name,
          topic_number: topicForm.topic_number,
          description: topicForm.description || null
        }).eq('id', editingTopic.id);
        if (error) throw error;
        toast.success('Topic updated');
      } else {
        const { error } = await supabase.from('topics').insert({
          chapter_id: selectedChapter.id,
          topic_name: topicForm.topic_name,
          topic_number: topicForm.topic_number,
          description: topicForm.description || null
        });
        if (error) throw error;
        toast.success('Topic added');
      }
      setTopicDialogOpen(false);
      fetchTopics();
    } catch (e: any) {
      logger.error('Error saving topic:', e);
      toast.error(`Failed: ${e.message}`);
    }
  };

  const handleDeleteTopic = async (t: Topic) => {
    const count = topicQuestionCounts[t.id] || 0;
    if (!confirm(`Delete "${t.topic_name}"? This will delete ${count} question(s).`)) return;
    try {
      const { error } = await supabase.from('topics').delete().eq('id', t.id);
      if (error) throw error;
      toast.success('Topic deleted');
      if (selectedTopic?.id === t.id) setSelectedTopic(null);
      fetchTopics();
    } catch (e: any) {
      logger.error('Error deleting topic:', e);
      toast.error(`Failed: ${e.message}`);
    }
  };

  // ─── CRUD: Questions ──────────────────────────────────────────────────────

  const openAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      question: '', option_a: '', option_b: '', option_c: '', option_d: '',
      correct_option: 'A', explanation: '', difficulty: 'Medium'
    });
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQuestionForm({
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'Medium'
    });
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question.trim()) { toast.error('Question text is required'); return; }
    if (!questionForm.option_a || !questionForm.option_b) { toast.error('At least options A and B are required'); return; }
    if (!selectedChapter) { toast.error('Select a chapter first'); return; }

    const batch = batches.find(b => b.grade === selectedGrade && b.exam_type === getExamTypeForGrade(selectedGrade, selectedGrade >= 11 ? selectedExamType : null));
    const questionExam = getQuestionExamField(selectedGrade, selectedGrade >= 11 ? selectedExamType : null);

    try {
      const payload: Record<string, any> = {
        question: questionForm.question.trim(),
        option_a: questionForm.option_a.trim(),
        option_b: questionForm.option_b.trim(),
        option_c: questionForm.option_c.trim(),
        option_d: questionForm.option_d.trim(),
        correct_option: questionForm.correct_option,
        explanation: questionForm.explanation.trim() || null,
        difficulty: questionForm.difficulty,
        subject: selectedSubject,
        chapter: selectedChapter.chapter_name,
        chapter_id: selectedChapter.id,
        topic: selectedTopic?.topic_name || null,
        topic_id: selectedTopic?.id || null,
        exam: questionExam,
        batch_id: batch?.id || null,
        is_active: true,
        question_type: 'single_correct',
      };

      if (editingQuestion) {
        const { error } = await supabase.from('questions')
          .update(payload as any)
          .eq('id', editingQuestion.id);
        if (error) throw error;
        toast.success('Question updated');
      } else {
        const { error } = await supabase.from('questions').insert(payload as any);
        if (error) throw error;
        toast.success('Question added');
      }
      setQuestionDialogOpen(false);
      fetchQuestions();
      fetchChapterQuestionCounts();
      if (selectedChapter) fetchTopicQuestionCounts();
    } catch (e: any) {
      logger.error('Error saving question:', e);
      toast.error(`Failed: ${e.message}`);
    }
  };

  const handleDeleteQuestion = async (q: Question) => {
    if (!confirm('Delete this question?')) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', q.id);
      if (error) throw error;
      toast.success('Question deleted');
      fetchQuestions();
      fetchChapterQuestionCounts();
      if (selectedChapter) fetchTopicQuestionCounts();
    } catch (e: any) {
      logger.error('Error deleting question:', e);
      toast.error(`Failed: ${e.message}`);
    }
  };

  // ─── Navigation ───────────────────────────────────────────────────────────

  const navigateToChapter = (ch: Chapter) => {
    setSelectedChapter(ch);
    setSelectedTopic(null);
    setViewMode('topics');
  };

  const navigateToTopic = (t: Topic) => {
    setSelectedTopic(t);
    setViewMode('questions');
  };

  const viewChapterQuestions = () => {
    setSelectedTopic(null);
    setViewMode('questions');
  };

  const goBack = () => {
    if (viewMode === 'questions' && selectedTopic) {
      setSelectedTopic(null);
      setViewMode('topics');
    } else if (viewMode === 'questions' || viewMode === 'topics') {
      setSelectedChapter(null);
      setSelectedTopic(null);
      setViewMode('chapters');
    }
  };

  // ─── Breadcrumb ───────────────────────────────────────────────────────────

  const Breadcrumb = () => (
    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
      <button onClick={() => { setSelectedChapter(null); setSelectedTopic(null); setViewMode('chapters'); }}
        className="hover:text-foreground font-medium">
        Grade {selectedGrade}
      </button>
      <ChevronRight className="w-3 h-3" />
      <span className="font-medium text-foreground">{selectedSubject}</span>
      {selectedChapter && (
        <>
          <ChevronRight className="w-3 h-3" />
          <button onClick={() => { setSelectedTopic(null); setViewMode('topics'); }}
            className="hover:text-foreground font-medium">
            {selectedChapter.chapter_name}
          </button>
        </>
      )}
      {selectedTopic && (
        <>
          <ChevronRight className="w-3 h-3" />
          <span className="font-medium text-foreground">{selectedTopic.topic_name}</span>
        </>
      )}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Section title is shown in Admin shell header; keep supporting context only. */}
      <div>
        <p className="text-muted-foreground text-sm mt-1">
          Grade → Subject → Chapter → Topic → Questions — fully connected to database
        </p>
      </div>

      {/* Grade + Exam Type + Subject Selectors — FilterPills */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-[auto_auto_1fr] items-end">
        <div className="min-w-0">
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grade</Label>
          <FilterPills
            className="min-w-0"
            options={GRADES.map(g => `Grade ${g}`)}
            selected={`Grade ${selectedGrade}`}
            onSelect={v => setSelectedGrade(Number(v.replace('Grade ', '')))}
            size="sm"
          />
        </div>
        {selectedGrade >= 11 && (
          <div className="min-w-0">
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Exam</Label>
            <FilterPills
              className="min-w-0"
              options={[...SENIOR_EXAM_TYPES]}
              selected={selectedExamType}
              onSelect={setSelectedExamType}
              size="sm"
            />
          </div>
        )}
        <div className="min-w-0">
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</Label>
          <FilterPills
            className="min-w-0"
            options={getSubjectsForGrade(selectedGrade, selectedGrade >= 11 ? selectedExamType : null)}
            selected={selectedSubject}
            onSelect={setSelectedSubject}
            size="sm"
          />
        </div>
      </div>

      {/* Breadcrumb + Back */}
      <div className="flex items-center gap-3">
        {viewMode !== 'chapters' && (
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}
        <Breadcrumb />
      </div>

      {/* ─── CHAPTERS VIEW ─────────────────────────────────────────────── */}
      {viewMode === 'chapters' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Chapters ({chapters.length})
              </CardTitle>
              <CardDescription>
                {selectedSubject} chapters for Grade {selectedGrade}
              </CardDescription>
            </div>
            <Button size="sm" onClick={openAddChapter}>
              <Plus className="w-4 h-4 mr-1" /> Add Chapter
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : chapters.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No chapters yet. Add your first chapter!</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid gap-2">
                    {chapters.map((ch) => (
                      <SortableChapterItem
                        key={ch.id}
                        chapter={ch}
                        questionCount={chapterQuestionCounts[ch.id] || 0}
                        selectedGrade={selectedGrade}
                        onNavigate={navigateToChapter}
                        onEdit={openEditChapter}
                        onDelete={handleDeleteChapter}
                        onMoveGrade={moveChapterToGrade}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TOPICS VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'topics' && selectedChapter && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Topics in &quot;{selectedChapter.chapter_name}&quot; ({topics.length})
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={viewChapterQuestions}>
                <FileText className="w-4 h-4 mr-1" />
                All Questions ({chapterQuestionCounts[selectedChapter.id] || 0})
              </Button>
              <Button size="sm" onClick={openAddTopic}>
                <Plus className="w-4 h-4 mr-1" /> Add Topic
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : topics.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No topics yet. Add topics or directly add questions to this chapter.</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button size="sm" onClick={openAddTopic}>
                    <Plus className="w-4 h-4 mr-1" /> Add Topic
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedTopic(null); setViewMode('questions'); }}>
                    <FileText className="w-4 h-4 mr-1" /> Add Questions Directly
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                {topics.map(t => (
                  <div key={t.id}
                    onClick={() => navigateToTopic(t)}
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="outline" className="shrink-0">T{t.topic_number || '?'}</Badge>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{t.topic_name}</p>
                        <span className="text-xs text-muted-foreground">
                          {topicQuestionCounts[t.id] || 0} questions
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100"
                        onClick={e => { e.stopPropagation(); openEditTopic(t); }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={e => { e.stopPropagation(); handleDeleteTopic(t); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── QUESTIONS VIEW ───────────────────────────────────────────── */}
      {viewMode === 'questions' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Questions ({questionTotal})
                {selectedTopic && <Badge variant="outline" className="ml-1">{selectedTopic.topic_name}</Badge>}
                {!selectedTopic && selectedChapter && <Badge variant="outline" className="ml-1">All in {selectedChapter.chapter_name}</Badge>}
              </CardTitle>
              <Button size="sm" onClick={openAddQuestion}>
                <Plus className="w-4 h-4 mr-1" /> Add Question
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{searchQuery ? 'No questions match your search' : 'No questions yet. Add your first question!'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-3 rounded-lg border hover:border-primary/30 transition-all group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">
                          <span className="text-muted-foreground mr-1">{(questionPage - 1) * QUESTIONS_PER_PAGE + idx + 1}.</span>
                          {q.question.length > 150 ? q.question.substring(0, 150) + '...' : q.question}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {(['A', 'B', 'C', 'D'] as const).map(opt => (
                            <Badge key={opt} variant="outline" className="text-[10px] px-1.5">
                              {q.correct_option === opt ? '✓ ' : ''}{opt}: {((q as any)[`option_${opt.toLowerCase()}`] || '').substring(0, 20)}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          <Badge className={`text-[10px] px-1.5 py-0 ${
                            q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                            q.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{q.difficulty || 'Medium'}</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Ans: {q.correct_option}</Badge>
                          {q.topic && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{q.topic}</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <Button size="sm" variant="ghost"
                          onClick={() => { setViewingQuestion(q); setQuestionDetailOpen(true); }}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditQuestion(q)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive"
                          onClick={() => handleDeleteQuestion(q)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {questionTotal > QUESTIONS_PER_PAGE && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <span className="text-sm text-muted-foreground">
                  Showing {(questionPage - 1) * QUESTIONS_PER_PAGE + 1}–{Math.min(questionPage * QUESTIONS_PER_PAGE, questionTotal)} of {questionTotal}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={questionPage <= 1}
                    onClick={() => setQuestionPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Button>
                  <span className="text-sm font-medium">
                    Page {questionPage} / {Math.ceil(questionTotal / QUESTIONS_PER_PAGE)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={questionPage >= Math.ceil(questionTotal / QUESTIONS_PER_PAGE)}
                    onClick={() => setQuestionPage(p => p + 1)}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── CHAPTER DIALOG ───────────────────────────────────────────── */}
      <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChapter ? 'Edit' : 'Add'} Chapter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Chapter Name *</Label>
              <Input value={chapterForm.chapter_name}
                onChange={e => setChapterForm({ ...chapterForm, chapter_name: e.target.value })}
                placeholder="e.g., Motion and Force" />
            </div>
            <div>
              <Label>Chapter Number</Label>
              <Input type="number" value={chapterForm.chapter_number}
                onChange={e => setChapterForm({ ...chapterForm, chapter_number: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={chapterForm.description}
                onChange={e => setChapterForm({ ...chapterForm, description: e.target.value })}
                placeholder="Optional description" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ch_free" checked={chapterForm.is_free}
                onChange={e => setChapterForm({ ...chapterForm, is_free: e.target.checked })} />
              <Label htmlFor="ch_free">Free Chapter</Label>
            </div>
            <Button onClick={handleSaveChapter} className="w-full">
              {editingChapter ? 'Update' : 'Add'} Chapter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── TOPIC DIALOG ─────────────────────────────────────────────── */}
      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTopic ? 'Edit' : 'Add'} Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Topic Name *</Label>
              <Input value={topicForm.topic_name}
                onChange={e => setTopicForm({ ...topicForm, topic_name: e.target.value })}
                placeholder="e.g., Newton's Laws of Motion" />
            </div>
            <div>
              <Label>Topic Number</Label>
              <Input type="number" value={topicForm.topic_number}
                onChange={e => setTopicForm({ ...topicForm, topic_number: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={topicForm.description}
                onChange={e => setTopicForm({ ...topicForm, description: e.target.value })}
                placeholder="Optional description" rows={2} />
            </div>
            <Button onClick={handleSaveTopic} className="w-full">
              {editingTopic ? 'Update' : 'Add'} Topic
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── QUESTION DIALOG ──────────────────────────────────────────── */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit' : 'Add'} Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge variant="outline">Grade {selectedGrade}</Badge>
              <Badge variant="outline">{selectedSubject}</Badge>
              {selectedChapter && <Badge variant="outline">{selectedChapter.chapter_name}</Badge>}
              {selectedTopic && <Badge variant="outline">{selectedTopic.topic_name}</Badge>}
              <Badge variant="outline">Exam: {getQuestionExamField(selectedGrade, selectedGrade >= 11 ? selectedExamType : null)}</Badge>
            </div>

            <div>
              <Label>Question *</Label>
              <Textarea value={questionForm.question}
                onChange={e => setQuestionForm({ ...questionForm, question: e.target.value })}
                placeholder="Enter the question text (supports LaTeX: $\frac{a}{b}$)"
                rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <div key={opt}>
                  <Label className={questionForm.correct_option === opt ? 'text-green-600 font-bold' : ''}>
                    Option {opt} {questionForm.correct_option === opt && '✓'}
                  </Label>
                  <Input
                    value={questionForm[`option_${opt.toLowerCase()}` as keyof typeof questionForm] as string}
                    onChange={e => setQuestionForm({ ...questionForm, [`option_${opt.toLowerCase()}`]: e.target.value })}
                    placeholder={`Enter option ${opt}`}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Correct Answer</Label>
                <Select value={questionForm.correct_option}
                  onValueChange={v => setQuestionForm({ ...questionForm, correct_option: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C', 'D'].map(o => <SelectItem key={o} value={o}>Option {o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={questionForm.difficulty}
                  onValueChange={v => setQuestionForm({ ...questionForm, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Explanation</Label>
              <Textarea value={questionForm.explanation}
                onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                placeholder="Explain the correct answer (optional)" rows={2} />
            </div>

            <Button onClick={handleSaveQuestion} className="w-full">
              {editingQuestion ? 'Update' : 'Add'} Question
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── QUESTION DETAIL DIALOG ───────────────────────────────────── */}
      <Dialog open={questionDetailOpen} onOpenChange={setQuestionDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Detail</DialogTitle>
          </DialogHeader>
          {viewingQuestion && (
            <div className="space-y-4">
              <div className="p-3 bg-accent/50 rounded-lg">
                <p className="font-medium whitespace-pre-wrap">{viewingQuestion.question}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['A', 'B', 'C', 'D'] as const).map(opt => {
                  const val = (viewingQuestion as any)[`option_${opt.toLowerCase()}`] as string;
                  const isCorrect = viewingQuestion.correct_option === opt;
                  return (
                    <div key={opt} className={`p-2 rounded border ${isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <span className="text-xs text-muted-foreground mr-1">{opt}.</span>
                      <span className={isCorrect ? 'font-medium text-green-700' : ''}>{val}</span>
                      {isCorrect && <CheckCircle className="w-3.5 h-3.5 inline ml-1 text-green-600" />}
                    </div>
                  );
                })}
              </div>
              {viewingQuestion.explanation && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Label className="text-xs text-blue-600">Explanation</Label>
                  <p className="text-sm mt-1">{viewingQuestion.explanation}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{viewingQuestion.subject}</Badge>
                <Badge variant="outline">{viewingQuestion.chapter}</Badge>
                {viewingQuestion.topic && <Badge variant="outline">{viewingQuestion.topic}</Badge>}
                <Badge variant="outline">{viewingQuestion.exam}</Badge>
                <Badge variant="outline">{viewingQuestion.difficulty}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedContentManager;
