import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Simply brand colors
        primary: {
          DEFAULT: "#2D5A27", // Forest green
          50: "#F0F5EF",
          100: "#E1EBE0",
          200: "#C3D7C1",
          300: "#A5C3A2",
          400: "#87AF83",
          500: "#699B64",
          600: "#4B7746",
          700: "#2D5A27",
          800: "#234520",
          900: "#1A3018",
        },
        background: "#FFFFFF",
        foreground: "#1A1A1A",
        muted: {
          DEFAULT: "#F9F9F9",
          foreground: "#6B7280",
        },
        border: "#E5E7EB",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1A1A",
        },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        display: ["'The Seasons'", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.1)",
        "card-hover": "0 4px 6px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
