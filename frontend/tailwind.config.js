/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          dark: '#4F46E5'
        },
        brand: '#6366F1'
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px'
      },
      boxShadow: {
        glow: '0 10px 30px -10px rgba(99,102,241,0.35)',
        card: '0 1px 2px rgba(16,24,40,0.04), 0 14px 34px -16px rgba(16,24,40,0.14)',
        'card-hover': '0 1px 2px rgba(16,24,40,0.05), 0 22px 44px -18px rgba(16,24,40,0.20)'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        fadeIn: 'fadeIn .3s ease both',
        popIn: 'popIn .25s cubic-bezier(.2,.8,.2,1) both'
      }
    }
  },
  plugins: []
};
