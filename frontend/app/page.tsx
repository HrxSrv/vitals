import Link from 'next/link';
import { Leaf, TrendingUp, MessageCircle, ArrowRight, Users, PlayCircle } from 'lucide-react';
import { LandingRedirect } from '@/components/landing/LandingRedirect';
import { HeroBanner } from '@/components/landing/HeroBanner';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingRedirect />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
              <Leaf size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-semibold text-foreground">Vithos</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-24 grid lg:grid-cols-2 gap-16 items-center overflow-visible">

        {/* Left — copy */}
        <div className="space-y-7 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
            <Leaf size={12} />
            Family health, one place
          </div>

          <h1 className="font-display text-5xl lg:text-[3.5rem] font-semibold text-foreground leading-[1.08] tracking-tight">
            Stop losing your
            <br />
            <span className="text-primary-500">health reports</span>
            <br />
            to a drawer.
          </h1>

          <p className="text-base text-muted-foreground leading-relaxed max-w-[420px]">
            Upload a lab PDF. We extract every biomarker, track how it changes over time, and let you ask an AI that actually knows your history. For you and your whole family.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3.5 rounded-2xl transition-all hover:shadow-lg text-sm"
            >
              Start for free
              <ArrowRight size={16} />
            </Link>
            <a
              href="https://youtu.be/mt6oHAHMWjc?si=d1wSbej3qx7u2d_u"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <PlayCircle size={18} className="text-primary-500" />
              Watch beta demo
            </a>
            <Link
              href="/login"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Already have an account
            </Link>
          </div>

          {/* Social proof pills */}
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              '60+ biomarkers tracked',
              'Whole family, one account',
              'AI that reads your reports',
            ].map((t) => (
              <span key={t} className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right — banner image */}
        <HeroBanner />
      </section>

      {/* Features strip */}
      <section className="border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
          <Feature
            icon={<Users size={20} />}
            title="One roof, whole family"
            desc="Add profiles for your parents, spouse, kids. Every report, every trend, organised by person and accessible in seconds."
          />
          <Feature
            icon={<TrendingUp size={20} />}
            title="Trends that tell a story"
            desc="See how your cholesterol, glucose, thyroid, and 60+ other markers have moved across months and years. Not just the last test."
          />
          <Feature
            icon={<MessageCircle size={20} />}
            title="Ask. Get real answers."
            desc="Chat with an AI that has read all your reports. Not generic advice. Answers based on your actual numbers and history."
          />
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col items-center text-center gap-6">
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-foreground max-w-xl leading-tight">
            Your next checkup is only useful if you remember the last one.
          </h2>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Vithos keeps every report, every value, every trend. So you walk into your doctor's office knowing exactly what changed and why.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3.5 rounded-2xl transition-all hover:shadow-lg text-sm"
          >
            Get started free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary-500 flex items-center justify-center">
              <Leaf size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Vithos</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/help" className="hover:text-foreground transition-colors">Help</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Vithos. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
