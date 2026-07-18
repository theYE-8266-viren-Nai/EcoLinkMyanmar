"use client";

import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";

const muiTheme = createTheme({
  cssVariables: true,
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: "var(--font-ecolink-sans)",
    button: {
      fontWeight: 750,
      letterSpacing: 0,
      textTransform: "none",
    },
  },
  palette: {
    mode: "light",
    primary: {
      main: "#087c78",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#0b3558",
      contrastText: "#ffffff",
    },
    error: {
      main: "#b42318",
    },
    background: {
      default: "#f2f7f7",
      paper: "#ffffff",
    },
    text: {
      primary: "#173547",
      secondary: "#526a75",
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: 44,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        variant: "filled",
      },
    },
  },
});

export function MuiProvider({ children }: { children: ReactNode }) {
  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>;
}
