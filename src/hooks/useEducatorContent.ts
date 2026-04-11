import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { prepareSimulationUploadFile } from '@/lib/simulationPipeline';

// Uploads a file directly via native fetch, bypassing the Supabase client's
// 15-second fetchWithTimeout wrapper which kills large file uploads.
async function nativeStorageUpload(
  supabaseUrl: string,
  token: string,
  bucket: string,
  path: string,
  file: File,
): Promise<void> {
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
  const res = await window.fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Let the browser set Content-Type with boundary for form data,
      // or set explicitly for plain files:
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); msg = j.message ?? j.error ?? msg; } catch { /* ignore */ }
    if (msg.includes('22P02')) {
      msg = 'Upload blocked by database policy (22P02). Run the storage RLS fix SQL and retry.';
    }
    throw new Error(msg);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeChapterId(chapterId?: string | null): string | null {
  if (!chapterId) return null;
  const normalized = chapterId.trim();
  if (!normalized) return null;
  if (!UUID_RE.test(normalized)) {
    throw new Error('Invalid chapter selected. Please reselect chapter and try again.');
  }
  return normalized;
}

export interface EducatorContentItem {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  grade: number;
  chapter_id: string | null;
  content_type: 'presentation' | 'simulation';
  file_path: string | null;
  embed_url: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  uploaded_by: string;
  created_at: string;
  original_filename: string | null;
  display_order: number;
}

export interface UploadPresentationInput {
  title: string;
  description?: string;
  subject: string;
  grade: number;
  chapter_id?: string;
  file: File;
  original_filename?: string;
}

export interface AddSimulationInput {
  title: string;
  description?: string;
  subject: string;
  grade: number;
  chapter_id?: string;
  embed_url?: string;
  file?: File;
  original_filename?: string;
}

const BUCKET = 'educator-content';

