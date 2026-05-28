/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05070b",
          900: "#0a0d13",
          800: "#0f141c",
          700: "#171d28",
          600: "#202836",
          500: "#2a3344",
          400: "#3a4459",
          300: "#7e8aa6",
          200: "#a8b3cc",
          100: "#d4dbeb"
        },
        accent: {
          DEFAULT: "#ffb302",
          dark: "#cc8a01",
          50: "#fff7d6"
        },
        crimson: "#ff3b3b",
        gold: "#ffd54a",
        emerald: "#2ecc71",
        sky: "#4aa8ff",
        violet: "#a072ff"
      },
      fontFamily: {
        display: ["'Bebas Neue'", "system-ui", "sans-serif"],
        head: ["'Oswald'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      animation: {
        "pop": "pop 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        "fade-in": "fade-in 240ms ease-out",
        "slide-up": "slide-up 320ms ease-out"
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.94)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        }
      }
    }
  },
  plugins: []
};
