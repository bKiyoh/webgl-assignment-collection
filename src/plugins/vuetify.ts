import "vuetify/styles";
import { createVuetify } from "vuetify";

export const vuetify = createVuetify({
  theme: {
    defaultTheme: "portfolioDark",
    themes: {
      portfolioDark: {
        dark: true,
        colors: {
          background: "#0c0a09",
          surface: "#171412",
          primary: "#22c55e",
          secondary: "#27272a",
          "on-background": "#f5f5f5",
          "on-surface": "#f5f5f5",
        },
      },
    },
  },
  defaults: {
    VAppBar: {
      elevation: 0,
    },
    VNavigationDrawer: {
      elevation: 8,
    },
  },
});
