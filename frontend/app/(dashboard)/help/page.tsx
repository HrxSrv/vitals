'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Upload, MessageCircle, TrendingUp, User, ChevronDown, ChevronUp, Mail, Send } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const FAQS = [
  {
    q: 'How do I upload a health report?',
    a: 'Tap the upload icon in the top-right corner of the Home or Reports screen. Select a PDF of your lab report and we\'ll extract the biomarker values automatically within a minute or two.',
  },
  {
    q: 'Which report formats are supported?',
    a: 'We support PDF lab reports from most diagnostic labs. The AI extraction works best with standard formatted reports. Scanned image PDFs may have lower accuracy.',
  },
  {
    q: 'How does the AI health assistant work?',
    a: 'The assistant has access to your biomarker history and can answer questions about your results, explain what values mean, and compare trends over time. It does not have access to your personal identity, only your health numbers.',
  },
  {
    q: 'Can I track health data for my family?',
    a: 'Yes. Go to Profiles and tap "Add" to create a profile for a family member. You can switch between profiles from any screen using the profile switcher in the top-right.',
  },
  {
    q: 'What does the status colour on a biomarker mean?',
    a: 'Green means the value is within the normal reference range. Yellow (borderline) means it\'s close to the edge. Red (high/low) means it\'s outside the reference range, worth discussing with your doctor.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Email us at adityaghailbdrp1@gmail.com with the subject "Delete my account" from your registered email address. We\'ll permanently delete all your data within 7 days.',
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to send');
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again or email us directly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Help & Support" showBack />

      <main className="flex-1 py-6 px-4 lg:px-8 space-y-8 max-w-3xl">

        {/* Quick links */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Quick Start</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: <Upload size={20} />, label: 'Upload a Report', desc: 'Add your lab PDF' },
              { icon: <TrendingUp size={20} />, label: 'View Trends', desc: 'Track over time' },
              { icon: <MessageCircle size={20} />, label: 'Ask the AI', desc: 'Chat about results' },
              { icon: <User size={20} />, label: 'Add a Profile', desc: 'Track family too' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="bg-white rounded-2xl shadow-card p-4 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                  {icon}
                </div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-card overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-foreground pr-4">{faq.q}</span>
                  {open === i
                    ? <ChevronUp size={16} className="text-muted-foreground shrink-0" />
                    : <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                  }
                </button>
                {open === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Write to us */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Write to Us
          </h2>
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Get in touch</p>
                <p className="text-xs text-muted-foreground">We usually respond within 24 hours</p>
              </div>
            </div>

            {sent ? (
              <div className="flex flex-col items-center py-6 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                  <Send size={20} className="text-primary-600" />
                </div>
                <p className="font-semibold text-foreground">Message sent!</p>
                <p className="text-sm text-muted-foreground">We'll get back to you within 24 hours.</p>
                <button
                  onClick={() => { setSent(false); setForm({ name: '', email: '', message: '' }); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline mt-1"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField label="Your Name">
                    <input
                      type="text"
                      required
                      placeholder="Aditya"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label="Your Email">
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputCls}
                    />
                  </FormField>
                </div>
                <FormField label="Message">
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your issue or question…"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={cn(inputCls, 'resize-none')}
                  />
                </FormField>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full lg:w-auto px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Send size={15} />
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Direct email */}
        <div className="text-center pb-4">
          <p className="text-xs text-muted-foreground">
            Or email us directly at{' '}
            <a href="mailto:adityaghailbdrp1@gmail.com" className="text-primary-600 font-semibold hover:underline">
              adityaghailbdrp1@gmail.com
            </a>
          </p>
        </div>

      </main>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-400 focus:bg-white transition-all duration-200';
