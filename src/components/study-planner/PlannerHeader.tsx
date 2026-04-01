import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, Sparkles } from 'lucide-react';
import type { MotivationData, AIInsights } from '@/lib/studyPlannerTypes';

interface PlannerHeaderProps {
  targetExam: string;
  examDate: string;
  daysToExam: number;
  avgAccuracy: number;
  currentRank: number;
  motivation: MotivationData;
  aiInsights: AIInsights | null;
  onRefresh: () => void;
  onFetchAI: () => void;
  aiLoading: boolean;
}

export function PlannerHeader({
  targetExam,
  examDate,
  daysToExam,
  avgAccuracy,
  currentRank,
  motivation,
  aiInsights,
  onRefresh,
  onFetchAI,
  aiLoading
}: PlannerHeaderProps) {
  return (
    <Card className="rounded-xl bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground shadow-xl border-none overflow-hidden">
      <CardContent className="p-5 relative">
        {/* Background effects */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {motivation.emoji} AI Study Planner
                  <Badge className="bg-white/20 text-white border-white/30 text-xs">
                    Hybrid
                  </Badge>
                </h2>
                <p className="text-white/80 text-sm">
                  {aiInsights?.personalizedGreeting || motivation.message}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={onFetchAI}
                size="sm"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                disabled={aiLoading}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {aiLoading ? 'Loading...' : 'AI Insights'}
              </Button>
              <Button
                onClick={onRefresh}
                size="sm"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-xs text-white/70 mb-1">Target Exam</p>
              <p className="text-lg font-bold">{targetExam}</p>
              <p className="text-xs text-white/60">
                {examDate ? new Date(examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-xs text-white/70 mb-1">Days Left</p>
              <p className="text-lg font-bold">{daysToExam}</p>
              <p className="text-xs text-white/60">Focus time</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-xs text-white/70 mb-1">Accuracy</p>
              <p className="text-lg font-bold">{avgAccuracy.toFixed(0)}%</p>
              <p className="text-xs text-white/60">All-time avg</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-xs text-white/70 mb-1">Predicted Rank</p>
              <p className="text-lg font-bold">{currentRank.toLocaleString()}</p>
              <p className="text-xs text-white/60">Current</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
