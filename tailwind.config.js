/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Arc-inspired color palette
        sidebar: {
          bg: 'var(--sidebar-bg)',
          border: 'var(--sidebar-border)',
          text: 'var(--sidebar-text)',
          hover: 'var(--sidebar-hover)',
          active: 'var(--sidebar-active)',
        },
        browser: {
          bg: 'var(--browser-bg)',
          toolbar: 'var(--toolbar-bg)',
          tab: 'var(--tab-bg)',
          'tab-active': 'var(--tab-active)',
          border: 'var(--browser-border)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'slide-in-left': 'slideInLeft 0.2s ease-out',
        'slide-out-left': 'slideOutLeft 0.2s ease-in',
        'fade-in': 'fadeIn 0.15s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
      },
      keyframes: {
        slideInLeft: {
          from: { transform: 'translateX(-10px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutLeft: {
          from: { transform: 'translateX(0)', opacity: '1' },
          to: { transform: 'translateX(-10px)', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        }
      }
    },
  },
  plugins: [],
}
