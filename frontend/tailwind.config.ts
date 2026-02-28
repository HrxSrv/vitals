import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand - Sage Green
        primary: {
          50:  '#f0f7f1',
          100: '#d9eedd',
          200: '#b5debb',
          300: '#87c793',
          400: '#5aac6a',
          500: '#3d9150',
          600: '#2e7340',
          700: '#275c35',
          800: '#22492c',
          900: '#1c3c24',
          DEFAULT: '#3d9150',
          foreground: '#ffffff',
        },
        // Accent - Warm terracotta for alerts/CTAs
        accent: {
          50:  '#fdf3f0',
          100: '#fae4dd',
          200: '#f5c9bb',
          300: '#eda490',
          400: '#e07a5f',
          500: '#d45e40',
          600: '#b84530',
          DEFAULT: '#e07a5f',
          foreground: '#ffffff',
        },
        // Warning - Warm gold
        warning: {
          50:  '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          DEFAULT: '#f59e0b',
        },
        // Status colors
        status: {
          normal:     '#3d9150',
          borderline: '#f59e0b',
          high:       '#e07a5f',
          low:        '#e07a5f',
        },
        // Background
        background: '#FAFAF7',
        foreground: '#1E2D3D',
        card: {
          DEFAULT:    '#FFFFFF',
          foreground: '#1E2D3D',
        },
        muted: {
          DEFAULT:    '#F3F4EF',
          foreground: '#6B7280',
        },
        border: '#E5E7E0',
        input:  '#E5E7E0',
        ring:   '#3d9150',
        destructive: {
          DEFAULT:    '#e07a5f',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT:    '#F3F4EF',
          foreground: '#374151',
        },
        popover: {
          DEFAULT:    '#FFFFFF',
          foreground: '#1E2D3D',
        },
      },
      fontFamily: {
        display: ['var(--font-crimson)', 'Georgia', 'serif'],
        sans:    ['var(--font-nunito)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg:  'var(--radius)',
        md:  'calc(var(--radius) - 2px)',
        sm:  'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'fade-up':         'fade-up 0.4s ease-out both',
        'fade-in':         'fade-in 0.3s ease-out both',
        'slide-in-right':  'slide-in-right 0.3s ease-out both',
        shimmer:           'shimmer 1.5s infinite linear',
        pulse:             'pulse 2s ease-in-out infinite',
      },
      backgroundImage: {
        'sage-gradient':  'linear-gradient(135deg, #3d9150 0%, #275c35 100%)',
        'card-gradient':  'linear-gradient(135deg, #f0f7f1 0%, #ffffff 100%)',
        'cream-gradient': 'linear-gradient(180deg, #FAFAF7 0%, #F3F4EF 100%)',
      },
      boxShadow: {
        card:   '0 1px 3px rgba(30,45,61,0.08), 0 1px 2px rgba(30,45,61,0.04)',
        'card-hover': '0 4px 12px rgba(30,45,61,0.12), 0 2px 4px rgba(30,45,61,0.06)',
        nav:    '0 -1px 0 rgba(30,45,61,0.06), 0 -4px 16px rgba(30,45,61,0.04)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
