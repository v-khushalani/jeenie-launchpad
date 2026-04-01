import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen, RefreshCw, Coffee } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { DailyPlan } from '@/lib/studyPlannerTypes';

interface WeeklyScheduleProps {
  weeklyPlan: DailyPlan[];
}

const timeSlotColors = {
  morning: 'bg-amber-100 text-amber-800 border-amber-200',
  afternoon: 'bg-blue-100 text-blue-800 border-blue-200',
  evening: 'bg-purple-100 text-purple-800 border-purple-200'
};

const taskTypeIcons = {
  study: <BookOpen className="h-3 w-3" />,
  revision: <RefreshCw className="h-3 w-3" />,
  mock_test: <Clock className="h-3 w-3" />,
  rest: <Coffee className="h-3 w-3" />
};

const priorityColors = {
  high: 'border-l-red-500 bg-red-50/50',
  medium: 'border-l-amber-500 bg-amber-50/50',
  low: 'border-l-green-500 bg-green-50/50'
};

export function WeeklySchedule({ weeklyPlan }: WeeklyScheduleProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="rounded-xl shadow-sm">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-xl">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              7-Day Study Schedule
            </CardTitle>
            {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {weeklyPlan.map((day, index) => (
                <div
                  key={day.date}
                  className={`rounded-lg p-3 border ${
                    day.isRestDay ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'
                  } ${index === 0 ? 'ring-2 ring-primary/20' : ''}`}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${index === 0 ? 'text-primary' : 'text-slate-700'}`}>
                      {day.dayName}
                    </span>
                    {index === 0 && (
                      <Badge className="bg-primary text-primary-foreground text-xs px-1.5">Today</Badge>
                    )}
                    {day.isRestDay && (
                      <Badge variant="outline" className="text-xs px-1.5">Rest</Badge>
                    )}
                  </div>

                  {/* Total time */}
                  <p className="text-xs text-slate-500 mb-2">
                    {day.totalMinutes} mins
                  </p>

                  {/* Tasks */}
                  <div className="space-y-1.5">
                    {day.tasks.slice(0, 4).map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        className={`text-xs p-1.5 rounded border-l-2 ${priorityColors[task.priority]}`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          {taskTypeIcons[task.type]}
                          <Badge className={`text-[10px] px-1 py-0 ${timeSlotColors[task.timeSlot]}`}>
                            {task.timeSlot}
                          </Badge>
                        </div>
                        <p className="font-medium text-slate-700 truncate" title={task.topic}>
                          {task.topic}
                        </p>
                        <p className="text-slate-500">{task.duration}m</p>
                      </div>
                    ))}
                    {day.tasks.length > 4 && (
                      <p className="text-xs text-slate-400 text-center">
                        +{day.tasks.length - 4} more
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
