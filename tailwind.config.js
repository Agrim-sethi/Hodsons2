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
        primary: '#c9a34a',
        secondary: '#e4c67d',
        'accent-ivory': '#f8f1de',
        'accent-bronze': '#8d6b23',
        'accent-steel': '#8f9aae',
        'accent-sage': '#3a7f5d',
        'accent-crimson': '#ef4444',
        'background-light': '#f6efe0',
        'background-dark': '#091423',
        'surface-dark': '#11233a',
        'house-vindhya': '#ef4444',
        'house-himalaya': '#eab308',
        'house-nilgiri': '#3b82f6',
        'house-siwalik': '#10b981'
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        sans: ['Source Sans 3', 'sans-serif']
      }
    }
  },
  plugins: [forms, containerQueries, animate]
};
