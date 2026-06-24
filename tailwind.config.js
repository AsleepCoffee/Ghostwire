/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-driven surface palette (overridden per theme via CSS variables).
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)'
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
