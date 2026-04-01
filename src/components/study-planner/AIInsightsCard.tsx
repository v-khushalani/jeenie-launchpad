import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lightbulb, CheckCircle } from 'lucide-react';
import type { AIInsights } from '@/lib/studyPlannerTypes';

interface AIInsightsCardProps {
  insights: AIInsights;
}

export function AIInsightsCard({ insights }: AIInsightsCardProps) {
  return (
    <Card className="rounded-xl shadow-sm border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI-Powered Insights
          <Badge className="bg-purple-100 text-purple-700 text-xs">Gemini</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Strength Analysis */}
        {insights.strengthAnalysis && (
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800">{insights.strengthAnalysis}</p>
            </div>
          </div>
        )}

        {/* Weakness Strategy */}
        {insights.weaknessStrategy && (
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">{insights.weaknessStrategy}</p>
            </div>
          </div>
        )}

        {/* Key Recommendations */}
        {insights.keyRecommendations && insights.keyRecommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Key Recommendations</p>
            <ul className="space-y-1.5">
              {insights.keyRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="bg-purple-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Motivational Message */}
        {insights.motivationalMessage && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-purple-900">
              💪 {insights.motivationalMessage}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
