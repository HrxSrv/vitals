'use client';

import { X, Download } from 'lucide-react';
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
  if (!isOpen) return null;

  // Clean the markdown by removing:
  // 1. Any text before the first ```markdown fence
  // 2. The ```markdown fence itself
  // 3. The closing ``` fence
  // 4. Any extra whitespace
  const cleanMarkdown = (() => {
    let cleaned = markdown.trim();
    
    // Check if there's a markdown code fence
    const markdownFenceMatch = cleaned.match(/```markdown\s*\n([\s\S]*?)\n?```/);
    if (markdownFenceMatch) {
      // Extract content between the fences
      return markdownFenceMatch[1].trim();
    }
    
    // If no fence, check if there's text before a # heading and remove it
    const headingMatch = cleaned.match(/^[\s\S]*?(#\s+[\s\S]+)/);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
    
    // Otherwise return as-is
    return cleaned;
  })();

  const handleDownload = () => {
    const blob = new Blob([cleanMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profileName}-health-summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-[480px] sm:max-w-2xl mx-auto bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col animate-fade-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Living Health Summary</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{profileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Download as Markdown"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <article className={cn(
            "prose prose-sm max-w-none",
            // Headings
            "prose-headings:font-display prose-headings:font-semibold",
            "prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-0 prose-h1:text-foreground prose-h1:border-b prose-h1:border-border prose-h1:pb-3",
            "prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-foreground prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2",
            "prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-foreground prose-h3:font-semibold",
            "prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-2 prose-h4:text-muted-foreground prose-h4:font-semibold prose-h4:uppercase prose-h4:tracking-wide",
            // Text
            "prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:my-3",
            "prose-strong:text-foreground prose-strong:font-semibold",
            "prose-em:text-muted-foreground prose-em:italic",
            // Lists
            "prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5",
            "prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5",
            "prose-li:my-1.5 prose-li:text-muted-foreground prose-li:leading-relaxed",
            // Tables
            "prose-table:text-sm prose-table:my-6 prose-table:border-collapse prose-table:w-full prose-table:border prose-table:border-border",
            "prose-thead:border-b-2 prose-thead:border-border prose-thead:bg-muted",
            "prose-th:font-semibold prose-th:text-foreground prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:border prose-th:border-border",
            "prose-tbody:divide-y prose-tbody:divide-border",
            "prose-td:px-4 prose-td:py-2.5 prose-td:text-muted-foreground prose-td:border prose-td:border-border",
            "prose-tr:border-b prose-tr:border-border",
            // Code
            "prose-code:text-primary-600 prose-code:bg-primary-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
            "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto",
            // Blockquotes
            "prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:my-4",
            // Links
            "prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline",
            // Horizontal rules
            "prose-hr:border-border prose-hr:my-8"
          )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {cleanMarkdown}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}
