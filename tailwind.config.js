import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';
import animate from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}'
  ],
  safelist: [
    'bg-house-vindhya',
    'bg-house-vindhya/20',
    'text-house-vindhya',
    'border-house-vindhya',
    'border-house-vindhya/20',
    'border-house-vindhya/30',
    'from-house-vindhya/20',
    'to-house-vindhya',
    'bg-house-himalaya',
    'bg-house-himalaya/20',
    'text-house-himalaya',
    'border-house-himalaya',
    'border-house-himalaya/20',
    'border-house-himalaya/30',
    'from-house-himalaya/20',
    'to-house-himalaya',
    'bg-house-nilgiri',
    'bg-house-nilgiri/20',
    'text-house-nilgiri',
    'border-house-nilgiri',
    'border-house-nilgiri/20',
    'border-house-nilgiri/30',
    'from-house-nilgiri/20',
    'to-house-nilgiri',
    'bg-house-siwalik',
    'bg-house-siwalik/20',
    'text-house-siwalik',
    'border-house-siwalik',
    'border-house-siwalik/20',
    'border-house-siwalik/30',
    'from-house-siwalik/20',
    'to-house-siwalik'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#258cf4',
        'background-light': '#f5f7f8',
        'background-dark': '#0f172a',
        'surface-dark': '#1e293b',
        'house-vindhya': '#ef4444',
        'house-himalaya': '#eab308',
        'house-nilgiri': '#3b82f6',
        'house-siwalik': '#10b981'
      },
      fontFamily: {
        display: ['Lexend', 'sans-serif'],
        sans: ['Lexend', 'sans-serif']
      }
    }
  },
  plugins: [forms, containerQueries, animate]
};
