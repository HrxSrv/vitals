'use client';

import { Header } from '@/components/layout/Header';
import { FileText, AlertTriangle, Ban, CheckCircle2, RefreshCw, Mail } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Terms of Service" showBack />

      <main className="flex-1 py-6 px-4 lg:px-8 max-w-3xl">
        <p className="text-xs text-muted-foreground mb-8">Last updated: March 2026</p>

        <div className="space-y-6">
          <Section icon={<FileText size={18} />} title="What Vithos Is">
            <p>
              Vithos is a personal health tracking tool that helps you organise lab reports,
              visualise biomarker trends, and ask questions about your results using AI. It is
              not a medical device, does not provide medical diagnoses, and is not a substitute
              for professional medical advice.
            </p>
          </Section>

          <Section icon={<AlertTriangle size={18} />} title="Medical Disclaimer">
            <p>
              All information provided by Vithos, including AI-generated responses, is for
              informational purposes only. Always consult a qualified healthcare professional
              before making any health decisions. Do not disregard professional medical advice
              based on anything you read in this app.
            </p>
          </Section>

          <Section icon={<CheckCircle2 size={18} />} title="Your Responsibilities">
            <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground">
              <li>You must be 18 or older to use Vithos</li>
              <li>You are responsible for the accuracy of data you upload</li>
              <li>You may only upload reports you have the right to share</li>
              <li>You agree not to use the service for any unlawful purpose</li>
            </ul>
          </Section>

          <Section icon={<Ban size={18} />} title="Prohibited Use">
            <p>
              You may not attempt to reverse-engineer the service, scrape data, impersonate
              other users, or use the AI assistant to generate harmful medical misinformation.
              Accounts found in violation will be suspended.
            </p>
          </Section>

          <Section icon={<RefreshCw size={18} />} title="Changes to These Terms">
            <p>
              We may update these terms from time to time. Continued use of Vithos after
              changes are posted constitutes acceptance of the new terms. We will notify you
              by email for any material changes.
            </p>
          </Section>

          <Section icon={<Mail size={18} />} title="Questions">
            <p>
              For any questions about these terms, contact us at{' '}
              <a href="mailto:adityaghailbdrp1@gmail.com" className="text-primary-600 font-semibold hover:underline">
                adityaghailbdrp1@gmail.com
              </a>
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
          {icon}
        </div>
        <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
