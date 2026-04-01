import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  Play, Square, CheckCircle2, AlertCircle,
  Database, Loader2, RotateCcw, Zap, Trash2,
  BookOpen, Stethoscope, GraduationCap, FlaskConical,
  ChevronDown, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { logger } from '@/utils/logger';

interface ImportSource {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  dataset: string;
  totalRows: number;
  color: string;
  targetExam: 'JEE' | 'NEET' | 'both' | 'foundation';
}

const IMPORT_SOURCES: ImportSource[] = [
  {
    id: 'entrance-exam',
    title: 'Entrance Exam Dataset',
    description: 'JEE + NEET mixed (~97K). Auto-routes to correct grade & batch based on NCERT syllabus mapping.',
    icon: <GraduationCap className="w-5 h-5" />,
    dataset: 'datavorous/entrance-exam-dataset',
    totalRows: 97_000,
    color: 'bg-violet-50 border-violet-200 text-violet-700',
    targetExam: 'both',
  },
  {
    id: 'medmcqa',
    title: 'MedMCQA (NEET 200K+)',
    description: 'Medical MCQs — 200K+ Biology, Anatomy, Physiology. Routes to NEET batches with auto chapter creation.',
    icon: <Stethoscope className="w-5 h-5" />,
    dataset: 'openlifescienceai/medmcqa',
    totalRows: 200_000,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    targetExam: 'NEET',
  },
  {
    id: 'sciq',
    title: 'SciQ (Science MCQs)',
    description: '13K+ science MCQs with explanations — Physics, Chemistry, Biology.',
    icon: <FlaskConical className="w-5 h-5" />,
    dataset: 'allenai/sciq',
    totalRows: 13_700,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    targetExam: 'both',
  },
  {
    id: 'ncert-6',
    title: 'NCERT Science Class 6',
    description: 'KadamParth/NCERT_Science_6th — ~2.7K questions. ⚠️ Mostly open-ended, only MCQ rows import.',
    icon: <BookOpen className="w-5 h-5" />,
    dataset: 'KadamParth/NCERT_Science_6th',
    totalRows: 2_762,
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    targetExam: 'foundation',
  },
  {
    id: 'ncert-7',
    title: 'NCERT Science Class 7',
    description: 'KadamParth/NCERT_Science_7th — ~2K questions. ⚠️ Mostly open-ended, only MCQ rows import.',
    icon: <BookOpen className="w-5 h-5" />,
    dataset: 'KadamParth/NCERT_Science_7th',
    totalRows: 2_000,
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    targetExam: 'foundation',
  },
  {
    id: 'ncert-8',
    title: 'NCERT Science Class 8',
    description: 'KadamParth/NCERT_Science_8th — ~2.2K questions. ⚠️ Mostly open-ended, only MCQ rows import.',
    icon: <BookOpen className="w-5 h-5" />,
    dataset: 'KadamParth/NCERT_Science_8th',
    totalRows: 2_200,
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    targetExam: 'foundation',
  },
  {
    id: 'ncert-9',
    title: 'NCERT Science Class 9',
    description: 'KadamParth/NCERT_Science_9th — ~2.6K questions. ⚠️ Mostly open-ended, only MCQ rows import.',
    icon: <BookOpen className="w-5 h-5" />,
    dataset: 'KadamParth/NCERT_Science_9th',
    totalRows: 2_600,
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    targetExam: 'foundation',
  },
  {
    id: 'ncert-10',
    title: 'NCERT Science Class 10',
    description: 'KadamParth/NCERT_Science_10th — ~3.4K questions. ⚠️ Mostly open-ended, only MCQ rows import.',
    icon: <BookOpen className="w-5 h-5" />,
    dataset: 'KadamParth/NCERT_Science_10th',
    totalRows: 3_400,
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    targetExam: 'foundation',
  },
];

function getImportSizing(sourceId: string) {
  switch (sourceId) {
    case 'entrance-exam': return { pageSize: 100, maxPages: 4 };
    case 'medmcqa': return { pageSize: 100, maxPages: 4 };
    case 'sciq': return { pageSize: 100, maxPages: 2 };
    default: return { pageSize: 100, maxPages: 2 };
  }
}

interface ImportLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

interface CallResult {
  success?: boolean;
  imported?: number;
  skipped?: number;
  next_offset?: number;
  has_more?: boolean;
  pages_processed?: number;
  chapters_created?: number;
  error?: string;
  skippedReasons?: string[];
  skipReasonCounts?: Record<string, number>;
}

interface BatchInfo {
  id: string;
  name: string;
  exam_type: string;
  grade: number | null;
}

