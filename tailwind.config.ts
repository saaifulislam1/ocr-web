// tailwind.config.ts

import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme"; // <-- Import this

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // This is your default Orbitron font
        sans: ["var(--font-orbitron)", "sans-serif"],

        // Add this new entry for a standard system font
        body: ["Inter", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
export default config;
