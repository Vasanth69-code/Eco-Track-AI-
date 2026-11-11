/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#00F0FF',
        'primary-hover': '#33F3FF',
        secondary: '#CCFF00',
        'secondary-hover': '#D9FF33',
        dark: {
          bg: '#0B0E14',
          surface: '#151921',
          highlight: '#1E2330',
          border: '#2D3342',
          text: '#F8FAFC',
          muted: '#94A3B8',
        },
        light: {
          bg: '#F5F7FA',
          surface: '#FFFFFF',
          highlight: '#E2E8F0',
          border: '#CBD5E1',
          text: '#0F172A',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['"Chakra Petch"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0,240,255,0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(0,240,255,0.8), 0 0 40px rgba(0,240,255,0.3)' },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-volt': 'linear-gradient(135deg, #00F0FF 0%, #CCFF00 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0B0E14 0%, #151921 100%)',
      },
    },
  },
  plugins: [],
}
