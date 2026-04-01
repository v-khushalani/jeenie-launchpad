import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, Brain, RefreshCw, Zap } from "lucide-react";
import { getAssignmentStats, bulkAutoAssign, clearCurriculumCache } from "@/services/topicAssignmentService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

interface AssignmentStats {
  total: number;
  autoAssigned: number;
  suggested: number;
  manual: number;
  avgConfidence: number;
}

export function AutoTopicAssignment() {
  const [stats, setStats] = useState<AssignmentStats>({
    total: 0, autoAssigned: 0, suggested: 0, manual: 0, avgConfidence: 0
  });
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const loadStats = async () => {
    try {
      const data = await getAssignmentStats();
      setStats(data);
    } catch (error) {
      logger.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleBulkAutoAssign = async () => {
    try {
      setProcessing(true);
      
      // Fetch all pending questions
      const { data: questions, error } = await supabase
        .from("extracted_questions_queue")
        .select("id")
        .eq("status", "pending");

      if (error) throw error;
      
      if (!questions || questions.length === 0) {
        toast.info("No pending questions to process");
        setProcessing(false);
        return;
      }

      setProgress({ current: 0, total: questions.length });
      toast.info(`Processing ${questions.length} questions with NLP...`);

      const questionIds = questions.map(q => q.id);
      const result = await bulkAutoAssign(questionIds);

      toast.success(
        `Processed ${result.processed}: ${result.autoAssigned} auto-assigned, ${result.suggested} suggested, ${result.failed} failed`
      );

      await loadStats();
    } catch (error) {
      logger.error("Error in bulk auto-assign:", error);
      toast.error("Failed to process questions");
    } finally {
      setProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleRefreshCache = async () => {
    clearCurriculumCache();
    toast.success("Curriculum cache cleared - will refresh on next run");
  };

  const autoPercent = stats.total > 0 ? Math.round((stats.autoAssigned / stats.total) * 100) : 0;
  const suggestPercent = stats.total > 0 ? Math.round((stats.suggested / stats.total) * 100) : 0;
  const manualPercent = stats.total > 0 ? Math.round((stats.manual / stats.total) * 100) : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">NLP Auto-Assignment</CardTitle>
              <CardDescription>
                Scalable, error-free topic assignment using advanced NLP algorithms
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Process pending questions and auto-assign chapters/topics using TF-IDF + Cosine similarity
              </p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">TF-IDF</Badge>
                <Badge variant="outline" className="text-xs">Cosine Similarity</Badge>
                <Badge variant="outline" className="text-xs">Domain Keywords</Badge>
                <Badge variant="outline" className="text-xs">Cached</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefreshCache}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
              <Button onClick={handleBulkAutoAssign} disabled={processing || stats.total === 0} size="lg" className="gap-2">
                {processing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
                ) : (
                  <><Sparkles className="h-4 w-4" />Run NLP ({stats.total})</>
                )}
              </Button>
            </div>
          </div>

          {processing && progress.total > 0 && (
            <div className="space-y-2">
              <Progress value={(progress.current / progress.total) * 100} />
              <p className="text-sm text-muted-foreground">
                Processing {progress.current}/{progress.total}...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Statistics</CardTitle>
          <CardDescription>Performance metrics for pending questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Pending Questions</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-sm text-muted-foreground">Auto-Assigned</p>
              </div>
              <p className="text-3xl font-bold text-green-500">{stats.autoAssigned}</p>
              <Badge variant="outline" className="text-xs">{autoPercent}% (≥70% confidence)</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <p className="text-sm text-muted-foreground">Suggested</p>
              </div>
              <p className="text-3xl font-bold text-yellow-500">{stats.suggested}</p>
              <Badge variant="outline" className="text-xs">{suggestPercent}% (35-70%)</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Manual Review</p>
              </div>
              <p className="text-3xl font-bold text-muted-foreground">{stats.manual}</p>
              <Badge variant="outline" className="text-xs">{manualPercent}% (&lt;35%)</Badge>
            </div>
          </div>

          {/* Average Confidence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Average Confidence Score</p>
              <p className="text-sm font-bold">{stats.avgConfidence.toFixed(1)}%</p>
            </div>
            <Progress value={stats.avgConfidence} className="h-2" />
          </div>

          {/* Distribution Bar */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Distribution</p>
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {stats.autoAssigned > 0 && (
                <div className="bg-green-500" style={{ width: `${autoPercent}%` }} title={`Auto: ${autoPercent}%`} />
              )}
              {stats.suggested > 0 && (
                <div className="bg-yellow-500" style={{ width: `${suggestPercent}%` }} title={`Suggested: ${suggestPercent}%`} />
              )}
              {stats.manual > 0 && (
                <div className="bg-muted-foreground/40" style={{ width: `${manualPercent}%` }} title={`Manual: ${manualPercent}%`} />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Auto</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Suggested</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/40" />Manual</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Algorithm Info */}
      <Alert className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <Brain className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Scalable NLP Pipeline:</strong>
          <ul className="mt-2 text-sm space-y-1 list-disc list-inside">
            <li><strong>Keyword Extraction:</strong> Domain-aware tokenization with stop-word removal and n-gram detection</li>
            <li><strong>TF-IDF + Cosine:</strong> Measures semantic similarity against curriculum topics (50% weight)</li>
            <li><strong>Weighted Jaccard:</strong> Set overlap with keyword importance weights (30% weight)</li>
            <li><strong>Domain Bonus:</strong> Extra points for Physics/Chemistry/Math specific keywords (20% weight)</li>
            <li><strong>Caching:</strong> Curriculum data cached for 5 mins for batch performance</li>
            <li><strong>Batch Processing:</strong> Processes 10 questions in parallel for speed</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
