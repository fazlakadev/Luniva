import type { Config } from "tailwindcss";

/** Maps the site's CSS custom properties into Tailwind utilities with alpha support. */
function token(variable: string) {
  return ({
    opacityValue,
    opacityVariable,
  }: {
    opacityValue?: string | number;
    opacityVariable?: string;
  }) => {
    if (opacityValue !== undefined) {
      return `color-mix(in srgb, var(${variable}) ${Number(opacityValue) * 100}%, transparent)`;
    }
    if (opacityVariable) {
      return `color-mix(in srgb, var(${variable}) calc(${opacityVariable} * 100%), transparent)`;
    }
    return `var(${variable})`;
  };
}

// Tailwind supports color functions at runtime, but its published Config type only
// allows strings and nested colour maps, hence the narrow cast at the end.
const config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: token("--bg"),
        foreground: token("--ink"),
        card: {
          DEFAULT: token("--surface"),
          foreground: token("--ink"),
        },
        muted: {
          DEFAULT: token("--surface-3"),
          foreground: token("--muted"),
        },
        border: token("--line"),
        ring: token("--brand"),
        burgundy: {
          50: "#fdf5f7",
          100: "#fce6eb",
          200: "#f4c2ce",
          300: "#e995a9",
          400: "#dc6681",
          500: "#c73e5e",
          600: "#9e2a44",
          700: "#851e35",
          800: "#6e1529",
          900: "#551020",
          950: "#380612",
        },
        purple: {
          50: "#fdf5f7",
          100: "#fce6eb",
          200: "#f4c2ce",
          300: "#e995a9",
          400: "#dc6681",
          500: "#c73e5e",
          600: "#9e2a44",
          700: "#851e35",
          800: "#6e1529",
          900: "#551020",
          950: "#380612",
        },
      },
    },
  },
  plugins: [],
};

export default config as unknown as Config;
