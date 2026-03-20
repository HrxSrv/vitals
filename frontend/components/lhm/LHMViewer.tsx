'use client';

import { useRef, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils/cn';

interface LHMViewerProps {
  markdown: string;
  profileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LHMViewer({ markdown, profileName, isOpen, onClose }: LHMViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const cleanMarkdown = (() => {
    let cleaned = markdown.trim();
    const markdownFenceMatch = cleaned.match(/```markdown\s*\n([\s\S]*?)\n?```/);
    if (markdownFenceMatch) return markdownFenceMatch[1].trim();
    const headingMatch = cleaned.match(/^[\s\S]*?(#\s+[\s\S]+)/);
    if (headingMatch) return headingMatch[1].trim();
    return cleaned;
  })();

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const el = contentRef.current;

      // Expand to full scroll dimensions so overflowing tables aren't clipped
      const prevWidth = el.style.width;
      const prevOverflow = el.style.overflow;
      el.style.width = el.scrollWidth + 'px';
      el.style.overflow = 'visible';

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      el.style.width = prevWidth;
      el.style.overflow = prevOverflow;

      const imgData = canvas.toDataURL('image/png');

      // PDF sized to content — wider than A4 if tables need it, tall enough for all content
      const margin = 12;
      const mmPerPx = 210 / (el.scrollWidth * 2); // scale=2 so multiply by 2
      const pdfWidth = Math.max(210, canvas.width * mmPerPx + margin * 2);
      const usableWidth = pdfWidth - margin * 2;
      const pdfHeight = (canvas.height / canvas.width) * usableWidth + margin * 2;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight] });
      pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, pdfHeight - margin * 2);
      pdf.save(`${profileName}-health-summary.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[480px] sm:max-w-2xl mx-auto bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col animate-fade-up shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Health Summary</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{profileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Download as PDF"
            >
              {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div ref={contentRef}>
            <article className={cn(
              "prose prose-sm max-w-none",
              "prose-headings:font-display prose-headings:font-semibold",
              "prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-0 prose-h1:text-foreground prose-h1:border-b prose-h1:border-border prose-h1:pb-3",
              "prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-foreground prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2",
              "prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-foreground prose-h3:font-semibold",
              "prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-2 prose-h4:text-muted-foreground prose-h4:font-semibold prose-h4:uppercase prose-h4:tracking-wide",
              "prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:my-3",
              "prose-strong:text-foreground prose-strong:font-semibold",
              "prose-em:text-muted-foreground prose-em:italic",
              "prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5",
              "prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5",
              "prose-li:my-1.5 prose-li:text-muted-foreground prose-li:leading-relaxed",
              "prose-table:text-sm prose-table:my-6 prose-table:border-collapse prose-table:w-full prose-table:border prose-table:border-border",
              "prose-thead:border-b-2 prose-thead:border-border prose-thead:bg-muted",
              "prose-th:font-semibold prose-th:text-foreground prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:border prose-th:border-border",
              "prose-tbody:divide-y prose-tbody:divide-border",
              "prose-td:px-4 prose-td:py-2.5 prose-td:text-muted-foreground prose-td:border prose-td:border-border",
              "prose-tr:border-b prose-tr:border-border",
              "prose-code:text-primary-600 prose-code:bg-primary-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
              "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto",
              "prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:my-4",
              "prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline",
              "prose-hr:border-border prose-hr:my-8"
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {cleanMarkdown}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
