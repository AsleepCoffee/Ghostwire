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
          DEFAULT: '#3b82f6',
          soft: '#1e3a8a',
          glow: '#60a5fa'
        },
        accent: {
          DEFAULT: '#22d3ee',
          soft: '#0e7490',
          glow: '#67e8f9'
        },
        danger: '#f43f5e',
        warn: '#f59e0b',
        ok: '#34d399'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(59,130,246,0.25), 0 8px 30px -10px rgba(59,130,246,0.35)'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
