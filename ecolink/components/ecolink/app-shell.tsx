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
import { Bell, Check, CircleGauge, House, MapPinned, QrCode, Recycle, RotateCcw, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { syncCurrentProfile } from "@/actions/profile";
import { EcoLinkUserButton } from "@/components/auth/user-button";
import { FaqAssistantScreen } from "@/features/faq-assistant/components/faq-assistant-screen";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { useEcoLink } from "@/providers/ecolink-context";

const DEMO_MODE = process.env.NEXT_PUBLIC_ECOLINK_DEMO_MODE === "true";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: House },
  { href: "/dashboard", label: "Impact", Icon: CircleGauge },
  { href: "/recycle", label: "Recycle", Icon: MapPinned },
  { href: "/report", label: "Report", Icon: Recycle },
] as const;

export function EcoLinkMark({ compact = false }: { compact?: boolean }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: compact ? 32 : 38,
          height: compact ? 32 : 38,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          color: "primary.main",
          bgcolor: "rgba(8, 124, 120, 0.1)",
        }}
      >
        <Recycle size={compact ? 16 : 20} />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 800,
            color: "secondary.main",
            lineHeight: 1,
            fontSize: compact ? "0.95rem" : "1.05rem",
          }}
        >
          Eco<Box component="span" sx={{ color: "primary.main" }}>Link</Box>
        </Typography>
        {!compact && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.65rem",
              fontWeight: 650,
            }}
          >
            Myanmar recycling network
          </Typography>
        )}
      </Box>
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
  const { state, markAllNotificationsRead, resetDemo } = useEcoLink();
  const { user } = useSupabaseUser();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [memberCode, setMemberCode] = useState(state.user.memberCode);

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

  useEffect(() => {
    if (DEMO_MODE || !user) return;
    let cancelled = false;
    void syncCurrentProfile().then((result) => {
      if (!cancelled && result.ok) setMemberCode(result.profile.member_code);
    }).catch((error) => {
      if (!cancelled) console.warn("EcoLink profile sync failed", error);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Assist dialog keyboard listener
  useEffect(() => {
    if (!assistantOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAssistantOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [assistantOpen]);

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
          width: "100%",
          maxWidth: 480,
          height: "100dvh",
          bgcolor: "background.default",
          boxShadow: { sm: 3 },
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
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
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between", minHeight: 56, px: 2 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <EcoLinkMark compact />
            </Link>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              {/* Notification Button */}
              <IconButton
                aria-label={`Notifications, ${unread} unread`}
                color="inherit"
                onClick={() => setNotificationsOpen(true)}
                size="medium"
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
                    minHeight: 32,
                    fontSize: "0.75rem",
                  }}
                >
                  Sign in
                </Button>
              ) : (
                <IconButton
                  aria-label="Open profile and member code"
                  onClick={() => setProfileOpen(true)}
                  size="small"
                  sx={{ border: "1.5px solid", borderColor: "divider", p: 0.25 }}
                >
                  <Avatar sx={{ width: 28, height: 28, fontSize: "0.75rem", bgcolor: "secondary.main" }}>
                    {initials}
                  </Avatar>
                </IconButton>
              )}
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: disableScroll ? "hidden" : "auto",
            position: "relative",
            bgcolor: "background.default",
            p: disablePadding ? 0 : 2,
            pb: disableScroll ? 0 : "80px", // space for bottom navigation
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
            bottom: 76,
            right: 16,
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
            aria-label="Open EcoGuide assistant"
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
                EcoGuide
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
            height: 60,
          }}
        >
          <BottomNavigation
            showLabels
            value={activeTabValue}
            sx={{ height: "100%" }}
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
                  py: 0.5,
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
                maxWidth: 480,
                mx: "auto",
              },
            },
          }}
        >
          <Box sx={{ p: 2, display: "flex", flexDirection: "column" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Notifications</Typography>
                <Typography variant="caption" color="text.secondary">{unread} unread</Typography>
              </Box>
              <IconButton onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">
                <X size={20} />
              </IconButton>
            </Stack>
            <Divider />
            <List sx={{ maxHeight: "350px", overflowY: "auto", py: 0 }}>
              {state.notifications.length === 0 ? (
                <Typography sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                  You are all caught up.
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
                Mark all as read
              </Button>
            )}
          </Box>
        </Drawer>

        {/* Profile & Member Code Bottom Drawer */}
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
                maxWidth: 480,
                mx: "auto",
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
                  <Typography variant="caption" color="text.secondary">EcoLink Member</Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setProfileOpen(false)} aria-label="Close profile">
                <X size={20} />
              </IconButton>
            </Stack>
            <Divider />

            {/* Member Code QR Card */}
            <Paper
              elevation={0}
              sx={{
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
                my: 2.5,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  bgcolor: "background.paper",
                  p: 1,
                  borderRadius: 1,
                  border: "1.5px solid",
                  borderColor: "divider",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <QrCode size={52} />
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  MEMBER CODE
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, fontSize: "1.1rem", color: "secondary.main" }}>
                  {memberCode}
                </Typography>
              </Box>
            </Paper>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Show this code when a partner center needs to identify your EcoLink profile.
            </Typography>

            <Stack spacing={2} sx={{ mb: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary">Account and sign out</Typography>
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
                  Reset demo data
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
                maxWidth: 480,
                mx: "auto",
              },
            },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>EcoGuide Assistant</Typography>
                <Typography variant="caption" color="text.secondary">
                  Ask about recycling, points, reports, and rewards
                </Typography>
              </Box>
              <IconButton onClick={() => setAssistantOpen(false)} aria-label="Close assistant">
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
