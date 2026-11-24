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
          50: "#fdf2f4",
          100: "#fbe6e9",
          200: "#f6ced5",
          300: "#eea7b4",
          400: "#e1758a",
          500: "#b83d58",
          600: "#800020",
          700: "#6e001c",
          800: "#580417",
          900: "#490614",
          950: "#2a020a",
        },
        purple: {
          50: "#fdf2f4",
          100: "#fbe6e9",
          200: "#f6ced5",
          300: "#eea7b4",
          400: "#e1758a",
          500: "#b83d58",
          600: "#800020",
          700: "#6e001c",
          800: "#580417",
          900: "#490614",
          950: "#2a020a",
        },
      },
    },
  },
  plugins: [],
};

export default config as unknown as Config;
