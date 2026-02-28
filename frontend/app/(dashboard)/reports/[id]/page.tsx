'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trash2, FileText, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useReport, useDeleteReport } from '@/lib/hooks/useReports';
import { Header } from '@/components/layout/Header';
import { BiomarkerList } from '@/components/reports/BiomarkerList';
import { formatDate } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showLHM, setShowLHM] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: report, isLoading, error } = useReport(id);
  const { mutateAsync: deleteReport, isPending: isDeleting } = useDeleteReport();

  const handleDelete = async () => {
    if (!report) return;
    await deleteReport(report.id);
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header showBack title="Report" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header showBack title="Report" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <AlertTriangle size={32} className="text-accent-400" />
          <p className="text-sm text-muted-foreground">Could not load this report.</p>
        </div>
      </div>
    );
  }

  const isProcessing = report.processingStatus === 'pending' || report.processingStatus === 'processing';

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        showBack
        title={formatDate(report.reportDate)}
        actions={
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-xl text-muted-foreground hover:text-accent-500 hover:bg-accent-50 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        }
      />

      <main className="flex-1 py-4 space-y-4">
        {/* Processing banner */}
        {isProcessing && (
          <div className="mx-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Processing your report…</p>
              <p className="text-xs text-blue-600 mt-0.5">This may take a minute. Check back soon.</p>
            </div>
          </div>
        )}

        {/* Failed banner */}
        {report.processingStatus === 'failed' && (
          <div className="mx-4 bg-accent-50 border border-accent-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle size={20} className="text-accent-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-accent-700">Processing failed</p>
              <p className="text-xs text-accent-500 mt-0.5">We couldn't read this PDF. Try uploading again.</p>
            </div>
          </div>
        )}

        {/* Biomarkers */}
        {report.biomarkers && report.biomarkers.length > 0 ? (
          <section>
            <h2 className="font-display text-lg font-semibold px-4 mb-3 text-foreground">Biomarkers</h2>
            <BiomarkerList biomarkers={report.biomarkers} />
          </section>
        ) : (
          !isProcessing && report.processingStatus === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <FileText size={32} className="text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No biomarkers found in this report.</p>
            </div>
          )
        )}
      </main>

      {/* LHM Bottom Sheet */}
      {showLHM && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowLHM(false)} />
          <div className="relative w-full max-w-[480px] mx-auto bg-white rounded-t-3xl max-h-[80vh] flex flex-col animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-display text-lg font-semibold">Health Summary</h3>
              <button onClick={() => setShowLHM(false)} className="p-2 rounded-xl hover:bg-muted">
                <ChevronDown size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 prose prose-sm max-w-none">
              <ReactMarkdown>{report.biomarkers?.toString() ?? 'No summary available.'}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-fade-up">
            <h3 className="font-display text-lg font-semibold mb-2">Delete report?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete the report and all its biomarker data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
