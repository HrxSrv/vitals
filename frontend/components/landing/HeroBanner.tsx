'use client';

import Image from 'next/image';
import { TrendingUp, Activity } from 'lucide-react';

export function HeroBanner() {
  return (
    <div
      className="group relative animate-fade-up animate-delay-200 cursor-pointer"
      style={{ transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)', willChange: 'transform' }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.07)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {/* Image card */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border group-hover:shadow-[0_32px_64px_rgba(30,45,61,0.18)] transition-shadow duration-500">
        <Image
          src="/banner.png"
          alt="Vithos health dashboard"
          width={720}
          height={480}
          className="w-full h-auto object-cover"
          priority
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
            <Activity size={14} className="text-primary-600" />
            <span className="text-xs font-semibold text-foreground">Your health dashboard</span>
          </div>
        </div>
      </div>

      {/* Floating pill — bottom right */}
      <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-card-hover px-4 py-3 flex items-center gap-3 border border-border">
        <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
          <TrendingUp size={16} className="text-primary-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">Biomarkers tracked</p>
          <p className="text-sm font-bold text-foreground">Across every report</p>
        </div>
      </div>
    </div>
  );
}
