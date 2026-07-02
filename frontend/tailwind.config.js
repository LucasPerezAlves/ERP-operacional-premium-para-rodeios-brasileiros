/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Corpo/inputs: sem serifa limpa
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        // Títulos: slab "Western Moderno"
        display: ["'Alfa Slab One'", "'Zilla Slab'", "serif"],
      },
      colors: {
        // Madeira profunda — estrutura da arena
        wood: {
          950: "#120a05",
          900: "#1c1008",
          800: "#2b1a0e",
          700: "#3d2515",
          600: "#54331f",
        },
        // Couro desgastado — superfícies e bordas
        leather: {
          600: "#6f4a2f",
          500: "#8b5e3c",
          400: "#a9764f",
          300: "#c69a6d",
          200: "#e0c3a0",
        },
        // Ferrugem — erros e alertas
        rust: {
          600: "#8f3208",
          500: "#b7410e",
          400: "#d05a1f",
          300: "#e8824a",
        },
        // Dourado fosco — destaque premium (CTA, focos, títulos)
        gold: {
          600: "#a8861f",
          500: "#c9a227",
          400: "#d4af37",
          300: "#e6c65c",
          200: "#f2dd94",
        },
      },
      boxShadow: {
        // Brilho quente de holofote sobre o CTA dourado
        spotlight: "0 0 24px -4px rgba(212, 175, 55, 0.45)",
        arena: "0 24px 60px -20px rgba(0, 0, 0, 0.85)",
      },
      keyframes: {
        // Poeira da arena subindo lentamente sob os holofotes
        "dust-rise": {
          "0%": { transform: "translateY(0) translateX(0)", opacity: "0" },
          "12%": { opacity: "0.55" },
          "60%": { opacity: "0.28" },
          "100%": {
            transform: "translateY(-92vh) translateX(18px)",
            opacity: "0",
          },
        },
        // Corda de laço girando (aplicada ao SVG de loading)
        "lasso-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        // Ferradura pulsando (estado de sucesso)
        "horseshoe-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.12)", opacity: "0.75" },
        },
        // Oscilação sutil do holofote sobre a arena
        "spotlight-flicker": {
          "0%, 100%": { opacity: "0.9" },
          "45%": { opacity: "0.72" },
          "55%": { opacity: "0.84" },
        },
        // Entrada do cartão de autenticação
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "dust-rise": "dust-rise 14s linear infinite",
        "lasso-spin": "lasso-spin 1.1s linear infinite",
        "horseshoe-pulse": "horseshoe-pulse 2.2s ease-in-out infinite",
        "spotlight-flicker": "spotlight-flicker 7s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
