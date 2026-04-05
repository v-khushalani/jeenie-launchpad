import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, ChevronRight, ArrowLeft, Loader2, Beaker, Calculator, Atom, Leaf,
  Play, Target, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Header from '@/components/Header';

interface Chapter {
  id: string;
  chapter_name: string;
  subject: string;
  description?: string;
  question_count?: number;
}

interface Topic {
  id: string;
  topic_name: string;
  description?: string;
  difficulty_level?: string;
  question_count?: number;
}

const SUBJECT_META: Record<string, { icon: React.ReactNode; gradient: string; border: string; bg: string }> = {
  Physics: { icon: <Atom className="w-6 h-6 sm:w-8 sm:h-8 text-white" />, gradient: 'from-blue-500 to-cyan-500', border: 'border-blue-200 hover:border-blue-400', bg: 'bg-blue-100' },
  Chemistry: { icon: <Beaker className="w-6 h-6 sm:w-8 sm:h-8 text-white" />, gradient: 'from-green-500 to-emerald-500', border: 'border-green-200 hover:border-green-400', bg: 'bg-green-100' },
  Mathematics: { icon: <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-white" />, gradient: 'from-purple-500 to-indigo-500', border: 'border-purple-200 hover:border-purple-400', bg: 'bg-purple-100' },
  Biology: { icon: <Leaf className="w-6 h-6 sm:w-8 sm:h-8 text-white" />, gradient: 'from-amber-500 to-orange-500', border: 'border-amber-200 hover:border-amber-400', bg: 'bg-amber-100' },
};

type DrillLevel = 'subjects' | 'chapters' | 'topics';

const StudyNowPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [level, setLevel] = useState<DrillLevel>('subjects');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [userBatchIds, setUserBatchIds] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const loadUserContext = async () => {
      if (!user?.id) { setProfileLoading(false); return; }
      try {
        const { data: profile } = await supabase.from('profiles').select('grade, target_exam').eq('id', user.id).single();
        const grade = profile?.grade;
        const targetExam = profile?.target_exam;

        let batchQuery = supabase.from('batches').select('id').eq('is_active', true);
        if (grade) batchQuery = batchQuery.eq('grade', grade);
        if (targetExam) batchQuery = batchQuery.ilike('exam_type', `%${targetExam}%`);

        const { data: batches } = await batchQuery;
        const batchIds = (batches || []).map(b => b.id);
        setUserBatchIds(batchIds);

        if (batchIds.length > 0) {
          const { data: batchSubjects } = await supabase.from('batch_subjects').select('subject').in('batch_id', batchIds);
          const subjects = [...new Set((batchSubjects || []).map(bs => bs.subject))];
          if (subjects.length > 0) {
            setAvailableSubjects(subjects);
          } else {
            const { data: chapterSubjects } = await supabase.from('chapters').select('subject').in('batch_id', batchIds).eq('is_active', true);
            setAvailableSubjects([...new Set((chapterSubjects || []).map(c => c.subject))].length > 0
              ? [...new Set((chapterSubjects || []).map(c => c.subject))]
              : ['Physics', 'Chemistry', 'Mathematics']);
          }
        } else {
          setAvailableSubjects(['Physics', 'Chemistry', 'Mathematics']);
        }
      } catch {
        setAvailableSubjects(['Physics', 'Chemistry', 'Mathematics']);
      } finally {
        setProfileLoading(false);
      }
    };
    loadUserContext();
  }, [user?.id]);

  const fetchChapters = async (subject: string) => {
    setLoading(true);
    try {
      let query = supabase.from('chapters').select('id, chapter_name, subject, description').ilike('subject', subject).eq('is_active', true).order('chapter_number', { ascending: true });
      if (userBatchIds.length > 0) query = query.in('batch_id', userBatchIds);
      const { data, error } = await query;
      if (error) throw error;

      const chapterIds = (data || []).map(c => c.id);
      const countMap: Record<string, number> = {};
      if (chapterIds.length > 0) {
        const { data: qData } = await supabase.from('questions_public').select('chapter_id').in('chapter_id', chapterIds).eq('is_active', true);
        (qData || []).forEach(q => { if (q.chapter_id) countMap[q.chapter_id] = (countMap[q.chapter_id] || 0) + 1; });
      }
      setChapters((data || []).map(c => ({ ...c, question_count: countMap[c.id] || 0 })));
    } catch {
      toast.error('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async (chapterId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('topics').select('id, topic_name, description, difficulty_level').eq('chapter_id', chapterId).eq('is_active', true).order('order_index', { ascending: true });
      if (error) throw error;

      const topicIds = (data || []).map(t => t.id);
      const countMap: Record<string, number> = {};
      if (topicIds.length > 0) {
        const { data: qData } = await supabase.from('questions_public').select('topic_id').in('topic_id', topicIds).eq('is_active', true);
        (qData || []).forEach(q => { if (q.topic_id) countMap[q.topic_id] = (countMap[q.topic_id] || 0) + 1; });
      }
      setTopics((data || []).map(t => ({ ...t, question_count: countMap[t.id] || 0 })));
    } catch {
      toast.error('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = (subject: string) => { setSelectedSubject(subject); setLevel('chapters'); fetchChapters(subject); };
  const handleChapterClick = (chapter: Chapter) => { setSelectedChapter(chapter); setLevel('topics'); fetchTopics(chapter.id); };
  const handleTopicClick = (topic: Topic) => {
    navigate(`/practice?subject=${encodeURIComponent(selectedSubject)}&chapter=${encodeURIComponent(selectedChapter?.chapter_name || '')}&topic_id=${topic.id}&topic=${encodeURIComponent(topic.topic_name)}`);
  };
  const handlePracticeChapter = (chapter: Chapter) => {
    navigate(`/practice?subject=${encodeURIComponent(selectedSubject)}&chapter=${encodeURIComponent(chapter.chapter_name)}&chapter_id=${chapter.id}`);
  };
  const goBack = () => {
    if (level === 'topics') { setLevel('chapters'); setSelectedChapter(null); setTopics([]); }
    else if (level === 'chapters') { setLevel('subjects'); setSelectedSubject(''); setChapters([]); }
  };

  const getDifficultyBadge = (d?: string) => {
    if (!d) return null;
    const dl = d.toLowerCase();
    const cls = dl === 'easy' ? 'bg-green-50 text-green-700 border-green-200' : dl === 'hard' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200';
    return <Badge className={`text-[10px] ${cls}`}>{d}</Badge>;
  };

  const isLoading = profileLoading || loading;

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto pt-16 sm:pt-20 pb-4 md:pb-4 relative z-10">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 max-w-7xl">

          {/* Navigation */}
          {level !== 'subjects' && (
            <div className="mb-4 sm:mb-6">
              <Button variant="outline" className="border-2 border-primary text-sm" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {level === 'chapters' ? 'Back to Subjects' : 'Back to Chapters'}
              </Button>
            </div>
          )}

          {/* SUBJECTS VIEW */}
          {level === 'subjects' && (
            <>
              {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
                  {availableSubjects.map(subName => {
                    const meta = SUBJECT_META[subName] || { icon: <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />, gradient: 'from-slate-500 to-slate-600', border: 'border-slate-200 hover:border-slate-400', bg: 'bg-slate-100' };
                    return (
                      <div key={subName} className={`group relative overflow-hidden rounded-2xl bg-card border-2 ${meta.border} hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl`} onClick={() => handleSubjectClick(subName)}>
                        <div className="p-3 sm:p-6 text-center">
                          <div className={`w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-br ${meta.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            {meta.icon}
                          </div>
                          <h3 className="text-base sm:text-2xl font-bold mb-1 sm:mb-2 text-foreground">{subName}</h3>
                          <p className="hidden sm:block text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-6">Practice {subName} chapter by chapter</p>
                          <div className="hidden sm:flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${meta.bg} flex items-center justify-center`}>
                                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                              </div>
                              <div className="text-left">
                                <div className="text-foreground font-bold text-sm sm:text-base">Chapters</div>
                                <div className="text-muted-foreground text-xs">All topics</div>
                              </div>
                            </div>
                          </div>
                          <Button className={`w-full bg-gradient-to-r ${meta.gradient} text-white font-semibold py-2 sm:py-3 rounded-xl shadow-md transition-all duration-300 text-xs sm:text-base`}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            <span className="sm:hidden">Start</span>
                            <span className="hidden sm:inline">Start Practicing</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* CHAPTERS VIEW */}
          {level === 'chapters' && (
            <Card className="border-2 border-primary/20 shadow-lg bg-card overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-secondary border-b border-primary/20 p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${SUBJECT_META[selectedSubject]?.gradient || 'from-primary to-blue-600'} flex items-center justify-center`}>
                    {SUBJECT_META[selectedSubject]?.icon || <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-3xl font-bold text-foreground">{selectedSubject} — Chapters</h2>
                    <p className="text-muted-foreground text-xs sm:text-base flex items-center gap-2 mt-1">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                      Select a chapter to explore topics or practice all questions
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 sm:p-6">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : chapters.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No chapters found for {selectedSubject}.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 max-h-[calc(100dvh-220px)] md:max-h-[60vh] overflow-y-auto pr-2">
                    {chapters.map((ch, i) => (
                      <div key={ch.id} className="p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] border-border bg-card hover:border-primary/50 hover:shadow-md" onClick={() => handleChapterClick(ch)}>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-foreground text-sm sm:text-base truncate">{ch.chapter_name}</div>
                            {ch.description && <div className="text-xs text-muted-foreground truncate">{ch.description}</div>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-[10px] sm:text-xs">{ch.question_count || 0} Qs</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TOPICS VIEW */}
          {level === 'topics' && (
            <Card className="border-2 border-purple-200 shadow-lg bg-card overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-b border-purple-200 p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-3xl font-bold text-foreground">{selectedChapter?.chapter_name} — Topics</h2>
                    <p className="text-muted-foreground text-xs sm:text-base flex items-center gap-2 mt-1">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                      Pick a topic to practice or attempt the full chapter
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 sm:p-6">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-3">
                    {selectedChapter && (
                      <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-primary/10 to-purple-50 dark:to-purple-950/20 border-2 border-primary/20 shadow-md">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-lg sm:text-xl text-foreground">Practice Full Chapter</p>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1">All questions from {selectedChapter.chapter_name}</p>
                          </div>
                          <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold rounded-xl shadow-md" onClick={() => handlePracticeChapter(selectedChapter)}>
                            <Play className="w-4 h-4 mr-2" />
                            Start Practice
                          </Button>
                        </div>
                      </div>
                    )}

                    {topics.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">No topics found. Try practicing the full chapter instead.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 max-h-[calc(100dvh-300px)] md:max-h-[50vh] overflow-y-auto pr-2">
                        {topics.map(topic => (
                          <div key={topic.id} className="p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] border-border bg-card hover:border-purple-400 hover:shadow-md" onClick={() => handleTopicClick(topic)}>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                                <Target className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground text-sm truncate">{topic.topic_name}</div>
                                {topic.description && <div className="text-xs text-muted-foreground truncate">{topic.description}</div>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {getDifficultyBadge(topic.difficulty_level)}
                                <Badge variant="outline" className="text-[10px]">{topic.question_count || 0} Qs</Badge>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyNowPage;
