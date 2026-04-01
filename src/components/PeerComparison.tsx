import React, { useState, useEffect } from 'react';
import { TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PeerComparison: React.FC = () => {
  const { user } = useAuth();
  const [percentile, setPercentile] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    calculatePercentile();
  }, [user?.id]);

  const calculatePercentile = async () => {
    try {
      // Get my points
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', user!.id)
        .single();

      if (!myProfile) return;
      const myPoints = myProfile.total_points || 0;

      // Count users below me and total users (scalable — no full table fetch)
      const [{ count: belowMe }, { count: totalActive }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('total_points', 0)
          .lt('total_points', myPoints),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('total_points', 0),
      ]);

      if (!totalActive || totalActive === 0) return;
      const pct = Math.round(((belowMe || 0) / totalActive) * 100);
      setPercentile(pct);
    } catch {
      // silent
    }
  };

  if (percentile === null || percentile < 1) return null;

  const getMessage = () => {
    if (percentile >= 90) return { text: `Top ${100 - percentile}%! You're a legend! 🏆`, color: 'text-emerald-600 dark:text-emerald-400' };
    if (percentile >= 75) return { text: `Better than ${percentile}% of students! 🌟`, color: 'text-green-600 dark:text-green-400' };
    if (percentile >= 50) return { text: `Ahead of ${percentile}% of peers! 💪`, color: 'text-blue-600 dark:text-blue-400' };
    return { text: `Keep going! Beat more students! 🚀`, color: 'text-orange-600 dark:text-orange-400' };
  };

  const msg = getMessage();

  return (
    <div className="rounded-xl p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border border-indigo-200 dark:border-indigo-800">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
          <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${msg.color}`}>{msg.text}</p>
          <div className="w-full bg-indigo-100 dark:bg-indigo-900 rounded-full h-1.5 mt-1">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
              style={{ width: `${percentile}%` }}
            />
          </div>
        </div>
        <TrendingUp className="h-4 w-4 text-indigo-500 flex-shrink-0" />
      </div>
    </div>
  );
};

export default PeerComparison;
