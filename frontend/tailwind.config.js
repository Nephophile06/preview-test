/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121313',
        cream: '#f9eed8',
        cobalt: '#3f75bb',
        sage: '#739a69',
        rust: '#c36a45',
        ember: '#b94f38',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      transitionDuration: {
        180: '180ms',
      },
      letterSpacing: {
        wider2: '0.18em',
      },
    },
  },
  plugins: [],
}
