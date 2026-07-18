"use client";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import { useI18n, type Language } from "@/lib/i18n";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={language}
      aria-label={t("language.toggleLabel")}
      onChange={(_, nextLanguage: Language | null) => {
        if (nextLanguage) setLanguage(nextLanguage);
      }}
      sx={{
        bgcolor: "background.default",
        borderRadius: 999,
        p: 0.25,
        "& .MuiToggleButton-root": {
          border: 0,
          borderRadius: 999,
          minWidth: compact ? 44 : 48,
          minHeight: 44,
          px: compact ? 1 : 1.25,
          py: 0.5,
          fontSize: compact ? "0.66rem" : "0.72rem",
          fontWeight: 800,
          textTransform: "none",
        },
      }}
    >
      <ToggleButton aria-label={t("language.english")} value="en">
        EN
      </ToggleButton>
      <ToggleButton aria-label={t("language.burmese")} value="my">
        မြန်
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
