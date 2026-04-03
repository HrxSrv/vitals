'use client';

import { Header } from '@/components/layout/Header';
import { Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Privacy Policy" showBack />

      <main className="flex-1 py-6 px-4 lg:px-8 max-w-3xl">
        <p className="text-xs text-muted-foreground mb-8">Last updated: March 2026</p>

        <div className="space-y-6">
          <Section icon={<Shield size={18} />} title="Our Commitment">
            <p>
              Vithos is built on the principle that your health data belongs to you. We collect only
              what is necessary to provide the service, never sell your data, and give you full
              control to delete it at any time.
            </p>
          </Section>

          <Section icon={<Database size={18} />} title="What We Collect">
            <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground">
              <li>Account information (name, email address)</li>
              <li>Health reports you upload (PDFs and extracted biomarker data)</li>
              <li>Profile information for people you track (name, date of birth, relationship)</li>
              <li>Chat messages sent to the AI health assistant</li>
              <li>Basic usage data to improve the product (no third-party analytics)</li>
            </ul>
          </Section>

          <Section icon={<Lock size={18} />} title="How We Protect It">
            <p>
              All data is encrypted in transit (TLS) and at rest. Health reports are stored in
              isolated, access-controlled storage. We use Supabase with row-level security so your
              data is only accessible to your account.
            </p>
          </Section>

          <Section icon={<Eye size={18} />} title="Who Can See Your Data">
            <p>
              Only you. We do not share your health data with third parties, advertisers, or
              insurance companies. AI processing happens via API calls to language model providers.
              These calls do not include your name or identifying information beyond the health
              values themselves.
            </p>
          </Section>

          <Section icon={<UserCheck size={18} />} title="Your Rights">
            <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground">
              <li>Export all your data at any time</li>
              <li>Delete your account and all associated data permanently</li>
              <li>Correct inaccurate profile information</li>
              <li>Opt out of any non-essential communications</li>
            </ul>
          </Section>

          <Section icon={<Mail size={18} />} title="Contact">
            <p>
              Questions about your privacy? Reach us at{' '}
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
