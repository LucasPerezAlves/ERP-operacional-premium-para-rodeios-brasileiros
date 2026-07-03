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
          500: "#6b4227",
        },
        // Couro desgastado — superfícies e bordas
        leather: {
          700: "#573a24",
          600: "#6f4a2f",
          500: "#8b5e3c",
          400: "#a9764f",
          300: "#c69a6d",
          200: "#e0c3a0",
        },
        // Ferrugem — ERRO ("metal oxidado" da tabela de feedback)
        rust: {
          950: "#2b0e04",
          600: "#8f3208",
          500: "#b7410e",
          400: "#d05a1f",
          300: "#e8824a",
          200: "#f3ab80",
        },
        // Dourado fosco — marca, CTA, foco e sucesso (ferradura dourada)
        gold: {
          700: "#86691a",
          600: "#a8861f",
          500: "#c9a227",
          400: "#d4af37",
          300: "#e6c65c",
          200: "#f2dd94",
        },
        // Aço envelhecido — neutros frios: desabilitado, meta-info, divisores
        // (substitui todo uso de stone-*; ver DESIGN-SYSTEM.md)
        steel: {
          950: "#131413",
          900: "#1d1f1e",
          800: "#2a2d2b",
          700: "#3b3f3d",
          600: "#4f5451",
          500: "#676c68",
          400: "#838883",
          300: "#a3a7a2",
          200: "#c6c9c4",
        },
        // Tons escuros de arena — fundo de página único e overlays
        // (o "arena-dark" do CLAUDE.md; substitui bg-black)
        arena: {
          950: "#0c0906",
          900: "#141009",
          800: "#1c1610",
        },
        // Verde-pasto — EXCLUSIVO para valores financeiros positivos
        // (sobra, troco); confirmação de ação é dourado, nunca verde
        campo: {
          950: "#131a0d",
          900: "#1d2913",
          700: "#354a20",
          500: "#57773b",
          400: "#719551",
          300: "#94b278",
        },
        // Vinho de lampião — EXCLUSIVO para destrutivo e SOS
        bordo: {
          950: "#250b0a",
          900: "#3c1210",
          800: "#531a17",
          700: "#6c231f",
          500: "#943630",
          400: "#b24a40",
          300: "#d1786c",
          200: "#e2a196",
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
        // Deriva muito lenta do grão/ruído (couro cru sob holofote)
        "grain-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1.04)" },
          "50%": { transform: "translate3d(-1.5%, 1%, 0) scale(1.08)" },
        },
        // Reflexo metálico: varredura de brilho no latão (1x por hover, nunca loop)
        "brilho-metalico": {
          "0%": { transform: "translateX(-150%) skewX(-15deg)" },
          "100%": { transform: "translateX(250%) skewX(-15deg)" },
        },
        // Lampião: tremulação irregular de chama — EXCLUSIVO do SOS ativo
        lampiao: {
          "0%, 100%": { opacity: "1" },
          "9%": { opacity: "0.82" },
          "14%": { opacity: "0.96" },
          "26%": { opacity: "0.78" },
          "34%": { opacity: "0.92" },
          "49%": { opacity: "0.85" },
          "61%": { opacity: "1" },
          "73%": { opacity: "0.8" },
          "84%": { opacity: "0.94" },
        },
        // Ferradura acendendo: transição de status do caixa (fechado → aberto)
        "ferradura-acende": {
          "0%": { opacity: "0.35", transform: "scale(0.92)" },
          "60%": { opacity: "1", transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Pulso de latão: brilho quente sutil na borda — EXCLUSIVO de avisos
        "pulso-latao": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212, 175, 55, 0)" },
          "50%": { boxShadow: "0 0 14px 0 rgba(212, 175, 55, 0.3)" },
        },
        // Malote guardando o dinheiro: assentamento curto (sangria registrada)
        "malote-guarda": {
          "0%": { opacity: "0.6", transform: "translateY(-6px) scale(0.98)" },
          "60%": { opacity: "1", transform: "translateY(1px) scale(1.01)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Porteira deslizando: entrada do drawer de navegação no mobile
        "porteira-abre": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "dust-rise": "dust-rise 14s linear infinite",
        "lasso-spin": "lasso-spin 1.1s linear infinite",
        "horseshoe-pulse": "horseshoe-pulse 2.2s ease-in-out infinite",
        "spotlight-flicker": "spotlight-flicker 7s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "grain-drift": "grain-drift 9s ease-in-out infinite",
        "brilho-metalico": "brilho-metalico 0.7s ease-out both",
        lampiao: "lampiao 2.8s linear infinite",
        "ferradura-acende": "ferradura-acende 0.5s ease-out both",
        "pulso-latao": "pulso-latao 2.4s ease-in-out infinite",
        "malote-guarda": "malote-guarda 0.45s cubic-bezier(0.32, 0.72, 0, 1) both",
        "porteira-abre": "porteira-abre 0.3s cubic-bezier(0.32, 0.72, 0, 1) both",
      },
      // Curvas de transição customizadas (ver DESIGN-SYSTEM.md § Animação)
      transitionTimingFunction: {
        label: "cubic-bezier(0.4, 0, 0.2, 1)",
        heavy: "cubic-bezier(0.83, 0, 0.17, 1)",
        // Peso de couro: easing padrão de todo elemento interativo
        couro: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};