export const BulkImportManager = () => {
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalImported, setTotalImported] = useState(0);
  const [totalSkipped, setTotalSkipped] = useState(0);
  const [questionsInDb, setQuestionsInDb] = useState(0);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [chaptersCreated, setChaptersCreated] = useState(0);
  const [deduping, setDeduping] = useState(false);
  const [dupesRemoved, setDupesRemoved] = useState(0);
  const [skipBreakdown, setSkipBreakdown] = useState<Record<string, number>>({});
  const [skipSectionOpen, setSkipSectionOpen] = useState(false);
  const abortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    const { count } = await supabase.from('questions').select('id', { count: 'exact', head: true });
    setQuestionsInDb(count || 0);

    const { data: batchData } = await supabase
      .from('batches')
      .select('id, name, exam_type, grade')
      .eq('is_active', true);

    if (batchData) setBatches(batchData);
  };

  const addLog = useCallback((message: string, type: ImportLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
    setLogs(prev => [...prev, { time, message, type }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const getSourceConfig = () => IMPORT_SOURCES.find(s => s.id === activeSource);
  const progressPercent = () => {
    const src = getSourceConfig();
    if (!src || src.totalRows === 0) return 0;
    return Math.min((currentOffset / src.totalRows) * 100, 100);
  };

  const mergeSkipBreakdown = (newCounts: Record<string, number>) => {
    setSkipBreakdown(prev => {
      const merged = { ...prev };
      for (const [reason, count] of Object.entries(newCounts)) {
        merged[reason] = (merged[reason] || 0) + count;
      }
      return merged;
    });
  };

  const startImport = async () => {
    const source = getSourceConfig();
    if (!source || !source.dataset) {
      toast.error('This source does not support auto-import.');
      return;
    }

    if (batches.length === 0) {
      toast.error('No batches found. Create batches first in Content Manager.');
      return;
    }

    setRunning(true);
    setError(null);
    setCompleted(false);
    abortRef.current = false;

    const startOffset = currentOffset;

    const batchesForEdge = batches
      .filter(b => b.grade !== null)
      .map(b => ({ id: b.id, grade: b.grade, exam_type: b.exam_type }));

    addLog(`🚀 Starting import from "${source.title}" at offset ${startOffset}`, 'info');
    addLog(`📊 DB: ${questionsInDb} questions | ${batchesForEdge.length} batches | Auto-create chapters: ✅`, 'info');

    let offset = startOffset;
    let sessionImported = 0;
    let sessionSkipped = 0;
    let consecutiveEmpty = 0;

    while (!abortRef.current) {
      try {
        addLog(`📥 Fetching offset ${offset}...`, 'info');

        const srcConfig = getImportSizing(activeSource || '');
        const payload: Record<string, any> = {
          offset,
          limit: srcConfig.pageSize,
          auto_paginate: true,
          max_pages: srcConfig.maxPages,
          create_missing_chapters: true,
          dataset: source.dataset,
          batches: batchesForEdge,
        };

        const { data, error: fnError } = await supabase.functions.invoke('fetch-and-import', { body: payload });

        if (fnError) throw new Error(fnError.message || 'Edge Function call failed');

        const result = data as CallResult;

        if (result.error) {
          addLog(`⚠️ Error at offset ${offset}: ${result.error}`, 'error');
          // Still merge any skip data from partial results
          if (result.skipReasonCounts) mergeSkipBreakdown(result.skipReasonCounts);
          consecutiveEmpty++;
          if (consecutiveEmpty >= 3) {
            addLog(`❌ 3 consecutive errors. Stopping.`, 'error');
            setError(`Stopped after 3 errors at offset ${offset}`);
            break;
          }
          if (result.next_offset && result.next_offset > offset) {
            offset = result.next_offset;
          } else {
            await new Promise(r => setTimeout(r, 2000));
          }
          continue;
        }

        const imported = result.imported || 0;
        const skipped = result.skipped || 0;
        const nextOffset = result.next_offset || offset + (srcConfig.pageSize * srcConfig.maxPages);
        const hasMore = result.has_more !== false;
        const newChapters = result.chapters_created || 0;

        sessionImported += imported;
        sessionSkipped += skipped;

        setTotalImported(prev => prev + imported);
        setTotalSkipped(prev => prev + skipped);
        setCurrentOffset(nextOffset);
        setQuestionsInDb(prev => prev + imported);
        if (newChapters > 0) setChaptersCreated(prev => prev + newChapters);

        // Merge skip reason counts
        if (result.skipReasonCounts && Object.keys(result.skipReasonCounts).length > 0) {
          mergeSkipBreakdown(result.skipReasonCounts);
        }

        if (imported > 0) {
          const chapterMsg = newChapters > 0 ? `, 📁 +${newChapters} chapters` : '';
          addLog(`✅ +${imported} imported, ${skipped} skipped (${offset} → ${nextOffset})${chapterMsg}`, 'success');
          consecutiveEmpty = 0;
        } else {
          addLog(`⏭️ 0 new at offset ${offset} (${skipped} skipped)`, 'warn');
          consecutiveEmpty++;
        }

        // Log skip reasons summary for this call
        if (result.skipReasonCounts && Object.keys(result.skipReasonCounts).length > 0) {
          const topReasons = Object.entries(result.skipReasonCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([reason, count]) => `${reason} [×${count}]`)
            .join(', ');
          addLog(`⏭️ Skip reasons: ${topReasons}`, 'warn');
        }

        if (!hasMore) {
          addLog(`🎉 Dataset complete!`, 'success');
          setCompleted(true);
          break;
        }

        if (consecutiveEmpty >= 10) {
          addLog(`✅ 10 consecutive empty pages — likely done!`, 'success');
          setCompleted(true);
          break;
        }

        offset = nextOffset;
        await new Promise(r => setTimeout(r, 1500));

      } catch (err: any) {
        addLog(`❌ Error: ${err?.message}`, 'error');
        logger.error('Bulk import error:', err);
        consecutiveEmpty++;
        if (consecutiveEmpty >= 3) { setError(err?.message); break; }
        addLog(`⏳ Retrying in 5s...`, 'warn');
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    if (abortRef.current) addLog(`⏸️ Paused at offset ${offset}. Resume anytime.`, 'warn');
    addLog(`📊 Session: +${sessionImported} imported, ${sessionSkipped} skipped`, 'info');
    setRunning(false);

    const { count: finalCount } = await supabase.from('questions').select('id', { count: 'exact', head: true });
    setQuestionsInDb(finalCount || 0);

    if (sessionImported > 0) toast.success(`Import done! ${sessionImported} questions added.`);
  };

  const stopImport = () => { abortRef.current = true; };

  const deleteDuplicates = async () => {
    if (!window.confirm('Permanently delete all duplicate questions across ALL batches? Keeps oldest copy.')) return;
    setDeduping(true);
    addLog('🔍 Scanning for duplicates across all batches...', 'info');
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('delete_duplicate_questions');
      if (rpcError) throw new Error(rpcError.message);
      const result = data as { success: boolean; total_scanned: number; unique_questions: number; deleted: number };
      if (!result?.success) throw new Error('Unexpected result');
      setDupesRemoved(prev => prev + result.deleted);
      setQuestionsInDb(result.unique_questions);
      addLog(`🗑️ Removed ${result.deleted.toLocaleString()} duplicates. ${result.unique_questions.toLocaleString()} unique remain.`, 'success');
      toast.success(`Deleted ${result.deleted.toLocaleString()} duplicates!`);
    } catch (err: any) {
      addLog(`❌ Dedup error: ${err.message}`, 'error');
      toast.error(`Dedup failed: ${err.message}`);
    } finally {
      setDeduping(false);
    }
  };

  const resetSession = () => {
    setCurrentOffset(0);
    setTotalImported(0);
    setTotalSkipped(0);
    setChaptersCreated(0);
    setLogs([]);
    setError(null);
    setCompleted(false);
    setSkipBreakdown({});
    setSkipSectionOpen(false);
  };

  const totalSkipCount = Object.values(skipBreakdown).reduce((a, b) => a + b, 0);
  const sortedSkipReasons = Object.entries(skipBreakdown).sort((a, b) => b[1] - a[1]);

  const logColors: Record<ImportLog['type'], string> = {
    info: 'text-muted-foreground',
    success: 'text-emerald-700',
    error: 'text-destructive',
    warn: 'text-amber-600',
  };

  return (
    <div className="space-y-6">
      {/* Header + Universal Clean Duplicates */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Bulk Import & Data Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Import from multiple sources. Auto-creates chapters & routes to correct grade/batch.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm font-bold">
            {questionsInDb.toLocaleString()} questions
          </Badge>
          <Button
            onClick={deleteDuplicates}
            variant="outline"
            size="sm"
            className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
            disabled={deduping || running}
          >
            {deduping ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cleaning...</>
            ) : (
              <><Trash2 className="w-3.5 h-3.5" /> Clean All Duplicates</>
            )}
          </Button>
        </div>
      </div>

      {dupesRemoved > 0 && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            {dupesRemoved.toLocaleString()} duplicate questions removed this session.
          </AlertDescription>
        </Alert>
      )}

      {/* Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {IMPORT_SOURCES.map(source => (
          <Card
            key={source.id}
            className={`cursor-pointer transition-all hover:shadow-md ${activeSource === source.id ? 'ring-2 ring-primary' : ''} ${source.color} border`}
            onClick={() => { if (!running) { setActiveSource(source.id); resetSession(); } }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {source.icon}
                {source.title}
              </CardTitle>
              <CardDescription className="text-xs">{source.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                {source.totalRows > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    ~{(source.totalRows / 1000).toFixed(0)}K rows
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {source.targetExam === 'both' ? 'JEE + NEET' : source.targetExam === 'foundation' ? 'Class 6-10' : source.targetExam}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Import Panel */}
      {activeSource && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-2 rounded border bg-background">
                <p className="text-xs text-muted-foreground">Imported</p>
                <p className="text-lg font-bold text-emerald-700">+{totalImported.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded border bg-background">
                <p className="text-xs text-muted-foreground">Skipped</p>
                <p className="text-lg font-bold text-amber-600">{totalSkipped.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded border bg-background">
                <p className="text-xs text-muted-foreground">Chapters Created</p>
                <p className="text-lg font-bold text-orange-600">{chaptersCreated.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded border bg-background">
                <p className="text-xs text-muted-foreground">Dupes Removed</p>
                <p className="text-lg font-bold text-destructive">{dupesRemoved.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded border bg-background">
                <p className="text-xs text-muted-foreground">Offset</p>
                <p className="text-lg font-bold">{currentOffset.toLocaleString()}</p>
              </div>
            </div>

            {/* Progress */}
            {getSourceConfig()?.totalRows ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Offset {currentOffset.toLocaleString()} / ~{getSourceConfig()!.totalRows.toLocaleString()}</span>
                  <span>{progressPercent().toFixed(1)}%</span>
                </div>
                <Progress value={progressPercent()} className="h-3" />
              </div>
            ) : null}

            {/* Skip Breakdown Section */}
            {totalSkipCount > 0 && (
              <Collapsible open={skipSectionOpen} onOpenChange={setSkipSectionOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between gap-2 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Skipped Questions Breakdown ({totalSkipCount.toLocaleString()} total)
                    </span>
                    {skipSectionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium text-muted-foreground">Reason</th>
                          <th className="text-right p-2 font-medium text-muted-foreground w-24">Count</th>
                          <th className="text-right p-2 font-medium text-muted-foreground w-20">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSkipReasons.map(([reason, count]) => (
                          <tr key={reason} className="border-t">
                            <td className="p-2 text-foreground">{reason}</td>
                            <td className="p-2 text-right font-mono text-amber-700">{count.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono text-muted-foreground">
                              {((count / totalSkipCount) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 "No chapter" skips can be fixed by creating the missing chapters in Content Manager, then resuming import.
                    "Duplicate" skips mean the question already exists in the database.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Batch list */}
            <div className="flex flex-wrap gap-1.5">
              {batches.filter(b => b.grade !== null).map(b => (
                <Badge key={b.id} variant="outline" className="text-xs">
                  {b.name} (G{b.grade})
                </Badge>
              ))}
              {batches.filter(b => b.grade !== null).length === 0 && (
                <Badge variant="destructive" className="text-xs">❌ No batches with grade set</Badge>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {!running ? (
                <>
                  {getSourceConfig()?.dataset ? (
                    <Button onClick={startImport} className="gap-2" disabled={batches.length === 0}>
                      {currentOffset > 0 ? (
                        <><Play className="w-4 h-4" /> Resume from {currentOffset.toLocaleString()}</>
                      ) : (
                        <><Zap className="w-4 h-4" /> Start Import</>
                      )}
                    </Button>
                  ) : (
                    <Alert>
                      <AlertDescription className="text-sm">
                        Use <strong>Content Manager</strong> to set up grade batches, then use 
                        <strong> PDF Extractor</strong> or <strong>CSV upload</strong> to import.
                      </AlertDescription>
                    </Alert>
                  )}
                  {(currentOffset > 0 || logs.length > 0) && (
                    <Button variant="outline" onClick={resetSession} className="gap-2">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={stopImport} variant="destructive" className="gap-2">
                  <Square className="w-4 h-4" /> Stop Import
                </Button>
              )}
            </div>

            {/* Logs */}
            {logs.length > 0 && (
              <div className="border rounded-lg p-3">
                <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                  {running && <Loader2 className="w-3 h-3 animate-spin" />}
                  Live Log ({logs.length})
                </p>
                <ScrollArea className="h-56">
                  <div ref={scrollRef} className="space-y-0.5 font-mono text-xs">
                    {logs.map((log, i) => (
                      <div key={i} className={`${logColors[log.type]} leading-5`}>
                        <span className="text-muted-foreground mr-2">[{log.time}]</span>
                        {log.message}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {completed && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">
                  Import complete! {questionsInDb.toLocaleString()} total questions in database.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
