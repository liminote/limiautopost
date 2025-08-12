/** @type {import('tailwindcss').Config} */
export default {
  content:['./index.html','./src/**/*.{ts,tsx}'],
  theme:{
    extend:{
      colors:{
        yinmn:{ DEFAULT: 'var(--yinmn-blue)', 300: 'var(--yinmn-blue-300)', 600: 'var(--yinmn-blue-600)' },
        surface:'var(--surface)',
        text:'var(--ui-fg)',
        border:'var(--ui-border)'
      },
      borderRadius:{ md:'12px', lg:'16px' },
      boxShadow:{ card:'0 4px 16px rgba(2,6,23,.06)' }
    }
  },
  plugins:[]
}