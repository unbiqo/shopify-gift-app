/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--seed-ink) / <alpha-value>)",
        cream: "rgb(var(--seed-cream) / <alpha-value>)",
        lime: "rgb(var(--seed-lime) / <alpha-value>)",
        sky: "rgb(var(--seed-sky) / <alpha-value>)",
        coral: "rgb(var(--seed-coral) / <alpha-value>)",
        blush: "rgb(var(--seed-blush) / <alpha-value>)",
        sun: "rgb(var(--seed-sun) / <alpha-value>)",
      },
      fontFamily: {
        display: ["\"Fraunces\"", "ui-serif", "serif"],
        sans: ["\"Space Grotesk\"", "ui-sans-serif", "sans-serif"],
      },
      boxShadow: {
        neo: "6px 6px 0 0 rgb(var(--seed-ink))",
        "neo-lg": "10px 10px 0 0 rgb(var(--seed-ink))",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 700ms ease-out both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
