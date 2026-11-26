export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        areia: "#F6F2EA",
        papel: "#FFFDF9",
        tinta: "#1C1917",
        azulejo: "#1D4ED8",
        sol: "#F59E0B",
        pitanga: "#E11D48",
        folha: "#059669",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
