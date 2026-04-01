import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Lightbulb, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { SWOTAnalysis } from '@/lib/studyPlannerTypes';

interface SWOTCardProps {
  swotAnalysis: SWOTAnalysis;
}

export function SWOTCard({ swotAnalysis }: SWOTCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="rounded-xl shadow-sm">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-xl">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              SWOT Analysis
            </CardTitle>
            {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Strengths */}
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-green-800 text-sm">Strengths</h4>
                </div>
                <ul className="space-y-1">
                  {swotAnalysis.strengths.map((item, i) => (
                    <li key={i} className="text-xs text-green-700 flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <h4 className="font-semibold text-red-800 text-sm">Weaknesses</h4>
                </div>
                <ul className="space-y-1">
                  {swotAnalysis.weaknesses.map((item, i) => (
                    <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                      <span className="text-red-500 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Opportunities */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-blue-800 text-sm">Opportunities</h4>
                </div>
                <ul className="space-y-1">
                  {swotAnalysis.opportunities.map((item, i) => (
                    <li key={i} className="text-xs text-blue-700 flex items-start gap-1">
                      <span className="text-blue-500 mt-0.5">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Threats */}
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-amber-800 text-sm">Threats</h4>
                </div>
                <ul className="space-y-1">
                  {swotAnalysis.threats.map((item, i) => (
                    <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                      <span className="text-amber-500 mt-0.5">⚠</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
