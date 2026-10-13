/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Noto Sans CJK SC"', 'sans-serif'],
        display: ['"Roboto Condensed"', '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', '"Noto Sans CJK SC"', 'sans-serif'],
        numeric: ['"Roboto Condensed"', '"Arial Narrow"', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: 'var(--text-accent)',
          green: 'var(--text-green)',
          yellow: 'var(--text-yellow)',
          red: 'var(--text-red)',
        },
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
          hover: 'var(--glass-bg-hover)',
          input: 'var(--glass-input)',
        },
        theme: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          accent: 'var(--text-accent)',
          green: 'var(--text-green)',
          yellow: 'var(--text-yellow)',
          red: 'var(--text-red)',
          blue: 'var(--text-blue)',
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
      boxShadow: {
        'glass': 'var(--shadow-glass)',
      },
      borderRadius: {
        '2xl': '12px',
        '3xl': '16px',
        '4xl': '16px',
      },
    },
  },
  plugins: [],
}
