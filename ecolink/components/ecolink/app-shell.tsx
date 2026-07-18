"use client";

import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Bell, Check, CircleGauge, House, MapPinned, Recycle, RotateCcw, WifiOff, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { EcoLinkUserButton } from "@/components/auth/user-button";
import { LanguageToggle } from "@/components/language-toggle";
import { FaqAssistantScreen } from "@/features/faq-assistant/components/faq-assistant-screen";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { useI18n } from "@/lib/i18n";
import { useEcoLink } from "@/providers/ecolink-context";

const DEMO_MODE = process.env.NEXT_PUBLIC_ECOLINK_DEMO_MODE === "true";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: House },
  { href: "/dashboard", label: "Impact", Icon: CircleGauge },
  { href: "/recycle", label: "Recycle", Icon: MapPinned },
  { href: "/report", label: "Report", Icon: Recycle },
] as const;

export function EcoLinkMark({ compact = false }: { compact?: boolean }) {
  const size = compact ? 40 : 48;

  return (
    <Box
      aria-label="EcoLink"
      role="img"
      sx={{
        alignItems: "center",
        display: "inline-flex",
        gap: compact ? 0.75 : 1,
        minWidth: 0,
      }}
    >
      <Image
        alt=""
        aria-hidden="true"
        height={size}
        priority
        src="/ecolink-logo-mark.png"
        style={{ display: "block", height: size, objectFit: "contain", width: size }}
        width={size}
      />
      <Typography
        aria-hidden="true"
        component="span"
        sx={{
          color: "#0f4c67",
          display: "block",
          fontSize: compact ? 18 : 22,
          fontWeight: 800,
          letterSpacing: 0,
          lineHeight: 1,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        EcoLink
      </Typography>
    </Box>
  );
}

export function AppShell({
  children,
  disableScroll = false,
  disablePadding = false,
}: {
  children: ReactNode;
  disableScroll?: boolean;
  disablePadding?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { state, markAllNotificationsRead, resetDemo } = useEcoLink();
  const { user } = useSupabaseUser();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [offline, setOffline] = useState(false);

  const unread = state.notifications.filter((item) => !item.read).length;
  const metadataName =
    typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name : undefined;
  const displayName = metadataName ?? user?.email?.split("@")[0] ?? state.user.displayName;
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Assist dialog keyboard listener
  useEffect(() => {
    if (!assistantOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAssistantOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [assistantOpen]);

  useEffect(() => {
    const updateNetworkState = () => setOffline(!navigator.onLine);
    updateNetworkState();
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);
    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
    };
  }, []);

  const activeTabValue = NAV_ITEMS.some((item) => item.href === pathname) ? pathname : false;

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "#e4ecee",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          "--ecolink-safe-area-top": "env(safe-area-inset-top, 0px)",
          "--ecolink-safe-area-left": "env(safe-area-inset-left, 0px)",
          "--ecolink-safe-area-right": "env(safe-area-inset-right, 0px)",
          "--ecolink-bottom-nav-height": "64px",
          "--ecolink-bottom-nav-safe-area": "env(safe-area-inset-bottom, 0px)",
          "--ecolink-bottom-nav-clearance": "calc(var(--ecolink-bottom-nav-height) + var(--ecolink-bottom-nav-safe-area))",
          width: "100%",
          maxWidth: { xs: "none", sm: 480 },
          height: "100dvh",
          bgcolor: "background.default",
          boxShadow: { sm: 3 },
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          "@media (display-mode: standalone)": {
            maxWidth: "none",
            boxShadow: "none",
          },
        }}
      >
        {/* Header (AppBar) */}
        <AppBar
          elevation={0}
          position="static"
          sx={{
            bgcolor: "background.paper",
            color: "text.primary",
            borderBottom: "1px solid",
            borderColor: "divider",
            pt: "var(--ecolink-safe-area-top)",
          }}
        >
          <Toolbar
            sx={{
              justifyContent: "space-between",
              minHeight: 56,
              pl: "calc(12px + var(--ecolink-safe-area-left))",
              pr: "calc(12px + var(--ecolink-safe-area-right))",
              gap: 1,
            }}
          >
            <Link href="/" style={{ textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
              <EcoLinkMark compact />
            </Link>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <LanguageToggle compact />
              {/* Notification Button */}
              <IconButton
                aria-label={t("shell.notifications", { count: unread })}
                color="inherit"
                onClick={() => setNotificationsOpen(true)}
                size="medium"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <Badge badgeContent={unread} color="error">
                  <Bell size={20} />
                </Badge>
              </IconButton>

              {/* Profile/User Button */}
              {!user ? (
                <Button
                  component={Link}
                  href="/sign-in"
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: "20px",
                    px: 2,
                    minHeight: 44,
                    fontSize: "0.75rem",
                  }}
                >
                  {t("shell.signIn")}
                </Button>
              ) : (
                <IconButton
                  aria-label={t("shell.openProfile")}
                  onClick={() => setProfileOpen(true)}
                  size="medium"
                  sx={{ border: "1.5px solid", borderColor: "divider", p: 0.5, minWidth: 44, minHeight: 44 }}
                >
                  <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", bgcolor: "secondary.main" }}>
                    {initials}
                  </Avatar>
                </IconButton>
              )}
            </Stack>
          </Toolbar>
        </AppBar>

        {offline ? (
          <Box
            role="status"
            sx={{
              minHeight: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              px: "calc(12px + var(--ecolink-safe-area-left))",
              pr: "calc(12px + var(--ecolink-safe-area-right))",
              bgcolor: "rgba(255, 244, 214, 0.96)",
              color: "#7a4b08",
              borderBottom: "1px solid rgba(185, 120, 24, 0.18)",
              fontSize: "0.74rem",
              fontWeight: 800,
            }}
          >
            <WifiOff size={15} aria-hidden="true" />
            {t("shell.offline")}
          </Box>
        ) : null}

        {/* Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minHeight: 0,
            overflowY: disableScroll ? "hidden" : "auto",
            position: "relative",
            bgcolor: "background.default",
            p: disablePadding ? 0 : { xs: 1.5, sm: 2 },
            pl: disablePadding ? 0 : "max(12px, calc(12px + var(--ecolink-safe-area-left)))",
            pr: disablePadding ? 0 : "max(12px, calc(12px + var(--ecolink-safe-area-right)))",
            pb: disableScroll ? 0 : "24px",
            mb: disableScroll ? 0 : "var(--ecolink-bottom-nav-clearance)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </Box>

        {/* EcoGuide Assistant Floating Launcher */}
        <Box
          sx={{
            position: "absolute",
            bottom: "calc(var(--ecolink-bottom-nav-clearance) + 12px)",
            right: "calc(12px + var(--ecolink-safe-area-right))",
            zIndex: 1050,
          }}
        >
          <IconButton
            onClick={() => setAssistantOpen(true)}
            sx={{
              p: 0,
              bgcolor: "transparent",
              transition: "transform 0.2s",
              "&:hover": { transform: "scale(1.08)" },
            }}
            aria-label={t("shell.openAssistant")}
          >
            <Box
              sx={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Image alt="EcoGuide" height={52} priority src="/eco-guide-bot.svg" width={64} />
              <Paper
                elevation={2}
                sx={{
                  mt: -0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: "10px",
                  bgcolor: "primary.main",
                  color: "white",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {t("shell.ecoGuide")}
              </Paper>
            </Box>
          </IconButton>
        </Box>

        {/* Bottom Navigation */}
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            borderTop: "1px solid",
            borderColor: "divider",
            height: "var(--ecolink-bottom-nav-clearance)",
            pb: "var(--ecolink-bottom-nav-safe-area)",
            pl: "var(--ecolink-safe-area-left)",
            pr: "var(--ecolink-safe-area-right)",
          }}
        >
          <BottomNavigation
            showLabels
            value={activeTabValue}
            sx={{
              height: "100%",
              "& .MuiBottomNavigationAction-root": {
                minWidth: 0,
                minHeight: 56,
                py: 0.75,
              },
            }}
          >
            {NAV_ITEMS.map(({ href, label, Icon }) => (
              <BottomNavigationAction
                component={Link}
                href={href}
                icon={<Icon size={20} />}
                key={href}
                label={label}
                value={href}
                sx={{
                  color: "text.secondary",
                  "&.Mui-selected": {
                    color: "primary.main",
                  },
                  minWidth: 0,
                  py: 0.75,
                  "& .MuiBottomNavigationAction-label": {
                    fontSize: "0.68rem",
                    fontWeight: 700,
                  },
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>

        {/* Notifications Bottom Drawer */}
        <Drawer
          anchor="bottom"
          onClose={() => setNotificationsOpen(false)}
          open={notificationsOpen}
          slotProps={{
            paper: {
              sx: {
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                maxHeight: "80dvh",
                width: "100%",
                maxWidth: { xs: "none", sm: 480 },
                mx: "auto",
                "@media (display-mode: standalone)": {
                  maxWidth: "none",
                },
              },
            },
          }}
        >
          <Box sx={{ p: 2, display: "flex", flexDirection: "column" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{t("shell.notificationsTitle")}</Typography>
                <Typography variant="caption" color="text.secondary">{t("shell.unread", { count: unread })}</Typography>
              </Box>
              <IconButton onClick={() => setNotificationsOpen(false)} aria-label={t("shell.closeNotifications")}>
                <X size={20} />
              </IconButton>
            </Stack>
            <Divider />
            <List sx={{ maxHeight: "350px", overflowY: "auto", py: 0 }}>
              {state.notifications.length === 0 ? (
                <Typography sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                  {t("shell.allCaughtUp")}
                </Typography>
              ) : (
                state.notifications.slice(0, 5).map((item) => (
                  <ListItem
                    disablePadding
                    key={item.id}
                    sx={{
                      bgcolor: item.read ? "transparent" : "rgba(8, 124, 120, 0.04)",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <ListItemButton
                      component={Link}
                      href={item.href}
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <ListItemText
                        primary={item.title}
                        secondary={item.message}
                        slotProps={{
                          primary: { variant: "body2", sx: { fontWeight: item.read ? 600 : 800 } },
                          secondary: { variant: "caption", color: "text.secondary" }
                        }}
                      />
                      {item.read ? (
                        <Check size={16} color="grey" />
                      ) : (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
            {unread > 0 && (
              <Button
                fullWidth
                onClick={() => {
                  markAllNotificationsRead();
                  setNotificationsOpen(false);
                }}
                variant="outlined"
                sx={{ mt: 2 }}
              >
                {t("shell.markAllRead")}
              </Button>
            )}
          </Box>
        </Drawer>

        {/* Profile Bottom Drawer */}
        <Drawer
          anchor="bottom"
          onClose={() => setProfileOpen(false)}
          open={profileOpen}
          slotProps={{
            paper: {
              sx: {
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                maxHeight: "85dvh",
                width: "100%",
                maxWidth: { xs: "none", sm: 480 },
                mx: "auto",
                "@media (display-mode: standalone)": {
                  maxWidth: "none",
                },
              },
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar sx={{ bgcolor: "secondary.main" }}>{initials}</Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">{t("shell.member")}</Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setProfileOpen(false)} aria-label={t("shell.closeProfile")}>
                <X size={20} />
              </IconButton>
            </Stack>
            <Divider />

            <Stack spacing={2} sx={{ mt: 2.5, mb: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary">{t("shell.account")}</Typography>
                <EcoLinkUserButton />
              </Box>
              {DEMO_MODE && (
                <Button
                  color="warning"
                  fullWidth
                  onClick={() => {
                    resetDemo();
                    setProfileOpen(false);
                  }}
                  startIcon={<RotateCcw size={16} />}
                  variant="outlined"
                  sx={{ mt: 1 }}
                >
                  {t("shell.resetDemo")}
                </Button>
              )}
            </Stack>
          </Box>
        </Drawer>

        {/* EcoGuide Assistant Drawer */}
        <Drawer
          anchor="bottom"
          onClose={() => setAssistantOpen(false)}
          open={assistantOpen}
          slotProps={{
            paper: {
              sx: {
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                height: "80dvh",
                maxHeight: "80dvh",
                width: "100%",
                maxWidth: { xs: "none", sm: 480 },
                mx: "auto",
                "@media (display-mode: standalone)": {
                  maxWidth: "none",
                },
              },
            },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{t("shell.assistantTitle")}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("shell.assistantSubtitle")}
                </Typography>
              </Box>
              <IconButton onClick={() => setAssistantOpen(false)} aria-label={t("shell.closeAssistant")}>
                <X size={20} />
              </IconButton>
            </Box>
            <Divider />
            <Box sx={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}>
              <FaqAssistantScreen mode="panel" />
            </Box>
          </Box>
        </Drawer>
      </Box>
    </Box>
  );
}
