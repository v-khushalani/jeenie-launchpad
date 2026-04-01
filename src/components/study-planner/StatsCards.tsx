import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Sparkles, Calendar, Trophy } from 'lucide-react';
import type { TopicPriority, RankPrediction } from '@/lib/studyPlannerTypes';

interface StatsCardsProps {
  weakTopics: TopicPriority[];
  strongTopics: TopicPriority[];
  daysToExam: number;
  rankPrediction: RankPrediction;
}

export function StatsCards({ weakTopics, strongTopics, daysToExam, rankPrediction }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Focus Areas */}
      <Card className="rounded-xl shadow-sm hover:shadow-md transition-all border-l-4 border-red-500 bg-red-50/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-500 rounded-lg">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
            <p className="text-xs font-medium text-slate-700">Focus Areas</p>
          </div>
          <h3 className="text-2xl font-bold text-red-700">{weakTopics.length}</h3>
          <p className="text-xs text-slate-600 mb-2">Topics need work</p>
          <Badge className="bg-red-500 text-white text-xs">60% time</Badge>
        </CardContent>
      </Card>

      {/* Strengths */}
      <Card className="rounded-xl shadow-sm hover:shadow-md transition-all border-l-4 border-green-500 bg-green-50/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-500 rounded-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <p className="text-xs font-medium text-slate-700">Strengths</p>
          </div>
          <h3 className="text-2xl font-bold text-green-700">{strongTopics.length}</h3>
          <p className="text-xs text-slate-600 mb-2">Mastered topics</p>
          <Badge className="bg-green-500 text-white text-xs">10% revision</Badge>
        </CardContent>
      </Card>

      {/* Days to Exam */}
      <Card className="rounded-xl shadow-sm hover:shadow-md transition-all border-l-4 border-primary bg-blue-50/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Calendar className="h-4 w-4 text-primary-foreground" />
            </div>
            <p className="text-xs font-medium text-slate-700">Countdown</p>
          </div>
          <h3 className="text-2xl font-bold text-primary">{daysToExam}</h3>
          <p className="text-xs text-slate-600 mb-2">Days remaining</p>
          <Badge className="bg-primary text-primary-foreground text-xs">
            {daysToExam > 90 ? 'Learning' : daysToExam > 30 ? 'Revision' : 'Final Push'}
          </Badge>
        </CardContent>
      </Card>

      {/* Target Rank */}
      <Card className="rounded-xl shadow-sm hover:shadow-md transition-all border-l-4 border-amber-500 bg-amber-50/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-500 rounded-lg">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <p className="text-xs font-medium text-slate-700">Target Rank</p>
          </div>
          <h3 className="text-2xl font-bold text-amber-700">{rankPrediction.targetRank.toLocaleString()}</h3>
          <p className="text-xs text-slate-600 mb-2">{rankPrediction.percentileRange}</p>
          <Badge className="bg-amber-500 text-white text-xs">
            {rankPrediction.improvementWeeks}w to goal
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
