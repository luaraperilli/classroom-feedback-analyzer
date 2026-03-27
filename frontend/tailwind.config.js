/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f766e',
          dark:    '#0d6460',
          light:   '#f0fdfc',
        },
        positive: '#16a34a',
        negative: '#dc2626',
        neutral:  '#6b7280',
        surface:  '#ffffff',
        bg:       '#f8fafc',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto',
          'Oxygen', 'Ubuntu', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
