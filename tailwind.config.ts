import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF6EE",
        card: "#EDE5D0",
        border: "#D6CBAF",
        foreground: "#3D2B1A",
        muted: "#8C6D50",
        primary: "#7A9E7E",
        accent: "#E8A840",
      },
      fontFamily: {
        lora: ["var(--font-lora)", "serif"],
        nunito: ["var(--font-nunito)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
