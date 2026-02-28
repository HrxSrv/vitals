'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2 } from 'lucide-react';
import { useUploadReport } from '@/lib/hooks/useReports';
import { cn } from '@/lib/utils/cn';

interface UploadButtonProps {
  profileId: string;
  variant?: 'icon' | 'primary';
  label?: string;
}

export function UploadButton({ profileId, variant = 'icon', label }: UploadButtonProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { mutateAsync: upload, isPending } = useUploadReport();

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: isPending,
  });

  const handleUpload = async () => {
    if (!file) return;
    await upload({ file, profileId });
    setFile(null);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger button */}
      {variant === 'primary' ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-colors shadow-lg shadow-primary-500/30"
        >
          <Upload size={18} />
          {label ?? 'Upload Report'}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200"
          aria-label="Upload report"
        >
          <Upload size={15} strokeWidth={2.5} />
          <span>Upload</span>
        </button>
      )}

      {/* Upload modal — always rendered at root level so it's never clipped */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => { setOpen(false); setFile(null); }}
          />
          <div className="relative w-full max-w-[480px] bg-white rounded-3xl p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-semibold">Upload Report</h3>
              <button
                onClick={() => { setOpen(false); setFile(null); }}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drop zone */}
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-border hover:border-primary-300 hover:bg-primary-50/50',
                file && 'border-primary-400 bg-primary-50'
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <Upload size={20} className="text-primary-600" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-xs text-accent-500 hover:underline mt-1"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Upload size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {isDragActive ? 'Drop it here' : 'Drop your PDF here'}
                  </p>
                  <p className="text-xs text-muted-foreground">or tap to browse</p>
                  <p className="text-[10px] text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded-full">
                    PDF only
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || isPending}
              className="w-full mt-5 py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {isPending ? (
                <><Loader2 size={18} className="animate-spin" /> Uploading…</>
              ) : (
                <><Upload size={18} /> Upload Report</>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