export function useEducatorContent() {
  const [items, setItems] = useState<EducatorContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContent = useCallback(
    async (filters: { grade?: number; subject?: string; content_type?: 'presentation' | 'simulation' } = {}) => {
      setLoading(true);
      try {
        let query = supabase
          .from('educator_content')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (filters.grade) query = query.eq('grade', filters.grade);
        if (filters.subject) query = query.eq('subject', filters.subject);
        if (filters.content_type) query = query.eq('content_type', filters.content_type);

        const { data, error } = await query;
        if (error) throw error;
        setItems((data as EducatorContentItem[]) || []);
        return (data as EducatorContentItem[]) || [];
      } catch (err) {
        logger.error('fetchContent error:', err);
        toast.error('Failed to load content');
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getSignedUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      logger.error('getSignedUrl error:', err);
      toast.error('Failed to get secure link');
      return null;
    }
  }, []);

  const uploadPresentation = useCallback(async (input: UploadPresentationInput): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not authenticated — please refresh and try again');

      const rawUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!rawUrl) throw new Error('VITE_SUPABASE_URL is not configured');
      const supabaseUrl = (rawUrl as string).replace(/\/$/, '');
      
      const ext = input.file.name.split('.').pop() ?? 'pdf';
      
      // Generate descriptive filename similar to simulations
      const sanitizedOriginal = input.file.name
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[^a-z0-9_-]/gi, '_')
        .toLowerCase()
        .slice(0, 50);
      
      const timestamp = Date.now();
      const fileType = ext.toUpperCase(); // PDF, PPT, PPTX
      
      // Naming format: original-filename-PDF-timestamp.pdf
      // Example: physics_notes-PDF-1707123456.pdf
      const storagePath = `presentations/${sessionData.session.user.id}/${sanitizedOriginal}-${fileType}-${timestamp}.${ext}`;

      // Use native window.fetch to bypass the 15-second fetchWithTimeout in the Supabase client
      await nativeStorageUpload(supabaseUrl, token, BUCKET, storagePath, input.file);

      const { error: insertError } = await supabase.from('educator_content').insert({
        title: input.title,
        description: input.description ?? null,
        subject: input.subject.toLowerCase(),
        grade: input.grade,
        chapter_id: normalizeChapterId(input.chapter_id),
        content_type: 'presentation',
        is_active: true,
        file_path: storagePath,
        embed_url: null,
        original_filename: input.original_filename ?? input.file.name,
        uploaded_by: sessionData.session.user.id,
      });
      if (insertError) {
        // Best-effort cleanup of orphaned file
        await window.fetch(
          `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
        ).catch(() => {});
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      toast.success('Presentation uploaded successfully');
      return true;
    } catch (err: any) {
      logger.error('uploadPresentation error:', err);
      toast.error(err?.message ?? 'Failed to upload presentation');
      return false;
    }
  }, []);

  const addSimulation = useCallback(async (input: AddSimulationInput): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not authenticated — please refresh and try again');

      const rawUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!rawUrl) throw new Error('VITE_SUPABASE_URL is not configured');
      const supabaseUrl = (rawUrl as string).replace(/\/$/, '');
      let storagePath: string | null = null;

      const normalizedChapterId = normalizeChapterId(input.chapter_id);
      let originalFilename: string | null = input.original_filename ?? input.file?.name ?? null;

      if (input.file) {
        const uploadFile = await prepareSimulationUploadFile(input.file);
        const ext = uploadFile.name.split('.').pop() ?? 'html';
        
        // Generate descriptive filename: originalname-componenttype-timestamp
        const originalExt = input.file.name.split('.').pop() ?? 'jsx';
        const sanitizedOriginal = input.file.name
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[^a-z0-9_-]/gi, '_')
          .toLowerCase()
          .slice(0, 50);
        
        const timestamp = Date.now();
        const componentType = originalExt.toUpperCase(); // JSX, TSX, JS
        
        // Naming format: original-filename-JSX-timestamp.html
        // Example: quantum_mechanics_jsx-1707123456.html
        storagePath = `simulations/${sessionData.session.user.id}/${sanitizedOriginal}-${componentType}-${timestamp}.${ext}`;
        
        await nativeStorageUpload(supabaseUrl, token, BUCKET, storagePath, uploadFile);
        originalFilename = input.original_filename ?? input.file.name;
      }

      const { error: insertError } = await supabase.from('educator_content').insert({
        title: input.title,
        description: input.description ?? null,
        subject: input.subject.toLowerCase(),
        grade: input.grade,
        chapter_id: normalizedChapterId,
        content_type: 'simulation',
        is_active: true,
        file_path: storagePath,
        embed_url: input.embed_url ?? null,
        original_filename: originalFilename,
        uploaded_by: sessionData.session.user.id,
      });
      if (insertError) {
        if (storagePath) {
          await window.fetch(
            `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
          ).catch(() => {});
        }
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      toast.success('Simulation added successfully');
      return true;
    } catch (err: any) {
      logger.error('addSimulation error:', err);
      toast.error(err?.message ?? 'Failed to add simulation');
      return false;
    }
  }, []);

  const deleteContent = useCallback(async (item: EducatorContentItem): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Check user role using user_roles table (more reliable)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const userRole = roleData?.role || sessionData.session?.user?.user_metadata?.account_type;
      const isAdmin = userRole === 'admin' || userRole === 'super_admin';

      // Only allow deleting if:
      // 1. User is admin, OR
      // 2. User is the one who uploaded it, OR
      // 3. uploaded_by is null (legacy old animations)
      if (!isAdmin && item.uploaded_by && item.uploaded_by !== userId) {
        throw new Error('You can only delete content you uploaded');
      }

      // Hard delete from DB to completely remove old animations
      const { error: dbError } = await supabase
        .from('educator_content')
        .delete()
        .eq('id', item.id);
      
      if (dbError) throw dbError;

      // Delete from storage if it's a file-based content
      if (item.file_path) {
        const rawUrl = import.meta.env.VITE_SUPABASE_URL;
        const token = sessionData.session?.access_token;
        if (rawUrl && token) {
          const supabaseUrl = (rawUrl as string).replace(/\/$/, '');
          await window.fetch(
            `${supabaseUrl}/storage/v1/object/educator-content/${item.file_path}`,
            { 
              method: 'DELETE', 
              headers: { Authorization: `Bearer ${token}` } 
            },
          ).catch((err) => logger.warn('File deletion failed:', err));
        }
      }

      toast.success('Content removed');
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      return true;
    } catch (err) {
      logger.error('deleteContent error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to remove content');
      return false;
    }
  }, []);

  return {
    items,
    loading,
    fetchContent,
    getSignedUrl,
    uploadPresentation,
    addSimulation,
    deleteContent,
  };
}
