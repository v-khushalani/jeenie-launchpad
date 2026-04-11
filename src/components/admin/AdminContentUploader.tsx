import React, { useState, useRef } from 'react';
import { Cloud, FileText, Zap, CheckCircle2, AlertCircle, Loader2, Plus, X } from 'lucide-react';
import { useEducatorContent } from '@/hooks/useEducatorContent';

interface UploadFormData {
  title: string;
  description: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology' | '';
  grade: number | '';
  contentType: 'simulation' | 'presentation' | '';
  file: File | null;
}

export const AdminContentUploader: React.FC = () => {
  const { addSimulation, uploadPresentation } = useEducatorContent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    subject: '',
    grade: '',
    contentType: '',
    file: null,
  });

  const [uploadState, setUploadState] = useState<{
    isLoading: boolean;
    progress: number;
    status: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
  }>({
    isLoading: false,
    progress: 0,
    status: 'idle',
    message: '',
  });

  const [dragActive, setDragActive] = useState(false);

  const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology'] as const;
  const GRADES = [8, 9, 10, 11, 12] as const;
  const ACCEPTED_EXTENSIONS = {
    simulation: ['.jsx', '.tsx', '.js'],
    presentation: ['.pdf', '.ppt', '.pptx'],
  };

  // ===== FILE VALIDATION =====
  const validateFile = (file: File, type: string): { valid: boolean; error?: string } => {
    const validExts =
      type === 'simulation'
        ? ['.jsx', '.tsx', '.js']
        : ['.pdf', '.ppt', '.pptx'];

    const hasValidExt = validExts.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      return {
        valid: false,
        error: `Invalid file type. Accepted: ${validExts.join(', ')}`,
      };
    }

    const maxSize = formData.contentType === 'simulation' ? 2 * 1024 * 1024 : 50 * 1024 * 1024; // 2MB for JSX, 50MB for PDF
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Max: ${maxSize / (1024 * 1024)}MB`,
      };
    }

    return { valid: true };
  };

  // ===== DRAG & DROP HANDLERS =====
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (formData.contentType) {
        const validation = validateFile(file, formData.contentType);
        if (validation.valid) {
          setFormData((prev) => ({ ...prev, file }));
          setUploadState((prev) => ({ ...prev, status: 'idle', message: '' }));
        } else {
          setUploadState((prev) => ({
            ...prev,
            status: 'error',
            message: validation.error || 'Invalid file',
          }));
        }
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateFile(file, formData.contentType);
      if (validation.valid) {
        setFormData((prev) => ({ ...prev, file }));
        setUploadState((prev) => ({ ...prev, status: 'idle', message: '' }));
      } else {
        setUploadState((prev) => ({
          ...prev,
          status: 'error',
          message: validation.error || 'Invalid file',
        }));
      }
    }
  };

  // ===== FORM VALIDATION =====
  const isFormValid = (): boolean => {
    return (
      formData.title.trim().length > 0 &&
      formData.subject !== '' &&
      formData.grade !== '' &&
      formData.contentType !== '' &&
      formData.file !== null
    );
  };

  // ===== SUBMIT HANDLER =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid() || !formData.file) {
      setUploadState({
        isLoading: false,
        progress: 0,
        status: 'error',
        message: 'Please fill all required fields and select a file',
      });
      return;
    }

    setUploadState({
      isLoading: true,
      progress: 0,
      status: 'uploading',
      message: 'Uploading your content...',
    });

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadState((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 30, 90),
        }));
      }, 500);

      if (formData.contentType === 'simulation') {
        await addSimulation({
          title: formData.title,
          description: formData.description,
          subject: formData.subject.toLowerCase(),
          grade: Number(formData.grade),
          file: formData.file,
        });
      } else {
        await uploadPresentation({
          title: formData.title,
          description: formData.description,
          subject: formData.subject.toLowerCase(),
          grade: Number(formData.grade),
          file: formData.file,
        });
      }

      clearInterval(progressInterval);
      setUploadState({
        isLoading: false,
        progress: 100,
        status: 'success',
        message: `${formData.contentType === 'simulation' ? 'Simulation' : 'Presentation'} uploaded successfully!`,
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        subject: '',
        grade: '',
        contentType: '',
        file: null,
      });

      // Auto-close success message
      setTimeout(() => {
        setUploadState({
          isLoading: false,
          progress: 0,
          status: 'idle',
          message: '',
        });
      }, 3000);
    } catch (error) {
      setUploadState({
        isLoading: false,
        progress: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed. Please try again.',
      });
    }
  };

  // ===== RESET FORM =====
  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      subject: '',
      grade: '',
      contentType: '',
      file: null,
    });
    setUploadState({
      isLoading: false,
      progress: 0,
      status: 'idle',
      message: '',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 md:p-12">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* HEADER SECTION */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-8 h-8 text-yellow-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
              Content Manager
            </h1>
            <Zap className="w-8 h-8 text-yellow-400" />
          </div>
          <p className="text-slate-400 text-lg">
            Upload simulations or presentations for educators
          </p>
        </div>

        {/* MAIN CARD */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* CONTENT TYPE SELECTOR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['simulation', 'presentation'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      contentType: type,
                      file: null,
                    }))
                  }
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                    formData.contentType === type
                      ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                      : 'border-slate-600/50 bg-slate-700/20 hover:border-slate-500/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText
                      className={`w-6 h-6 ${
                        formData.contentType === type
                          ? 'text-purple-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <div className="text-left">
                      <div
                        className={`font-semibold capitalize ${
                          formData.contentType === type
                            ? 'text-purple-300'
                            : 'text-slate-300'
                        }`}
                      >
                        {type}
                      </div>
                      <div className="text-sm text-slate-400">
                        {type === 'simulation'
                          ? '.jsx, .tsx, .js'
                          : '.pdf, .ppt'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* TITLE INPUT */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Content Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Quantum Mechanics Simulation"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-slate-100 placeholder-slate-500"
                disabled={uploadState.isLoading}
              />
            </div>

            {/* DESCRIPTION INPUT */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Description <span className="text-slate-500">(optional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Add details about this content..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-slate-100 placeholder-slate-500 resize-none"
                disabled={uploadState.isLoading}
              />
            </div>

            {/* SUBJECT & GRADE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Subject <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subject: e.target.value as UploadFormData['subject'],
                    }))
                  }
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-slate-100"
                  disabled={uploadState.isLoading}
                >
                  <option value="">Select Subject</option>
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Grade Level <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.grade}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      grade: e.target.value === '' ? '' : parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-slate-100"
                  disabled={uploadState.isLoading}
                >
                  <option value="">Select Grade</option>
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* FILE UPLOAD - DRAG & DROP */}
            <div
              ref={dropZoneRef}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative p-8 md:p-12 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer ${
                dragActive
                  ? 'border-purple-400 bg-purple-500/10'
                  : 'border-slate-600/50 bg-slate-700/20 hover:border-slate-500'
              } ${uploadState.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInput}
                className="hidden"
                accept={
                  formData.contentType === 'simulation'
                    ? '.jsx,.tsx,.js'
                    : '.pdf,.ppt,.pptx'
                }
                disabled={uploadState.isLoading || !formData.contentType}
              />

              <div className="flex flex-col items-center justify-center text-center">
                {formData.file ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-green-400 mb-3" />
                    <p className="text-slate-200 font-semibold text-lg">
                      {formData.file.name}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {(formData.file.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData((prev) => ({ ...prev, file: null }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="mt-4 text-red-400 hover:text-red-300 text-sm font-medium transition"
                    >
                      Remove File
                    </button>
                  </>
                ) : (
                  <>
                    <Cloud className="w-12 h-12 text-slate-400 mb-4" />
                    <p className="text-slate-200 font-semibold text-lg mb-2">
                      {formData.contentType
                        ? 'Drop your file here or click to browse'
                        : 'Select a content type first'}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {formData.contentType === 'simulation'
                        ? 'Supported: .jsx, .tsx, .js (Max 2MB)'
                        : formData.contentType === 'presentation'
                          ? 'Supported: .pdf, .ppt, .pptx (Max 50MB)'
                          : 'Choose content type to see file requirements'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* STATUS MESSAGES */}
            {uploadState.message && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  uploadState.status === 'error'
                    ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                    : uploadState.status === 'success'
                      ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                      : 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
                }`}
              >
                {uploadState.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                )}
                {uploadState.status === 'error' && (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                {uploadState.status === 'success' && (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-sm font-medium">{uploadState.message}</span>
              </div>
            )}

            {/* PROGRESS BAR */}
            {uploadState.status === 'uploading' && (
              <div className="space-y-2">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-slate-400">
                  {Math.round(uploadState.progress)}%
                </p>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={!isFormValid() || uploadState.isLoading}
                className="flex-1 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {uploadState.isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Upload Content
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={uploadState.isLoading}
                className="px-8 py-3 bg-slate-700/50 hover:bg-slate-700 disabled:bg-slate-700/30 disabled:cursor-not-allowed text-slate-200 font-semibold rounded-xl transition-all duration-300 border border-slate-600 hover:border-slate-500 disabled:border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>

        {/* INFO SECTION */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: FileText,
              title: 'Simulations',
              desc: 'Upload interactive JSX/TSX components',
            },
            {
              icon: Cloud,
              title: 'Presentations',
              desc: 'Upload PDF or PowerPoint files',
            },
            {
              icon: Zap,
              title: 'Auto-Deploy',
              desc: 'Content instantly available to educators',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-slate-800/30 backdrop-blur border border-slate-700/30 rounded-2xl p-6 text-center hover:border-slate-600/50 transition"
            >
              <item.icon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-200 mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminContentUploader;
