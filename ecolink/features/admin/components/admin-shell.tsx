"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { ClipboardCheck, ExternalLink, Menu, Recycle, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { EcoLinkMark } from "@/components/ecolink/app-shell";

type AdminSection = "recycling" | "reports";

const DRAWER_WIDTH = 256;
const NAVIGATION = [
  { description: "Routes and submissions", href: "/admin/recycling", icon: Recycle, id: "recycling", label: "Recycling" },
  { description: "Moderation queue", href: "/admin/reports", icon: ClipboardCheck, id: "reports", label: "Reports" },
] as const;

export function AdminShell({
  activeSection,
  children,
  description,
  isRefreshing,
  onRefresh,
  title,
}: {
  activeSection: AdminSection;
  children: ReactNode;
  description: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  title: string;
}) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  const navigation = (
    <Stack sx={{ height: "100%" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", minHeight: 72, px: 2.5 }}>
        <Box component={Link} href="/" aria-label="EcoLink home" sx={{ color: "inherit", display: "inline-flex" }}>
          <EcoLinkMark compact />
        </Box>
        <IconButton
          aria-label="Close admin navigation"
          onClick={() => setMobileNavigationOpen(false)}
          sx={{ display: { md: "none" }, minHeight: 48, minWidth: 48 }}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
      </Stack>
      <Divider />
      <Box sx={{ px: 2.5, pb: 1, pt: 2.5 }}>
        <Typography variant="subtitle2" color="text.primary">Admin operations</Typography>
        <Typography variant="caption" color="text.secondary">Trust and data management</Typography>
      </Box>
      <List component="nav" aria-label="Admin navigation" sx={{ px: 1.5, py: 1 }}>
        {NAVIGATION.map((item) => {
          const Icon = item.icon;
          const selected = activeSection === item.id;
          return (
            <ListItemButton
              aria-current={selected ? "page" : undefined}
              component={Link}
              href={item.href}
              key={item.id}
              onClick={() => setMobileNavigationOpen(false)}
              selected={selected}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                minHeight: 56,
                px: 1.5,
                "&.Mui-selected": { bgcolor: "rgba(8, 124, 120, 0.10)" },
                "&.Mui-selected:hover": { bgcolor: "rgba(8, 124, 120, 0.14)" },
              }}
            >
              <ListItemIcon sx={{ color: selected ? "primary.main" : "text.secondary", minWidth: 38 }}>
                <Icon size={19} aria-hidden="true" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.description}
                slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 750 } }, secondary: { sx: { fontSize: 12 } } }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ mt: "auto", p: 1.5 }}>
        <ListItemButton component={Link} href="/" sx={{ borderRadius: 1, minHeight: 48 }}>
          <ListItemIcon sx={{ minWidth: 38 }}><ExternalLink size={18} aria-hidden="true" /></ListItemIcon>
          <ListItemText primary="Citizen website" slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 700 } } }} />
        </ListItemButton>
      </Box>
    </Stack>
  );

  return (
    <Box component="main" sx={{ bgcolor: "background.default", color: "text.primary", minHeight: "100dvh" }}>
      <AppBar
        color="inherit"
        elevation={0}
        position="fixed"
        sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "rgba(255,255,255,0.96)", ml: { md: `${DRAWER_WIDTH}px` }, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ gap: 1.5, minHeight: { xs: 64, md: 72 } }}>
          <IconButton
            aria-label="Open admin navigation"
            onClick={() => setMobileNavigationOpen(true)}
            sx={{ display: { md: "none" }, minHeight: 48, minWidth: 48 }}
          >
            <Menu size={21} aria-hidden="true" />
          </IconButton>
          <Box sx={{ display: { xs: "inline-flex", md: "none" }, flex: 1 }}><EcoLinkMark compact /></Box>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", display: { xs: "none", md: "flex" }, flex: 1 }}>
            <Box aria-hidden="true" sx={{ bgcolor: "success.main", borderRadius: "50%", height: 8, width: 8 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>Admin operations</Typography>
              <Typography variant="caption" color="text.secondary">Trust and data management</Typography>
            </Box>
          </Stack>
          <Button
            color="secondary"
            disabled={isRefreshing}
            onClick={onRefresh}
            startIcon={<RefreshCw className={isRefreshing ? "spin" : undefined} size={17} aria-hidden="true" />}
            variant="outlined"
            sx={{ minHeight: 48, whiteSpace: "nowrap" }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{isRefreshing ? "Refreshing…" : "Refresh data"}</Box>
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>{isRefreshing ? "Refreshing…" : "Refresh"}</Box>
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        open={mobileNavigationOpen}
        onClose={() => setMobileNavigationOpen(false)}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}
      >
        {navigation}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          "& .MuiDrawer-paper": { bgcolor: "#f8fafa", borderRightColor: "divider", boxSizing: "border-box", width: DRAWER_WIDTH },
        }}
      >
        {navigation}
      </Drawer>

      <Box sx={{ ml: { md: `${DRAWER_WIDTH}px` }, pt: { xs: "64px", md: "72px" } }}>
        <Box sx={{ marginInline: "auto", maxWidth: 1440, px: { xs: 2, sm: 3, lg: 5 }, py: { xs: 3, sm: 4, lg: 5 } }}>
          <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
            <Typography component="h1" variant="h4" sx={{ color: "secondary.main", fontSize: { xs: "1.55rem", md: "1.9rem" }, fontWeight: 800, letterSpacing: "-0.025em" }}>
              {title}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760, lineHeight: 1.6 }}>
              {description}
            </Typography>
          </Box>
          <Stack spacing={{ xs: 2, md: 3 }}>{children}</Stack>
        </Box>
      </Box>
    </Box>
  );
}

export function AdminMetrics({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Paper aria-label={label} variant="outlined" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, overflow: "hidden" }}>
      {children}
    </Paper>
  );
}

export function AdminMetric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <Box sx={{ alignItems: "center", borderBottom: { xs: 1, sm: 0 }, borderColor: "divider", borderRight: { sm: 1 }, display: "grid", gap: 0.25, gridTemplateColumns: "1fr auto", minWidth: 0, p: { xs: 2, md: 2.25 }, "&:last-child": { borderBottom: 0, borderRight: 0 } }}>
      <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 700 }}>{label}</Typography>
      <Typography color="secondary.main" sx={{ fontSize: "1.5rem", fontVariantNumeric: "tabular-nums", fontWeight: 800, gridColumn: 2, gridRow: "1 / span 2" }}>{value}</Typography>
      <Typography color="text.secondary" variant="caption">{detail}</Typography>
    </Box>
  );
}
