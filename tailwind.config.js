/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark "command center" palette
        ink: {
          950: '#070a0f',
          900: '#0b0e15',
          850: '#0f131c',
          800: '#141925',
          700: '#1d2433',
          600: '#2a3242',
          500: '#3a4456'
        },
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          glow: 'rgb(var(--brand-glow) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          glow: 'rgb(var(--accent-glow) / <alpha-value>)'
        },
        danger: '#f43f5e',
        warn: '#f59e0b',
        ok: '#34d399'
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--brand) / 0.25), 0 8px 30px -10px rgb(var(--brand) / 0.35)'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
