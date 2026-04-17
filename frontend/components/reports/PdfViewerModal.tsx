'use client';

import { useEffect, useState } from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
}

/**
 * Renders a PDF report.
 * - Desktop (≥ lg): inline via <object>, which Chrome/Firefox/Safari render natively.
 * - Mobile/tablet (< lg): a CTA screen that hands off to the OS's native PDF
 *   handler (new tab for iOS Safari / Chrome Android = full-screen native
 *   viewer), or downloads to Files. This matches how banking, health and
 *   document apps treat PDFs on phones — custom in-page viewers perform
 *   worse and lose the user's preferred PDF app features.
 */
export function PdfViewerModal({ isOpen, onClose, pdfUrl, fileName }: PdfViewerModalProps) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [isInlineLoading, setIsInlineLoading] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const apply = () => setIsDesktop(mql.matches);
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);

  // Reset inline loader when opening a new file.
  useEffect(() => {
    if (!isOpen) {
      setIsInlineLoading(true);
      return;
    }
    // Some desktop browsers don't fire onLoad reliably; clear after 3s.
    const t = setTimeout(() => setIsInlineLoading(false), 3000);
    return () => clearTimeout(t);
  }, [isOpen, pdfUrl]);

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-6xl h-[90vh] p-0 flex flex-col" showCloseButton={false}>
        <DialogHeader className="p-4 border-b border-gray-200">
          <DialogTitle className="truncate flex-1 pr-12">{fileName}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 relative bg-gray-100 overflow-hidden">
          {isDesktop === null ? (
            <Spinner label="Loading…" />
          ) : isDesktop ? (
            <>
              {isInlineLoading && <Spinner label="Loading PDF…" />}
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full"
                onLoad={() => setIsInlineLoading(false)}
              >
                <MobileFallback
                  pdfUrl={pdfUrl}
                  fileName={fileName}
                  onDownload={handleDownload}
                />
              </object>
            </>
          ) : (
            <MobileFallback
              pdfUrl={pdfUrl}
              fileName={fileName}
              onDownload={handleDownload}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-10">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function MobileFallback({
  pdfUrl,
  fileName,
  onDownload,
}: {
  pdfUrl: string;
  fileName: string;
  onDownload: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center">
        <FileText size={36} className="text-primary-600" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Health report
        </h3>
        <p className="text-sm text-muted-foreground break-all max-w-xs">{fileName}</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-xl transition-colors"
        >
          <ExternalLink size={16} />
          Open PDF
        </a>
        <button
          onClick={onDownload}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-foreground bg-background border border-border hover:bg-muted rounded-xl transition-colors"
        >
          <Download size={16} />
          Download
        </button>
      </div>
      <p className="text-xs text-muted-foreground max-w-xs">
        Opens in your device's PDF viewer.
      </p>
    </div>
  );
}
