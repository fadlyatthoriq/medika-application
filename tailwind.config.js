/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit', // Aktifkan JIT mode
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/aspect-ratio')
,require('@tailwindcss/forms')
,require('@tailwindcss/line-clamp')
,require('@tailwindcss/typography')
,require('flowbite/plugin')
],
};
