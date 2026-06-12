/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Sora'", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      colors: {
        brand: {
          50: "#f1f0ff",
          100: "#e3e0ff",
          200: "#c8c2ff",
          300: "#a59bff",
          400: "#8676ff",
          500: "#6e56ff",
          600: "#5b3df0",
          700: "#4a2fd0",
          800: "#3a25a8",
          900: "#2c1c80"
        },
        sun: {
          300: "#ffd166",
          400: "#ffb800",
          500: "#ff9500"
        },
        mint: {
          300: "#8af0c4",
          400: "#4cdf9b",
          500: "#1fb978"
        },
        coral: {
          300: "#ffb4a8",
          400: "#ff8a73",
          500: "#ff6347"
        },
        ink: {
          50: "#fbfaff",
          100: "#f3f1fb",
          200: "#e7e3f7",
          400: "#9d97c4",
          600: "#5e5887",
          800: "#2b2750",
          900: "#191534"
        },
        surface: {
          0: "#ffffff",
          1: "#fffdf8",
          2: "#f6f4fe"
        },
        border: {
          DEFAULT: "#e7e3f7",
          subtle: "#efedf9",
          strong: "#cfc8f0"
        }
      },
      boxShadow: {
        pop: "0 4px 0 0 #cfc8f0",
        "pop-sm": "0 2px 0 0 #cfc8f0",
        "pop-brand": "0 4px 0 0 #4a2fd0",
        card: "0 2px 0 0 rgba(43, 39, 80, 0.06), 0 1px 2px rgba(43, 39, 80, 0.04)"
      },
      backgroundImage: {
        "grad-brand": "linear-gradient(135deg, #8676ff 0%, #6e56ff 100%)",
        "grad-sun": "linear-gradient(135deg, #ffd166 0%, #ff9500 100%)"
      },
      ringColor: {
        DEFAULT: "#6e56ff"
      }
    }
  },
  plugins: []
};

