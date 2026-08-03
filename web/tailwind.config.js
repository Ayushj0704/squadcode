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
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-900)"
        },
        sun: {
          100: "var(--sun-100)",
          300: "var(--sun-300)",
          400: "var(--sun-400)",
          500: "var(--sun-500)"
        },
        mint: {
          100: "var(--mint-100)",
          300: "var(--mint-300)",
          400: "var(--mint-400)",
          500: "var(--mint-500)"
        },
        coral: {
          100: "var(--coral-100)",
          300: "var(--coral-300)",
          400: "var(--coral-400)",
          500: "var(--coral-500)"
        },
        ink: {
          50: "var(--ink-50)",
          100: "var(--ink-100)",
          200: "var(--ink-200)",
          400: "var(--ink-400)",
          600: "var(--ink-600)",
          800: "var(--ink-800)",
          900: "var(--ink-900)"
        },
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)"
        },
        border: {
          DEFAULT: "var(--border-default)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)"
        }
      },
      boxShadow: {
        pop: "0 4px 0 0 var(--shadow-pop)",
        "pop-sm": "0 2px 0 0 var(--shadow-pop)",
        "pop-brand": "0 4px 0 0 var(--shadow-pop-brand)",
        card: "0 2px 0 0 var(--shadow-card), 0 1px 2px var(--shadow-card-sm)"
      },
      backgroundImage: {
        "grad-brand": "linear-gradient(135deg, var(--brand-400) 0%, var(--brand-500) 100%)",
        "grad-sun": "linear-gradient(135deg, var(--sun-300) 0%, var(--sun-500) 100%)"
      },
      ringColor: {
        DEFAULT: "var(--brand-500)"
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ]
};

