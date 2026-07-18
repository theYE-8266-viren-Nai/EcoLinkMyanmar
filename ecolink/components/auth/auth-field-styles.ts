import type { SxProps, Theme } from "@mui/material/styles";

export const authTextFieldSx: SxProps<Theme> = {
  "& .MuiFilledInput-root": {
    minHeight: 64,
  },
  "& .MuiFilledInput-input": {
    fontSize: "1.125rem",
    lineHeight: 1.5,
    paddingBottom: "9px",
    paddingTop: "29px",
  },
  "& .MuiInputLabel-root": {
    fontSize: "1.125rem",
  },
  "& .MuiInputLabel-filled.MuiInputLabel-shrink": {
    transform: "translate(12px, 7px) scale(0.85)",
  },
};
