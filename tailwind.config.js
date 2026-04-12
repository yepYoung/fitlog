/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#60A5FA',
          green: '#34D399',
          yellow: '#FBBF24',
          red: '#F87171',
        },
        glass: {
          bg: 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(255, 255, 255, 0.15)',
          hover: 'rgba(255, 255, 255, 0.12)',
          input: 'rgba(255, 255, 255, 0.06)',
        },
      },
      backdropBlur: {
        glass: '20px',
      },
      backdropSaturate: {
        glass: '1.4',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
        glow: '0 0 20px rgba(96, 165, 250, 0.15)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
    },
  },
  plugins: [],
}
