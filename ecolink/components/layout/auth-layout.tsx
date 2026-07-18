"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Leaf } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { useI18n, type TranslationKey } from "@/lib/i18n";

export type AuthLayoutProps = {
  children: ReactNode;
  description?: string;
  descriptionKey?: TranslationKey;
  title?: string;
  titleKey?: TranslationKey;
};

export function AuthLayout({
  children,
  description,
  descriptionKey,
  title,
  titleKey,
}: AuthLayoutProps) {
  const { t } = useI18n();
  const resolvedTitle = titleKey ? t(titleKey) : title;
  const resolvedDescription = descriptionKey ? t(descriptionKey) : description;

  return (
    <Box
      component="main"
      sx={{
        bgcolor: "#e4ecee",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        px: 2,
        py: { xs: 3, sm: 6 },
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
          gap: 2,
        }}
      >
        {/* Brand link */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
          <LanguageToggle compact />
        </Box>

        {/* Title and description */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "secondary.main" }}>
            {resolvedTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {resolvedDescription}
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
