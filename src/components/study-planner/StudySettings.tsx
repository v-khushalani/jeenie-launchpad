import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Settings, Save, Clock, Target } from 'lucide-react';
import { useState } from 'react';
import type { TimeAllocation, TargetExamType } from '@/lib/studyPlannerTypes';

interface StudySettingsProps {
  dailyStudyHours: number;
  targetExam: TargetExamType;
  timeAllocation: TimeAllocation;
  onUpdate: (hours: number, exam: TargetExamType) => void;
}

export function StudySettings({
  dailyStudyHours,
  targetExam,
  timeAllocation,
  onUpdate
}: StudySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(dailyStudyHours);
  const [exam, setExam] = useState<TargetExamType>(targetExam);

  const handleSave = () => {
    onUpdate(hours, exam);
    setIsOpen(false);
  };

  const studyMinutes = Math.round(hours * 60 * timeAllocation.studyTime);
  const revisionMinutes = Math.round(hours * 60 * timeAllocation.revisionTime);
  const mockMinutes = Math.round(hours * 60 * timeAllocation.mockTestTime);

  const getExamDisplayName = (examType: TargetExamType): string => {
    if (examType?.toString().startsWith('Foundation')) return 'Foundation';
    return examType?.toString() || 'JEE';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="rounded-xl shadow-sm">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-xl">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Study Settings
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {dailyStudyHours}h/day • {getExamDisplayName(targetExam)}
              </Badge>
              {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Daily Study Hours
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="w-16 text-center font-semibold text-primary bg-secondary rounded-lg px-2 py-1">
                    {hours}h
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Target Exam
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={exam === 'JEE' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExam('JEE')}
                    className={exam === 'JEE' ? 'bg-primary hover:bg-primary/90' : ''}
                  >
                    JEE
                  </Button>
                  <Button
                    variant={exam === 'NEET' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExam('NEET')}
                    className={exam === 'NEET' ? 'bg-primary hover:bg-primary/90' : ''}
                  >
                    NEET
                  </Button>
                  <Button
                    variant={exam?.toString().startsWith('Foundation') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExam('Foundation')}
                    className={exam?.toString().startsWith('Foundation') ? 'bg-primary hover:bg-primary/90' : ''}
                  >
                    Foundation
                  </Button>
                  <Button
                    variant={exam === 'Scholarship' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExam('Scholarship')}
                    className={exam === 'Scholarship' ? 'bg-primary hover:bg-primary/90' : ''}
                  >
                    Scholarship
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Daily Time Allocation</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  📚 Study: {studyMinutes}m
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  🔄 Revision: {revisionMinutes}m
                </Badge>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                  📝 Mock: {mockMinutes}m
                </Badge>
              </div>
            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save & Regenerate Plan
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
