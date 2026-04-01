import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
const CODE_EXT_RE = /\.(jsx?|tsx?)$/i;

type RenderPayload = {
  src: string;
  srcDoc?: string;
};

function toBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64Utf8(value: string): string {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function extractLegacySourceCodeFromHtml(html: string): string | null {
  // Newer runtime payload format
  const payloadMatch = html.match(/(?:const|var)\s+payload\s*=\s*'([^']+)'/);
  if (payloadMatch?.[1]) {
    try {
      return fromBase64Utf8(payloadMatch[1]);
    } catch {
      // fall through
    }
  }

  // Older template-literal wrapper format
  const sourceCodeMatch = html.match(/const\s+sourceCode\s*=\s*`([\s\S]*?)`;/);
  if (sourceCodeMatch?.[1]) {
    return sourceCodeMatch[1]
      .replace(/\\`/g, '`')
      .replace(/\\\$\{/g, '${')
      .replace(/\\\\/g, '\\');
  }

  return null;
}

function buildExecutableHtmlFromCode(title: string, code: string): string {
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const payload = toBase64Utf8(code);

  // Auto-detect optional libraries referenced in the simulation source
  const needsP5    = /\bnew\s+p5\s*\(|\bp5\s*\(\s*(?:function|\()/.test(code);
  const needsChart = /\bnew\s+Chart\s*\(/.test(code);
  const extraScripts = [
    needsP5    ? '    <script src="https://unpkg.com/p5@1.9.4/lib/p5.min.js"></script>' : '',
    needsChart ? '    <script src="https://unpkg.com/chart.js@4.4.0/dist/chart.umd.min.js"></script>' : '',
  ].filter(Boolean).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Saira:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; overflow: hidden; font-family: 'Saira', system-ui, sans-serif; }
      #sim-root { width: 100%; height: 100%; font-family: 'Saira', system-ui, sans-serif; }
      .sim-error { font: 14px/1.5 'Saira', system-ui, sans-serif; color: #b91c1c; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; margin: 16px; white-space: pre-wrap; max-height: 90vh; overflow: auto; }
    </style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
${extraScripts}
  </head>
  <body>
    <div id="sim-root"></div>
    <script>
      (function () {
        var root = document.getElementById('sim-root');
        window.simRoot = root;
        window.canvas = root;

        var payload = '${payload}';
        var bytes = Uint8Array.from(atob(payload), function(c) { return c.charCodeAt(0); });
        var source = new TextDecoder().decode(bytes);
        try {
          // 1. Capture the component name from export default before stripping
          var exportMatch = source.match(/export\\s+default\\s+(?:function|class)\\s+(\\w+)/);
          var exportedName = exportMatch ? exportMatch[1] : null;

          // 2. Also look for standalone "function App" or similar patterns
          var allFnNames = [];
          var fnRegex = /(?:^|\\n)\\s*(?:export\\s+default\\s+)?function\\s+(\\w+)/g;
          var m;
          while ((m = fnRegex.exec(source)) !== null) allFnNames.push(m[1]);

          // 3. Strip imports and exports
          var normalizedSource = source
            .replace(/^\\uFEFF/, '')
            .replace(/import\\s*\\{[\\s\\S]*?\\}\\s*from\\s*['"][^'"]*['"];?/g, '')
            .replace(/^\\s*import\\s+[^;]+;?\\s*$/gm, '')
            .replace(/^\\s*export\\s+default\\s+/gm, '')
            .replace(/^\\s*export\\s+\\{[^}]*\\};?\\s*$/gm, '')
            .replace(/^\\s*export\\s+(const|function|class)\\s+/gm, '$1 ');

          // 4. Inject React hook destructuring + createElement alias
          var hookPrefix = [
            'var { useState, useEffect, useRef, useCallback, useMemo, useReducer, useContext, createContext, forwardRef, Fragment, memo, createElement } = React;',
            'var { createRoot } = ReactDOM;',
            ''
          ].join('\\n');

          // 5. Build alias suffix - try exported name first, then scan for App/Simulation
          var candidateNames = [];
          if (exportedName) candidateNames.push(exportedName);
          candidateNames = candidateNames.concat(allFnNames.filter(function(n) { return n !== exportedName; }));
          // Prioritize: App > Simulation > exported name > first function
          var orderedCandidates = ['App', 'Simulation'];
          if (exportedName && orderedCandidates.indexOf(exportedName) === -1) orderedCandidates.push(exportedName);
          allFnNames.forEach(function(n) { if (orderedCandidates.indexOf(n) === -1) orderedCandidates.push(n); });

          var aliasSuffix = '\\n;var __SIM_CANDIDATES__ = {};\\n';
          orderedCandidates.forEach(function(n) {
            aliasSuffix += 'try { if (typeof ' + n + ' === "function") __SIM_CANDIDATES__["' + n + '"] = ' + n + '; } catch(e) {}\\n';
          });

          var transformed = Babel.transform(hookPrefix + normalizedSource + aliasSuffix, {
            presets: ['react', 'typescript'],
            sourceType: 'script',
            filename: 'simulation.tsx',
          }).code;

          var runner = new Function(
            'React', 'ReactDOM', 'window', 'document', 'root',
            transformed + '\\nreturn __SIM_CANDIDATES__;'
          );
          var candidates = runner(window.React, window.ReactDOM, window, document, root) || {};

          // Pick the best candidate
          var Candidate = candidates['App'] || candidates['Simulation'] || candidates[exportedName] || null;
          if (!Candidate) {
            // Fallback: pick the first available candidate
            var keys = Object.keys(candidates);
            if (keys.length > 0) Candidate = candidates[keys[0]];
          }
          // Also check window globals
          if (!Candidate) Candidate = window.App || window.Simulation;

          if (typeof Candidate === 'function') {
            window.ReactDOM.createRoot(root).render(window.React.createElement(Candidate));
            return;
          }

          // Maybe it rendered directly to root via vanilla JS
          if (root && root.childElementCount > 0) return;

          throw new Error('No mountable component found. Functions scanned: ' + (allFnNames.join(', ') || 'none') + '. Exported: ' + (exportedName || 'none'));
        } catch (e) {
          try {
            // Plain JS fallback for non-React simulation scripts
            var stripped = source
              .replace(/import\\s+[^;]+;?/g, '')
              .replace(/export\\s+default\\s+/g, '')
              .replace(/export\\s+\\{[^}]*\\};?/g, '');
            var fallback = new Function('window', 'document', 'root', stripped);
            fallback(window, document, root);
            if (root && root.childElementCount > 0) return;
          } catch (ignored) {}

          var msg = e && e.message ? e.message : 'Script execution failed';
          if (e && e.stack) msg += '\\n\\nStack:\\n' + e.stack.split('\\n').slice(0, 5).join('\\n');
          root.innerHTML = '<div class="sim-error"><strong>Simulation execution error</strong><br />' + msg + '</div>';
        }
      })();
    </script>
  </body>
</html>`;
}



async function resolveRenderableSrc(item: EducatorContentItem, signedUrl: string): Promise<RenderPayload> {
  const pathRef = `${item.file_path ?? ''} ${item.original_filename ?? ''}`;
  const likelyCode = CODE_EXT_RE.test(pathRef);
  const likelyHtml = /\.(html?)$/i.test(pathRef);
  if (!likelyCode && !likelyHtml) return { src: signedUrl };

  try {
    const res = await window.fetch(signedUrl, { cache: 'no-store' });
    if (!res.ok) return { src: signedUrl };
    const text = await res.text();
    if (!text.trim()) return { src: signedUrl };

    const looksHtml = /^\s*<!doctype html|^\s*<html/i.test(text);
    // For known simulation file types, always normalize to executable HTML so we avoid
    // incorrect content-type responses and legacy raw-code files being shown as text.
    if (likelyCode || likelyHtml) {
      let html = looksHtml ? text : buildExecutableHtmlFromCode(item.title, text);

      // Legacy converted HTML could be syntactically broken; extract original code and rebuild.
      if (looksHtml) {
        const extractedSource = extractLegacySourceCodeFromHtml(text);
        if (extractedSource?.trim()) {
          html = buildExecutableHtmlFromCode(item.title, extractedSource);
        }
      }

      // If we cannot recover embedded source from HTML, fall back to direct URL load.
      // This avoids parsing malformed legacy wrappers via srcDoc.
      if (looksHtml && !extractLegacySourceCodeFromHtml(text)) {
        return { src: signedUrl };
      }

      return { src: '', srcDoc: html };
    }

    return { src: signedUrl };
  } catch {
    return { src: signedUrl };
  }
}

const EducatorGames: React.FC = () => {
  const { items, loading, fetchContent, getSignedUrl } = useEducatorContent();

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState<EducatorContentItem | null>(null);
  const [viewerSrc, setViewerSrc] = useState('');
  const [viewerDoc, setViewerDoc] = useState<string | undefined>(undefined);
  const [fullscreenAnimation, setFullscreenAnimation] = useState<EducatorContentItem | null>(null);
  const [brandLogoBroken, setBrandLogoBroken] = useState(false);
  const [fullscreenSrc, setFullscreenSrc] = useState('');
  const [fullscreenDoc, setFullscreenDoc] = useState<string | undefined>(undefined);

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
      payload = await resolveRenderableSrc(item, url);
    }
    setViewerItem(item);
    setViewerSrc(payload.src);
    setViewerDoc(payload.srcDoc);
    setViewerOpen(true);
  };

  const openFullscreen = async (item: EducatorContentItem) => {
    let payload: RenderPayload = { src: item.embed_url ?? '' };
    if (!payload.src && item.file_path) {
      const url = await getSignedUrl(item.file_path);
      if (!url) return;
      payload = await resolveRenderableSrc(item, url);
    }
    setFullscreenAnimation(item);
    setFullscreenSrc(payload.src);
    setFullscreenDoc(payload.srcDoc);
  };

  return (
    <div className="space-y-6">
      {/* Fullscreen overlay */}
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
            <Button size="sm" variant="ghost" onClick={() => { setFullscreenAnimation(null); setFullscreenSrc(''); setFullscreenDoc(undefined); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" /> Exit Fullscreen
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            {fullscreenSrc || fullscreenDoc ? (
              <SimulationViewer src={fullscreenSrc} srcDoc={fullscreenDoc} title={fullscreenAnimation.title} hideHeader={!!fullscreenDoc} onClose={() => { setFullscreenAnimation(null); setFullscreenSrc(''); setFullscreenDoc(undefined); }} className="h-full" />
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
            setViewerDoc(undefined);
          }
        }}
      >
        <DialogContent className="max-w-5xl w-full p-0 overflow-hidden" style={{ maxHeight: '95vh' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>{viewerItem?.title ?? 'Interactive Animation'}</DialogTitle>
            <DialogDescription>Interactive simulation viewer</DialogDescription>
          </DialogHeader>
          {viewerSrc || viewerDoc ? (
            <SimulationViewer src={viewerSrc} srcDoc={viewerDoc} title={viewerItem?.title ?? 'Interactive Animation'} hideHeader={!!viewerDoc} onClose={() => { setViewerOpen(false); setViewerSrc(''); setViewerDoc(undefined); }} />
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
