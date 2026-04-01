import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  color: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan';
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-500',
    border: 'border-blue-500/20',
  },
  green: {
    bg: 'bg-emerald-500/10',
    icon: 'text-emerald-500',
    border: 'border-emerald-500/20',
  },
  purple: {
    bg: 'bg-violet-500/10',
    icon: 'text-violet-500',
    border: 'border-violet-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    icon: 'text-amber-500',
    border: 'border-amber-500/20',
  },
  rose: {
    bg: 'bg-rose-500/10',
    icon: 'text-rose-500',
    border: 'border-rose-500/20',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    icon: 'text-cyan-500',
    border: 'border-cyan-500/20',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color,
}) => {
  const colors = colorClasses[color];

  const TrendIcon = trend 
    ? trend.value > 0 
      ? TrendingUp 
      : trend.value < 0 
        ? TrendingDown 
        : Minus
    : null;

  return (
    <Card className={cn(
      "border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-card overflow-hidden relative group"
    )}>
      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300", colors.bg)} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-2.5 rounded-xl",
            colors.bg,
            colors.border,
            "border"
          )}>
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
          {trend && TrendIcon && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend.value > 0 ? "text-emerald-600 bg-emerald-500/10" :
              trend.value < 0 ? "text-rose-600 bg-rose-500/10" :
              "text-muted-foreground bg-accent"
            )}>
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        
        <div>
          <p className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{title}</p>
          {trend && (
            <p className="text-xs text-muted-foreground/80 mt-1.5">{trend.label}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface StatsGridProps {
  stats: StatCardProps[];
  loading?: boolean;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="animate-pulse space-y-4">
                <div className="h-10 w-10 bg-accent rounded-xl" />
                <div className="space-y-2">
                  <div className="h-8 w-24 bg-accent rounded" />
                  <div className="h-4 w-20 bg-accent rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default StatsGrid;
