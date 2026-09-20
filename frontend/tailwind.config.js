/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0E7F87', // SourceFlow teal
          teal: '#0E7F87',
          navy: '#0A2540',
          dark: '#0B2545',
          darker: '#091E3A',
          light: '#F0FDFA',
          border: '#CCFBF1',
          accent: '#0D9488',
        },
        navy: {
          DEFAULT: '#0A2540',
          dark: '#081D33',
          light: '#F0F4F8',
          border: '#D9E2EC',
          muted: '#334E68',
        },
        surface: {
          DEFAULT: '#FAFAF9', // warm off-white
          bright: '#FFFFFF',
          dim: '#F5F5F4',
          tint: '#E7E5E4',
          variant: '#F0F0EE',
          'container-lowest': '#FFFFFF',
          'container-low': '#F8F9FA',
          container: '#F3F4F6',
          'container-high': '#E5E7EB',
          'container-highest': '#D1D5DB',
        },
        'on-surface': {
          DEFAULT: '#0F172A',
          variant: '#64748B',
        },
        primary: {
          DEFAULT: '#0F766E',
          dark: '#134E4A',
          container: '#F0FDFA',
          fixed: '#CCFBF1',
          dim: '#99F6E4',
        },
        'on-primary': {
          DEFAULT: '#FFFFFF',
          container: '#115E59',
          fixed: '#134E4A',
          'fixed-variant': '#0F766E',
        },
        secondary: {
          DEFAULT: '#475569',
          container: '#F1F5F9',
          fixed: '#E2E8F0',
          dim: '#CBD5E1',
        },
        'on-secondary': {
          DEFAULT: '#FFFFFF',
          container: '#334155',
          fixed: '#1E293B',
          'fixed-variant': '#475569',
        },
        tertiary: {
          DEFAULT: '#059669',
          container: '#ECFDF5',
          fixed: '#A7F3D0',
          dim: '#6EE7B7',
        },
        'on-tertiary': {
          DEFAULT: '#FFFFFF',
          container: '#047857',
          fixed: '#064E3B',
          'fixed-variant': '#059669',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FFFBEB',
          border: '#FDE68A',
          dark: '#B45309',
        },
        outline: {
          DEFAULT: '#94A3B8',
          variant: '#E2E8F0',
        },
        error: {
          DEFAULT: '#DC2626',
          container: '#FEF2F2',
        },
        'on-error': {
          DEFAULT: '#FFFFFF',
          container: '#991B1B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'headline-xl': ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['22px', { lineHeight: '28px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md': ['18px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['15px', { lineHeight: '22px', letterSpacing: '-0.005em' }],
        'body-md': ['13px', { lineHeight: '18px', letterSpacing: '0em' }],
        'body-sm': ['12px', { lineHeight: '16px', letterSpacing: '0em' }],
        'label-caps': ['11px', { lineHeight: '14px', letterSpacing: '0.06em', fontWeight: '600' }],
        'code-md': ['12px', { lineHeight: '16px', letterSpacing: '-0.02em', fontWeight: '500' }],
        'code-sm': ['11px', { lineHeight: '14px', letterSpacing: '-0.01em', fontWeight: '500' }],
      },
      spacing: {
        'console-margin': '1.5rem',
        'panel-padding': '1rem',
        'gutter-table': '0.5rem',
        'space-2xs': '0.125rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-lg': '1rem',
        'space-xl': '1.5rem',
        'space-2xl': '2rem',
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        card: '0 2px 4px -1px rgba(15, 23, 42, 0.04), 0 4px 6px -1px rgba(15, 23, 42, 0.04)',
        floating: '0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
        paper: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
      }
    },
  },
  plugins: [],
}
