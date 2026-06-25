import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd5ff",
          300: "#8ebcff",
          400: "#5a98ff",
          500: "#3478f6",
          600: "#1f5be0",
          700: "#1849b8",
          800: "#173f95",
          900: "#1a3876",
        },
        emerald: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
        "glass-lg": "0 12px 48px 0 rgba(31, 38, 135, 0.25)",
        "inner-glow": "inset 0 1px 0 0 rgba(255,255,255,0.1)",
      },
    },
  },
  plugins: [],
};
export default config;
