import React from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface ShareButtonProps {
  variant?: 'default' | 'compact';
  className?: string;
}

const ShareButton = ({ variant = 'default', className = '' }: ShareButtonProps) => {
  const shareData = {
    title: 'JEEnie — AI-Powered JEE/NEET Prep',
    text: '🚀 I\'m using JEEnie to prepare for JEE/NEET with 70,000+ questions, AI doubt solver & smart study planner. Try it free!',
    url: 'https://jeenie.website',
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          fallbackCopy();
        }
      }
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`).then(() => {
      toast({ title: 'Link copied!', description: 'Share it with your friends 🎉' });
    }).catch(() => {
      toast({ title: 'Share this link', description: shareData.url });
    });
  };

  if (variant === 'compact') {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleShare}
        className={`gap-1.5 text-xs ${className}`}
      >
        <Share2 className="h-3 w-3" />
        Share
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handleShare}
      className={`bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg gap-2 text-xs sm:text-sm ${className}`}
    >
      <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      Share with Friends
    </Button>
  );
};

export default ShareButton;
