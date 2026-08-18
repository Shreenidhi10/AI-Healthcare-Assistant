/** @type {import('tailwindcss').Config} */

module.exports = {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },

    extend: {
      fontFamily: {
        sans: ["'Atkinson Hyperlegible Next'", "sans-serif"],
        display: ["'Manrope'", "sans-serif"],
        manrope: ["'Manrope'", "sans-serif"],
        atkinson: ["'Atkinson Hyperlegible Next'", "sans-serif"],
        "headline-lg-mobile": ["Manrope"],
        "headline-lg": ["Manrope"],
        "label-bold": ["Atkinson Hyperlegible Next"],
        "body-md": ["Atkinson Hyperlegible Next"],
        "headline-md": ["Manrope"],
        "body-sm": ["Atkinson Hyperlegible Next"],
        "body-lg": ["Atkinson Hyperlegible Next"],
        "headline-sm": ["Manrope"]
      },

      fontSize: {
        "headline-lg-mobile": ["26px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "label-bold": ["14px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }]
      },

      spacing: {
        "margin-mobile": "16px",
        "stack-lg": "32px",
        "unit": "8px",
        "stack-md": "16px",
        "stack-sm": "8px",
        "margin-desktop": "40px",
        "container-max": "1280px",
        "gutter": "24px"
      },

      colors: {
        // MedPulse Material 3 Colors
        "tertiary-container": "#576068",
        "secondary-container": "#75f999",
        "on-secondary-fixed-variant": "#005225",
        "outline": "#727783",
        "tertiary": "#404850",
        "on-tertiary": "#ffffff",
        "on-background": "#191c1e",
        "surface-variant": "#e0e3e5",
        "error": "#ba1a1a",
        "on-surface": "#191c1e",
        "surface-container-high": "#e6e8ea",
        "on-tertiary-fixed-variant": "#3f484f",
        "secondary-fixed-dim": "#5adf82",
        "primary-fixed": "#d6e3ff",
        "primary": {
          DEFAULT: "#00478d",
          container: "#005eb8",
          fixed: "#d6e3ff",
          "fixed-dim": "#a9c7ff",
          "on-container": "#c8daff",
          "on-fixed": "#001b3d",
          "on-fixed-variant": "#00468c",
          foreground: "#ffffff",
        },
        "surface-container": "#eceef0",
        "secondary": {
          DEFAULT: "#006d33",
          container: "#75f999",
          fixed: "#78fc9c",
          "fixed-dim": "#5adf82",
          "on-container": "#007236",
          "on-fixed": "#00210b",
          "on-fixed-variant": "#005225",
          foreground: "#ffffff",
        },
        "on-secondary": "#ffffff",
        "surface-tint": "#005db6",
        "surface-container-low": "#f2f4f6",
        "on-tertiary-fixed": "#141d23",
        "inverse-on-surface": "#eff1f3",
        "on-secondary-container": "#007236",
        "tertiary-fixed": "#dbe4ed",
        "tertiary-fixed-dim": "#bfc8d0",
        "inverse-primary": "#a9c7ff",
        "surface-container-highest": "#e0e3e5",
        "outline-variant": "#c2c6d4",
        "inverse-surface": "#2d3133",
        "error-container": "#ffdad6",
        "on-primary": "#ffffff",
        "on-secondary-fixed": "#00210b",
        "on-error-container": "#93000a",
        "secondary-fixed": "#78fc9c",
        "background": "#f7f9fb",
        "surface-container-lowest": "#ffffff",
        "surface": "#f7f9fb",
        "on-primary-container": "#c8daff",
        "on-primary-fixed-variant": "#00468c",
        "surface-bright": "#f7f9fb",
        "on-error": "#ffffff",
        "primary-container": "#005eb8",
        "primary-fixed-dim": "#a9c7ff",
        "on-tertiary-container": "#d1dae4",
        "surface-dim": "#d8dadc",
        "on-primary-fixed": "#001b3d",
        "on-surface-variant": "#424752",

        // Additional UI theme tokens for radix/shadcn compatibility
        border: "#c2c6d4",
        input: "#c2c6d4",
        ring: "#00478d",
        foreground: "#191c1e",
        muted: {
          DEFAULT: "#eceef0",
          foreground: "#424752",
        },
        accent: {
          DEFAULT: "#75f999",
          foreground: "#005225",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#191c1e",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#191c1e",
        },
        success: {
          DEFAULT: "#006d33",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#e67e22",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#ba1a1a",
          foreground: "#ffffff",
        },
      },

      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px"
      },

      boxShadow: {
        card: "0 2px 12px rgba(0, 71, 141, 0.05)",
        floating: "0 10px 30px rgba(0, 71, 141, 0.12)",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },

      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.35s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },

  plugins: [
    require("tailwindcss-animate"),
  ],
};