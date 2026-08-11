import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        device: {
          bg: "#0b1220",
          panel: "#111a2e",
          accent: "#4f8cff",
          accent2: "#22d3ee",
        },
      },
    },
  },
  plugins: [],
};

export default config;
