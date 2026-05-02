/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['Lora', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#1a6b5a',
          dark: '#0f3d32',
          light: '#e8f5f1',
        },
        accent: {
          DEFAULT: '#e8a020',
          light: '#faeeda',
        },
        danger: '#e24b4a',
        success: '#1D9E75',
        info: '#185FA5',
        warm: '#f8f7f3',
        charcoal: '#3d3d3a',
        stone: '#9b9b95',
        border: '#e5e4de',
      },
      borderRadius: {
        badge: '4px',
        input: '8px',
        card: '12px',
        modal: '16px',
        pill: '99px',
      },
    },
  },
  plugins: [],
}
