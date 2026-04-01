import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, Share2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ReferralService from "@/services/referralService";
import { toast } from "sonner";

const ReferralCard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    totalReferrals: number;
    completedReferrals: number;
    weeksEarned: number;
    referralCode: string;
    referralLink: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.id) {
      ReferralService.getReferralStats(user.id).then(setStats);
    }
  }, [user?.id]);

  const handleCopy = async () => {
    if (!stats) return;
    try {
      await navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      toast.success("Referral link copied! 🎉");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleShare = async () => {
    if (!stats) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join JEEnie — AI-Powered Learning",
          text: "Mere referral se join kar! JEE/NEET prep ke liye best AI platform 🚀",
          url: stats.referralLink,
        });
      } catch {
        // Native share was cancelled by the user.
      }
    } else {
      handleCopy();
    }
  };

  if (!stats) return null;

  return (
    <Card className="rounded-xl shadow-sm border border-amber-200 bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-yellow-50/80">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex-shrink-0">
            <Gift className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">Refer & Earn 🎁</h3>
            <p className="text-xs text-amber-700/80">Har referral pe 7 din Pro free!</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-white/60 rounded-lg">
            <div className="text-lg font-bold text-amber-700">{stats.completedReferrals}</div>
            <div className="text-[10px] text-amber-600">Joined</div>
          </div>
          <div className="text-center p-2 bg-white/60 rounded-lg">
            <div className="text-lg font-bold text-amber-700">{stats.weeksEarned}</div>
            <div className="text-[10px] text-amber-600">Weeks Earned</div>
          </div>
          <div className="text-center p-2 bg-white/60 rounded-lg">
            <div className="text-lg font-bold text-amber-700">{4 - stats.completedReferrals}</div>
            <div className="text-[10px] text-amber-600">Left</div>
          </div>
        </div>

        {/* Referral Code */}
        <div className="flex items-center gap-2 mb-3 bg-white/70 rounded-lg p-2 border border-amber-200">
          <code className="flex-1 text-xs font-mono font-bold text-amber-800 truncate">
            {stats.referralCode}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-amber-700 hover:bg-amber-100"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Share Button */}
        <Button
          onClick={handleShare}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold h-9"
        >
          <Share2 className="h-3.5 w-3.5 mr-1.5" />
          Share & Earn Pro
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
