'use client';

import { useState } from 'react';
import { X, Download } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
}

export function PdfViewerModal({ isOpen, onClose, pdfUrl, fileName }: PdfViewerModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-foreground truncate flex-1">
            {fileName}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <Download size={16} />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

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
      </div>
    </div>
  );
}
