"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Leaf } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type AuthLayoutProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export function AuthLayout({
  children,
  description,
  title,
}: AuthLayoutProps) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        bgcolor: "#e4ecee",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
      }}
    >
      <Container
        maxWidth="xs"
        disableGutters
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 3,
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        {/* Brand link */}
        <Box sx={{ display: "inline-flex" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Box
              sx={{
                borderRadius: 1.5,
                bgcolor: "rgba(8, 124, 120, 0.1)",
                p: 1,
                display: "grid",
                placeItems: "center",
                color: "primary.main",
              }}
            >
              <Leaf aria-hidden="true" size={16} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main", letterSpacing: 0.5 }}>
              EcoLink
            </Typography>
          </Link>
        </Box>

        {/* Title and description */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "secondary.main" }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        </Box>

        <Divider />

        {/* Auth form children */}
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
          {children}
        </Box>
      </Container>
    </Box>
  );
}

function Divider() {
  return <Box sx={{ height: "1px", bgcolor: "divider", width: "100%" }} />;
}
