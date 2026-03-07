import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0b8377',
          600: '#0B8377',
          700: '#0a7469',
          800: '#08655b',
          900: '#064e47',
        },
        hubspot: {
          orange: '#ff7a59',
          dark: '#2d3e50',
        }
      },
    },
  },
  plugins: [],
}
export default config
