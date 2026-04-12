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
          bg: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.12)',
          hover: 'rgba(255, 255, 255, 0.08)',
          input: 'rgba(255, 255, 255, 0.04)',
        },
        theme: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          accent: 'var(--text-accent)',
          green: 'var(--text-green)',
          yellow: 'var(--text-yellow)',
          red: 'var(--text-red)',
        },
      },
      backgroundColor: {
        'chip': 'var(--chip-bg)',
        'glass-input': 'var(--glass-input)',
        'item': 'var(--item-bg)',
        'food-icon': 'var(--food-icon-bg)',
        'exercise-icon': 'var(--exercise-icon-bg)',
        'bar': 'var(--bar-bg)',
      },
      borderColor: {
        'chip': 'var(--chip-border)',
        'glass-light': 'var(--glass-border-light)',
        'glass-divider': 'var(--glass-divider)',
      },
      backdropBlur: {
        glass: '24px',
      },
      backdropSaturate: {
        glass: '1.8',
      },
      boxShadow: {
        'glass': '0 12px 40px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15)',
        'glass-inset': 'inset 0 0 0 0.5px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'glow': '0 0 20px rgba(96, 165, 250, 0.2)',
        'glow-green': '0 0 12px rgba(52, 211, 153, 0.3)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '22px',
        '4xl': '24px',
      },
    },
  },
  plugins: [],
}
