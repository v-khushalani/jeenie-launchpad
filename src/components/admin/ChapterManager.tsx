import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GripVertical, Lock, Unlock, BookOpen, GraduationCap, Plus, Edit, Trash2, ArrowRightLeft, MoveRight, Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';

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
}

// ─── Shared chapter row content (used both in sortable and DragOverlay) ──────

interface ChapterRowContentProps {
  chapter: Chapter;
  getBatchName: (batchId: string) => string;
  toggleFreeStatus?: (id: string, current: boolean | null) => void;
  openMoveDialog?: (chapter: Chapter) => void;
  openEditDialog?: (chapter: Chapter) => void;
  handleDeleteChapter?: (id: string) => void;
  openMoveQuestionsDialog?: (chapter: Chapter) => void;
  quickMoveLabel?: string;
  onQuickMove?: (chapter: Chapter) => void;
  isDragging?: boolean;
}

const ChapterRowContent: React.FC<ChapterRowContentProps> = ({
  chapter, getBatchName, toggleFreeStatus, openMoveDialog, openEditDialog, handleDeleteChapter,
  openMoveQuestionsDialog, quickMoveLabel, onQuickMove, isDragging,
}) => (
  <>
    {/* Chapter Number pill */}
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
      {chapter.chapter_number ?? '–'}
    </div>

    {/* Chapter Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-medium truncate">{chapter.chapter_name}</p>
        <Badge variant="outline" className="text-xs shrink-0">
          {chapter.batch_id ? getBatchName(chapter.batch_id) : 'Unknown'}
        </Badge>
      </div>
      {chapter.description && (
        <p className="text-xs text-muted-foreground truncate">{chapter.description}</p>
      )}
    </div>

    {/* Free/Premium Toggle */}
    {!isDragging && toggleFreeStatus && (
      <Badge
        className={`cursor-pointer shrink-0 text-white ${chapter.is_free ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
        onClick={() => toggleFreeStatus(chapter.id, chapter.is_free)}
      >
        {chapter.is_free
          ? <span className="flex items-center gap-1"><Unlock className="w-3 h-3" />Free</span>
          : <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Premium</span>}
      </Badge>
    )}

    {/* Quick Grade Move */}
    {!isDragging && quickMoveLabel && onQuickMove && (
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 text-xs h-7 px-2 gap-1"
        onClick={() => onQuickMove(chapter)}
      >
        <ArrowRightLeft className="w-3 h-3" />
        {quickMoveLabel}
      </Button>
    )}

    {/* Action Buttons */}
    {!isDragging && openMoveDialog && openEditDialog && handleDeleteChapter && (
      <div className="flex items-center gap-1 shrink-0">
        {openMoveQuestionsDialog && (
          <Button variant="ghost" size="icon" title="Move questions to another chapter" onClick={() => openMoveQuestionsDialog(chapter)}>
            <MoveRight className="w-4 h-4 text-blue-600" />
          </Button>
        )}
        <Button variant="ghost" size="icon" title="Move to different batch/subject" onClick={() => openMoveDialog(chapter)}>
          <ArrowRightLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => openEditDialog(chapter)}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteChapter(chapter.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    )}
  </>
);

// ─── Sortable wrapper ────────────────────────────────────────────────────────

interface SortableChapterItemProps extends ChapterRowContentProps {
  chapter: Chapter;
}

const SortableChapterItem: React.FC<SortableChapterItemProps> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.chapter.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
        zIndex: isDragging ? 50 : 'auto',
      }}
      className={`flex items-center gap-3 p-3 border rounded-lg bg-card transition-colors ${isDragging ? 'shadow-lg' : 'hover:bg-accent/40'}`}
    >
      {/* Drag Handle — only this area activates the drag */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-1 rounded hover:bg-muted"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      <ChapterRowContent {...props} isDragging={false} />
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const ChapterManager = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('Physics');

  // Grade-first filter: grades 6-10 = Foundation, 11-12 = JEE or NEET
  const [gradeFilter, setGradeFilter] = useState<number>(11);
  const [examFilter, setExamFilter] = useState<'JEE' | 'NEET'>('JEE');

  // Derived from gradeFilter + examFilter (for compatibility with existing helpers)
  const filterExam = gradeFilter <= 10 ? `Foundation-${gradeFilter}` : examFilter;
  const selectedGrade: number | null = gradeFilter >= 11 ? gradeFilter : null;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isMoveQuestionsDialogOpen, setIsMoveQuestionsDialogOpen] = useState(false);
  const [moveQuestionsSource, setMoveQuestionsSource] = useState<Chapter | null>(null);
  const [moveQuestionsTargetId, setMoveQuestionsTargetId] = useState<string>('');
  const [moveQuestionsCount, setMoveQuestionsCount] = useState<number>(0);
  const [movingQuestions, setMovingQuestions] = useState(false);
  const [allChaptersForMove, setAllChaptersForMove] = useState<{ id: string; chapter_name: string; subject: string; batch_name: string }[]>([]);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [movingChapter, setMovingChapter] = useState<Chapter | null>(null);
  const [moveTarget, setMoveTarget] = useState({ exam: '', grade: 0, subject: '' });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    chapter_name: '',
    chapter_number: 1,
    description: '',
    is_free: true
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Get valid subjects based on exam type
  const getSubjectsForExam = (exam: string): string[] => {
    if (exam === 'JEE') return ['Physics', 'Chemistry', 'Mathematics'];
    if (exam === 'NEET') return ['Physics', 'Chemistry', 'Biology'];
    return ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
  };

  const validSubjects = useMemo(() => getSubjectsForExam(filterExam), [filterExam]);

  // Reset subject if not valid for current exam
  useEffect(() => {
    if (!validSubjects.includes(selectedSubject)) {
      setSelectedSubject(validSubjects[0] || 'Physics');
    }
  }, [filterExam, validSubjects, selectedSubject]);

  useEffect(() => {
    fetchBatches();
  }, []);

  // Note: fetchChapters useEffect moved after its useCallback definition below

  const fetchBatches = async () => {
    const { data } = await supabase
      .from('batches')
      .select('id, name, exam_type, grade')
      .order('grade');
    setBatches(data || []);
    logger.info('Fetched batches', { count: data?.length || 0 });
  };

  // Get batch_id for current filter - ALL chapters must be linked to a batch
  const getCurrentBatchId = useCallback((): string | 'NOT_FOUND' => {
    if (filterExam === 'JEE') {
      const batch = batches.find(b => 
        b.exam_type.toLowerCase() === 'jee' && 
        (!selectedGrade || b.grade === selectedGrade)
      );
      return batch?.id || 'NOT_FOUND';
    }
    
    if (filterExam === 'NEET') {
      const batch = batches.find(b => 
        b.exam_type.toLowerCase() === 'neet' && 
        (!selectedGrade || b.grade === selectedGrade)
      );
      return batch?.id || 'NOT_FOUND';
    }
    
    if (filterExam.startsWith('Foundation-')) {
      const grade = parseInt(filterExam.replace('Foundation-', ''));
      const batch = batches.find(b => b.exam_type.toLowerCase() === 'foundation' && b.grade === grade);
      return batch?.id || 'NOT_FOUND';
    }
    
    return 'NOT_FOUND';
  }, [filterExam, batches, selectedGrade]);

  // Get batch name for display
  const getBatchName = (batchId: string): string => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return 'Unknown';
    if (batch.exam_type.toLowerCase() === 'foundation') return `${batch.grade}th Foundation`;
    return batch.name || batch.exam_type;
  };

  const fetchChapters = useCallback(async () => {
    const batchId = getCurrentBatchId();
    
    if (batchId === 'NOT_FOUND') {
      setChapters([]);
      return;
    }
    
    const { data } = await supabase
      .from('chapters')
      .select('*')
      .eq('subject', selectedSubject)
      .eq('batch_id', batchId)
      .order('chapter_number');

    setChapters(data || []);
  }, [selectedSubject, filterExam, selectedGrade, batches, getCurrentBatchId]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);


  const updateChapterSequence = async (chapterId: string, newNumber: number) => {
    await supabase
      .from('chapters')
      .update({ chapter_number: newNumber })
      .eq('id', chapterId);
    fetchChapters();
  };

  // Drag-and-drop: reorder and renumber chapters
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapters.findIndex(c => c.id === active.id);
    const newIndex = chapters.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(chapters, oldIndex, newIndex);
    // Optimistically update UI immediately
    setChapters(reordered);

    // Renumber 1-based and persist all at once
    const updates = reordered.map((ch, idx) => ({
      id: ch.id,
      chapter_number: idx + 1,
    }));

    const results = await Promise.all(
      updates.map(({ id, chapter_number }) =>
        supabase.from('chapters').update({ chapter_number }).eq('id', id)
      )
    );

    const hasError = results.some(r => r.error);
    if (hasError) {
      toast.error('Failed to save new order');
      fetchChapters(); // revert
    } else {
      setChapters(prev => prev.map((ch, idx) => ({ ...ch, chapter_number: idx + 1 })));
      toast.success('Chapter order saved');
    }
  }, [chapters, fetchChapters]);

  // Quick move to the sibling grade (11↔12) within same exam type
  const getQuickMoveLabel = (): string | undefined => {
    if (gradeFilter === 11) return '→ 12th';
    if (gradeFilter === 12) return '← 11th';
    return undefined;
  };

  const handleQuickMove = useCallback(async (chapter: Chapter) => {
    const targetGrade = gradeFilter === 11 ? 12 : 11;
    const targetBatch = batches.find(b =>
      b.exam_type.toLowerCase() === examFilter.toLowerCase() &&
      b.grade === targetGrade
    );
    if (!targetBatch) {
      toast.error(`No batch found for ${examFilter} Grade ${targetGrade}`);
      return;
    }
    const { error } = await supabase
      .from('chapters')
      .update({ batch_id: targetBatch.id })
      .eq('id', chapter.id);
    if (error) {
      toast.error('Failed to move chapter');
      logger.error('Quick move failed', error);
      return;
    }
    toast.success(`Moved "${chapter.chapter_name}" to ${examFilter} ${targetGrade}th`);
    fetchChapters();
  }, [gradeFilter, examFilter, batches, fetchChapters]);

  const toggleFreeStatus = async (chapterId: string, currentStatus: boolean | null) => {
    await supabase
      .from('chapters')
      .update({ is_free: !currentStatus })
      .eq('id', chapterId);
    fetchChapters();
  };

  const handleAddChapter = async () => {
    if (!formData.chapter_name.trim()) {
      toast.error('Please enter chapter name');
      return;
    }

    const batchId = getCurrentBatchId();
    
    if (batchId === 'NOT_FOUND') {
      toast.error('Please select a valid course first');
      return;
    }

    const { error } = await supabase
      .from('chapters')
      .insert([{
        chapter_name: formData.chapter_name,
        chapter_number: formData.chapter_number,
        description: formData.description || null,
        subject: selectedSubject,
        is_free: formData.is_free,
        batch_id: batchId
      }]);

    if (error) {
      toast.error('Failed to add chapter');
      logger.error('Failed to add chapter', error);
      return;
    }

    toast.success('Chapter added successfully');
    setIsAddDialogOpen(false);
    resetForm();
    fetchChapters();
  };

  const handleEditChapter = async () => {
    if (!editingChapter || !formData.chapter_name.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    const { error } = await supabase
      .from('chapters')
      .update({
        chapter_name: formData.chapter_name,
        chapter_number: formData.chapter_number,
        description: formData.description || null,
        is_free: formData.is_free,
        subject: selectedSubject
      })
      .eq('id', editingChapter.id);

    if (error) {
      toast.error('Failed to update chapter');
      logger.error('Failed to update chapter', error);
      return;
    }

    toast.success('Chapter updated successfully');
    setIsEditDialogOpen(false);
    setEditingChapter(null);
    resetForm();
    fetchChapters();
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;

    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId);

    if (error) {
      toast.error('Failed to delete chapter');
      logger.error('Failed to delete chapter', error);
      return;
    }

    toast.success('Chapter deleted successfully');
    fetchChapters();
  };

  const openMoveDialog = (chapter: Chapter) => {
    setMovingChapter(chapter);
    // Pre-fill with current location
    const currentBatch = batches.find(b => b.id === chapter.batch_id);
    setMoveTarget({
      exam: currentBatch?.exam_type || 'JEE',
      grade: currentBatch?.grade || 12,
      subject: chapter.subject
    });
    setIsMoveDialogOpen(true);
  };

  const handleMoveChapter = async () => {
    if (!movingChapter) return;

    // Find target batch
    const targetBatch = batches.find(b => 
      b.exam_type.toLowerCase() === moveTarget.exam.toLowerCase() && 
      b.grade === moveTarget.grade
    );

    if (!targetBatch) {
      toast.error(`No batch found for ${moveTarget.exam} Grade ${moveTarget.grade}`);
      return;
    }

    const { error } = await supabase
      .from('chapters')
      .update({ 
        batch_id: targetBatch.id,
        subject: moveTarget.subject
      })
      .eq('id', movingChapter.id);

    if (error) {
      toast.error('Failed to move chapter');
      logger.error('Failed to move chapter', error);
      return;
    }

    toast.success(`Moved "${movingChapter.chapter_name}" to ${moveTarget.exam} Grade ${moveTarget.grade} - ${moveTarget.subject}`);
    setIsMoveDialogOpen(false);
    setMovingChapter(null);
    fetchChapters();
  };

  // ─── Move Questions Between Chapters ─────────────────────────────────────
  const openMoveQuestionsDialog = async (chapter: Chapter) => {
    setMoveQuestionsSource(chapter);
    setMoveQuestionsTargetId('');
    setMovingQuestions(false);

    // Get question count for this chapter
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('chapter_id', chapter.id);
    setMoveQuestionsCount(count || 0);

    // Load all chapters across all batches for target selection
    const { data: allChs } = await supabase
      .from('chapters')
      .select('id, chapter_name, subject, batch_id')
      .neq('id', chapter.id)
      .eq('is_active', true)
      .order('subject')
      .order('chapter_name');

    const mapped = (allChs || []).map(ch => ({
      id: ch.id,
      chapter_name: ch.chapter_name,
      subject: ch.subject,
      batch_name: getBatchName(ch.batch_id || ''),
    }));
    setAllChaptersForMove(mapped);
    setIsMoveQuestionsDialogOpen(true);
  };

  const handleMoveAllQuestions = async () => {
    if (!moveQuestionsSource || !moveQuestionsTargetId) return;
    setMovingQuestions(true);

    try {
      // Get target chapter info
      const targetCh = allChaptersForMove.find(c => c.id === moveQuestionsTargetId);
      
      // Find the batch_id for the target chapter
      const { data: targetChData } = await supabase
        .from('chapters')
        .select('id, batch_id, chapter_name, subject')
        .eq('id', moveQuestionsTargetId)
        .single();

      if (!targetChData) {
        toast.error('Target chapter not found');
        setMovingQuestions(false);
        return;
      }

      const { error } = await supabase
        .from('questions')
        .update({
          chapter_id: moveQuestionsTargetId,
          chapter: targetChData.chapter_name,
          batch_id: targetChData.batch_id,
          subject: targetChData.subject,
        })
        .eq('chapter_id', moveQuestionsSource.id);

      if (error) {
        toast.error('Failed to move questions: ' + error.message);
      } else {
        toast.success(`Moved ${moveQuestionsCount} questions to "${targetCh?.chapter_name}"`);
        setIsMoveQuestionsDialogOpen(false);
        fetchChapters();
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setMovingQuestions(false);
    }
  };

  const openEditDialog = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setFormData({
      chapter_name: chapter.chapter_name,
      chapter_number: chapter.chapter_number,
      description: chapter.description || '',
      is_free: chapter.is_free ?? true
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      chapter_name: '',
      chapter_number: 1,
      description: '',
      is_free: true
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Grade Filter — matches educator portal pill style ── */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
        <p className="text-sm font-semibold text-primary flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Select Grade
        </p>

        {/* Grade pills row */}
        <div className="flex flex-wrap gap-2">
          {[6, 7, 8, 9, 10, 11, 12].map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setGradeFilter(g)}
              className={[
                'h-10 px-5 rounded-full text-base font-semibold border transition-colors',
                gradeFilter === g
                  ? 'bg-[#013062] text-white border-[#013062]'
                  : 'bg-white text-[#013062] border-[#013062]/30 hover:border-[#013062]',
              ].join(' ')}
            >
              {g <= 10 ? `Class ${g}` : `Grade ${g}`}
            </button>
          ))}
        </div>

        {/* JEE / NEET toggle — only for grade 11 & 12 */}
        {gradeFilter >= 11 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Exam:</span>
            {(['JEE', 'NEET'] as const).map(exam => (
              <button
                key={exam}
                type="button"
                onClick={() => setExamFilter(exam)}
                className={[
                  'h-8 px-4 rounded-full text-sm font-semibold border transition-colors',
                  examFilter === exam
                    ? 'bg-[#013062] text-white border-[#013062]'
                    : 'bg-white text-[#013062] border-[#013062]/30 hover:border-[#013062]',
                ].join(' ')}
              >
                {exam}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Currently viewing:{' '}
          <strong className="text-foreground">
            {gradeFilter <= 10
              ? `Foundation Class ${gradeFilter}`
              : `${examFilter} Grade ${gradeFilter}`}
          </strong>
          {' '}— {selectedSubject}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Chapter Management
              </CardTitle>
              <CardDescription>
                Drag rows to reorder · numbers auto-update · use → arrows to move between grades
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {gradeFilter >= 11 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('This will auto-redistribute ALL 11th/12th chapters based on NCERT syllabus mapping. Continue?')) return;
                    toast.loading('Running NCERT auto-fix...');
                    const { data, error } = await supabase.rpc('fix_chapter_batch_distribution');
                    toast.dismiss();
                    if (error) { toast.error('Auto-fix failed: ' + error.message); return; }
                    const result = data as any;
                    toast.success(`Moved ${result?.total_questions_moved || 0} questions across ${result?.chapters_processed || 0} chapters`);
                    fetchChapters();
                  }}
                  className="gap-1"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Auto-Fix 11↔12
                </Button>
              )}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Chapter
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Chapter</DialogTitle>
                  <DialogDescription>
                    Add a new chapter to {selectedSubject}
                  </DialogDescription>
                </DialogHeader>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">
                      Adding to: {gradeFilter <= 10 ? `Foundation Class ${gradeFilter}` : `${examFilter} Grade ${gradeFilter}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Subject: {selectedSubject}</p>
                  </div>
                </div>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Chapter Number*</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.chapter_number}
                        onChange={(e) => setFormData({...formData, chapter_number: parseInt(e.target.value) || 1})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Access</Label>
                      <Select value={formData.is_free ? 'free' : 'premium'} onValueChange={(val) => setFormData({...formData, is_free: val === 'free'})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Chapter Name*</Label>
                    <Input
                      value={formData.chapter_name}
                      onChange={(e) => setFormData({...formData, chapter_name: e.target.value})}
                      placeholder="e.g., Mechanics"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Brief description of the chapter"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddChapter}>Add Chapter</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Subject Selector */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {validSubjects.map(subject => (
              <Button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                variant={selectedSubject === subject ? 'default' : 'outline'}
                size="sm"
              >
                {subject}
              </Button>
            ))}
          </div>

          {/* Chapters List with Drag-and-Drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {chapters.map((chapter) => (
                  <SortableChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    getBatchName={getBatchName}
                    toggleFreeStatus={toggleFreeStatus}
                    openMoveDialog={openMoveDialog}
                    openEditDialog={openEditDialog}
                    handleDeleteChapter={handleDeleteChapter}
                    openMoveQuestionsDialog={openMoveQuestionsDialog}
                    quickMoveLabel={gradeFilter >= 11 ? getQuickMoveLabel() : undefined}
                    onQuickMove={gradeFilter >= 11 ? handleQuickMove : undefined}
                  />
                ))}
                {chapters.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    No chapters found for <strong>{selectedSubject}</strong> in{' '}
                    <strong>{gradeFilter <= 10 ? `Foundation Class ${gradeFilter}` : `${examFilter} Grade ${gradeFilter}`}</strong>
                  </div>
                )}
              </div>
            </SortableContext>

            {/* Ghost card shown while dragging */}
            <DragOverlay>
              {activeDragId ? (() => {
                const ch = chapters.find(c => c.id === activeDragId);
                if (!ch) return null;
                return (
                  <div className="flex items-center gap-3 p-3 border-2 border-primary rounded-lg bg-card shadow-2xl opacity-90">
                    <GripVertical className="w-5 h-5 text-primary shrink-0" />
                    <ChapterRowContent chapter={ch} getBatchName={getBatchName} isDragging={true} />
                  </div>
                );
              })() : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Chapter</DialogTitle>
            <DialogDescription>
              Update chapter details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chapter Number*</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.chapter_number}
                  onChange={(e) => setFormData({...formData, chapter_number: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="space-y-2">
                <Label>Access</Label>
                <Select value={formData.is_free ? 'free' : 'premium'} onValueChange={(val) => setFormData({...formData, is_free: val === 'free'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Chapter Name*</Label>
              <Input
                value={formData.chapter_name}
                onChange={(e) => setFormData({...formData, chapter_name: e.target.value})}
                placeholder="e.g., Mechanics"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the chapter"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditChapter}>Update Chapter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Chapter Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Move Chapter</DialogTitle>
            <DialogDescription>
              Move "{movingChapter?.chapter_name}" to a different course, grade, or subject
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Current:</strong> {movingChapter?.subject} — {movingChapter?.batch_id ? getBatchName(movingChapter.batch_id) : 'Unknown'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Course</Label>
                <Select value={moveTarget.exam} onValueChange={(v) => setMoveTarget(prev => ({ ...prev, exam: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JEE">JEE</SelectItem>
                    <SelectItem value="NEET">NEET</SelectItem>
                    <SelectItem value="Foundation">Foundation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Grade</Label>
                <Select value={String(moveTarget.grade)} onValueChange={(v) => setMoveTarget(prev => ({ ...prev, grade: parseInt(v) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {moveTarget.exam === 'Foundation' 
                      ? [6, 7, 8, 9, 10].map(g => (
                          <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                        ))
                      : [11, 12].map(g => (
                          <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Subject</Label>
              <Select value={moveTarget.subject} onValueChange={(v) => setMoveTarget(prev => ({ ...prev, subject: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(moveTarget.exam === 'NEET' 
                    ? ['Physics', 'Chemistry', 'Biology']
                    : moveTarget.exam === 'Foundation'
                    ? ['Physics', 'Chemistry', 'Mathematics', 'Biology']
                    : ['Physics', 'Chemistry', 'Mathematics']
                  ).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-primary">
                <strong>Moving to:</strong> {moveTarget.subject} — {moveTarget.exam} Grade {moveTarget.grade}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMoveChapter}>Move Chapter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Questions Dialog */}
      <Dialog open={isMoveQuestionsDialogOpen} onOpenChange={setIsMoveQuestionsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveRight className="w-5 h-5" />
              Move Questions
            </DialogTitle>
            <DialogDescription>
              Move all {moveQuestionsCount} questions from "{moveQuestionsSource?.chapter_name}" to another chapter
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Source: {moveQuestionsSource?.chapter_name} ({moveQuestionsCount} questions)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Target Chapter</Label>
              <Select value={moveQuestionsTargetId} onValueChange={setMoveQuestionsTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target chapter..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {allChaptersForMove.map(ch => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.chapter_name} — {ch.subject} ({ch.batch_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {moveQuestionsTargetId && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-primary">
                  Will move <strong>{moveQuestionsCount}</strong> questions to{' '}
                  <strong>{allChaptersForMove.find(c => c.id === moveQuestionsTargetId)?.chapter_name}</strong>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveQuestionsDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleMoveAllQuestions}
              disabled={!moveQuestionsTargetId || movingQuestions || moveQuestionsCount === 0}
              className="gap-2"
            >
              {movingQuestions ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Moving...</>
              ) : (
                <><MoveRight className="w-4 h-4" /> Move All Questions</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChapterManager;