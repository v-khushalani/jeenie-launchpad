import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import JeenieMathTugOfWar from './JeenieMathTugOfWar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Sparkles, Loader2, Play, Link2, Upload, Search, Maximize2, X, ShieldCheck,
} from 'lucide-react';
import SimulationViewer from './SimulationViewer';
import { useEducatorContent, EducatorContentItem } from '@/hooks/useEducatorContent';

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

type RenderPayload = {
  src: string;
}

const EducatorGames: React.FC = () => {
  const { items, loading, fetchContent, getSignedUrl } = useEducatorContent();

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState<EducatorContentItem | null>(null);
  const [viewerSrc, setViewerSrc] = useState('');
  const [fullscreenAnimation, setFullscreenAnimation] = useState<EducatorContentItem | null>(null);
  const [fullscreenSrc, setFullscreenSrc] = useState('');
  const [fullscreenClassroomGame, setFullscreenClassroomGame] = useState(false);

  useEffect(() => {
    fetchContent({ content_type: 'simulation' });
  }, [fetchContent]);

  const filteredItems = React.useMemo(() => {
    let result = items;
    if (subjectFilter) result = result.filter((i) => i.subject === subjectFilter.toLowerCase());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.title.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q));
    }
    return result;
  }, [items, subjectFilter, searchQuery]);

  const grouped = React.useMemo(() => {
    const g: Record<string, EducatorContentItem[]> = {};
    for (const item of filteredItems) {
      if (!g[item.subject]) g[item.subject] = [];
      g[item.subject].push(item);
    }
    return g;
  }, [filteredItems]);

  const openAnimation = async (item: EducatorContentItem) => {
    let payload: RenderPayload = { src: item.embed_url ?? '' };
    if (!payload.src && item.file_path) {
      const url = await getSignedUrl(item.file_path);
      if (!url) return;
      payload = { src: url };
    }
    setViewerItem(item);
    setViewerSrc(payload.src);
    setViewerOpen(true);
  };

  const openFullscreen = async (item: EducatorContentItem) => {
    let payload: RenderPayload = { src: item.embed_url ?? '' };
    if (!payload.src && item.file_path) {
      const url = await getSignedUrl(item.file_path);
      if (!url) return;
      payload = { src: url };
    }
    setFullscreenAnimation(item);
    setFullscreenSrc(payload.src);
  };

  return (
    <div className="space-y-6">
      {fullscreenClassroomGame && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground truncate">JEEnie Math Tug of War</span>
                <Badge className="text-[10px] bg-primary text-primary-foreground hover:bg-primary/90">Built-in Game</Badge>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setFullscreenClassroomGame(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" /> Exit Fullscreen
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3">
            <JeenieMathTugOfWar fullscreen />
          </div>
        </div>
      )}

      {fullscreenAnimation && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground truncate">{fullscreenAnimation.title}</span>
                <Badge className="text-[10px] bg-primary text-primary-foreground hover:bg-primary/90">Interactive Animation</Badge>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setFullscreenAnimation(null); setFullscreenSrc(''); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" /> Exit Fullscreen
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            {fullscreenSrc ? (
              <SimulationViewer src={fullscreenSrc} title={fullscreenAnimation.title} onClose={() => { setFullscreenAnimation(null); setFullscreenSrc(''); }} className="h-full" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-3">
                  <Sparkles className="h-16 w-16 mx-auto text-primary/30" />
                  <p className="text-lg font-medium">Interactive Animation Placeholder</p>
                  <p className="text-sm">The animation will load here when a source URL is configured.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab label is already shown in dashboard header; avoid duplicate page title here. */}
      <div>
        <p className="text-muted-foreground text-sm mt-1">
          Interactive animations for smartboard teaching
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">JEEnie Games</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow group border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" /> Built-in
                </Badge>
              </div>
              <CardTitle className="text-sm leading-snug">Math Tug of War</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                Team-vs-team classroom battle. Launch in fullscreen for smartboard fun.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2 mt-2">
                <Button
                  className="flex-1 bg-slate-900 border-b-4 border-slate-950 hover:bg-slate-800 hover:border-slate-900 text-white shadow-sm transition-all active:border-b-0 active:translate-y-1 rounded-xl font-bold h-10 px-4"
                  onClick={() => setFullscreenClassroomGame(true)}
                >
                  <Play className="h-4 w-4 mr-2" /> Launch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search animations…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Subject:</Label>
          <Select value={subjectFilter || 'all'} onValueChange={(v) => setSubjectFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {SUBJECTS.map((s) => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Sparkles className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery || subjectFilter ? 'No animations match your search.' : 'No interactive animations available yet.'}
            </p>
            <p className="text-xs text-muted-foreground">Ask your admin to add content.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([subject, anims]) => (
            <div key={subject}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{subject.charAt(0).toUpperCase() + subject.slice(1)}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {anims.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow group">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        {item.embed_url ? (
                          <Badge variant="secondary" className="text-xs gap-1"><Link2 className="h-3 w-3" /> Embedded</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1"><Upload className="h-3 w-3" /> Custom</Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm leading-snug">{item.title}</CardTitle>
                      {item.description && <CardDescription className="text-xs line-clamp-2">{item.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-2 mt-2">
                        <Button
                          className="flex-1 bg-slate-900 border-b-4 border-slate-950 hover:bg-slate-800 hover:border-slate-900 text-white shadow-sm transition-all active:border-b-0 active:translate-y-1 rounded-xl font-bold h-10 px-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFullscreen(item);
                          }}
                        >
                          <Play className="h-4 w-4 mr-2" /> Launch
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Animation Viewer (windowed) */}
      <Dialog
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open) {
            setViewerSrc('');
          }
        }}
      >
        <DialogContent className="max-w-5xl w-full p-0 overflow-hidden" style={{ maxHeight: '95vh' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>{viewerItem?.title ?? 'Interactive Animation'}</DialogTitle>
            <DialogDescription>Interactive simulation viewer</DialogDescription>
          </DialogHeader>
          {viewerSrc ? (
            <SimulationViewer src={viewerSrc} title={viewerItem?.title ?? 'Interactive Animation'} onClose={() => { setViewerOpen(false); setViewerSrc(''); }} />
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              <div className="text-center space-y-3">
                <Sparkles className="h-16 w-16 mx-auto text-primary/30" />
                <p className="text-lg font-medium">Interactive Animation Placeholder</p>
                <p className="text-sm">Configure a source URL to load the animation here.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EducatorGames;
