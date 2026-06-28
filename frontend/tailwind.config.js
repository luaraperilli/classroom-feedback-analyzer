/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta da marca — Voz Discente
        primary: {
          DEFAULT: '#0f766e',  // teal (marca)
          dark:    '#0d6460',
          light:   '#f0fdfc',
        },
        positive: '#059669',   // esmeralda — harmoniza com o teal
        negative: '#dc2626',   // vermelho
        neutral:  '#64748b',   // slate-500
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
