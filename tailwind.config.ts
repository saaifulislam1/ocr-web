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
        sans: ["var(--font-poppins)", "sans-serif"], // body text
        // orbitron: ["var(--font-orbitron)", "sans-serif"], // headings
      },
    },
  },
  plugins: [],
};
export default config;
