import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "var(--bg-void)",
        panel: "var(--bg-panel)",
        "panel-raised": "var(--bg-panel-raised)",
        hairline: "var(--border-hairline)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
        teal: "var(--signal-teal)",
        amber: "var(--signal-amber)",
        "red-muted": "var(--signal-red-muted)",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      fontSize: {
        "page-title": ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        "section-header": ["18px", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        "metric-lg": ["24px", { lineHeight: "1.2", fontWeight: "500" }],
        "metric-sm": ["13px", { lineHeight: "1.4", fontWeight: "400" }],
        eyebrow: ["11px", { lineHeight: "1.4", fontWeight: "600", letterSpacing: "0.08em" }],
      },
      borderRadius: {
        card: "4px",
        badge: "2px",
        none: "0px",
      },
      width: {
        sidebar: "260px",
      },
    },
  },
  plugins: [],
};

export default config;
