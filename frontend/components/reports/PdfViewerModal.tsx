'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
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

export function PdfViewerModal({ isOpen, onClose, pdfUrl, fileName }: PdfViewerModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Fallback: clear loader after 3s — mobile browsers don't fire onLoad for <object> PDFs
  useEffect(() => {
    if (!isOpen) { setIsLoading(true); return; }
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [isOpen]);

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
        {/* Header */}
        <DialogHeader className="p-4 border-b border-gray-200">
          <DialogTitle className="truncate flex-1 pr-24">
            {fileName}
          </DialogTitle>
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="lg:hidden flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <Download size={16} />
              Download
            </button>
            <DialogClose className="p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} />
            </DialogClose>
          </div>
        </DialogHeader>

        {/* PDF Viewer */}
        <div className="flex-1 relative bg-gray-100 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
              <p className="text-sm text-muted-foreground">Loading PDF…</p>
            </div>
          )}
          <object
            data={pdfUrl}
            type="application/pdf"
            className="w-full h-full"
            onLoad={() => setIsLoading(false)}
          >
            {/* Fallback for browsers that can't render PDF inline */}
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Your browser can't display this PDF inline.
              </p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                onClick={() => setIsLoading(false)}
              >
                <Download size={16} />
                Open PDF
              </a>
            </div>
          </object>
        </div>
      </DialogContent>
    </Dialog>
  );
}
