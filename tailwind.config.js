/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          DEFAULT: '#185FA5',
          dark: '#124878',
          light: '#EAF2FA',
          mid: '#CFE0F0',
        },
        red: {
          DEFAULT: '#C0392B',
          light: '#FBEAE8',
        },
        green: {
          DEFAULT: '#1A7A4A',
          light: '#E8F5E9',
        },
      },
      fontFamily: {
        sans: ['Arial', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
