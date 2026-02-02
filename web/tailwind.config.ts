import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "wiselista-navy": "var(--wiselista-navy)",
        "wiselista-navy-light": "var(--wiselista-navy-light)",
        "wiselista-accent": "var(--wiselista-accent)",
        "wiselista-accent-hover": "var(--wiselista-accent-hover)",
        "wiselista-success": "#059669",
        "wiselista-warning": "#d97706",
        "wiselista-surface": "var(--wiselista-surface)",
        "wiselista-card": "var(--wiselista-card)",
        "wiselista-border": "var(--wiselista-border)",
      },
    },
  },
  plugins: [],
} satisfies Config;
