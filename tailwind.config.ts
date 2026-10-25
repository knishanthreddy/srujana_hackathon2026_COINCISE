import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Primary FinTech Design Tokens from Image 2
        cream: "#F7F3EA",
        beige: "#E8E1D5",
        tangerine: {
          DEFAULT: "#F15A35",
          hover: "#DE4924",
          light: "#FCE4D8",
          dark: "#C83B18",
        },
        charcoal: {
          DEFAULT: "#242321",
          muted: "#4A4743",
          light: "#6E6963",
        },
        taupe: {
          DEFAULT: "#A69C8D",
          light: "#C5BCAD",
          dark: "#7A7163",
        },
        finteal: {
          DEFAULT: "#138C83",
          light: "#DDEFE8",
          dark: "#0E6E67",
        },
        // Brand mappings (Tangerine-driven)
        brand: {
          50: "#FFF6F1",
          100: "#FCE4D8",
          200: "#F9C3AF",
          300: "#F59E81",
          400: "#F27854",
          500: "#F15A35",
          600: "#DE4924",
          700: "#B83616",
          800: "#92290F",
          900: "#6D1D09",
          950: "#242321",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 10px -2px rgba(36, 35, 33, 0.05), 0 1px 4px -1px rgba(36, 35, 33, 0.03)",
        card: "0 4px 20px -2px rgba(36, 35, 33, 0.06)",
        orange: "0 4px 14px 0 rgba(241, 90, 53, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
