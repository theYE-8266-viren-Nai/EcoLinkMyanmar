"use client";

import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
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
    <span className="brand-mark">
      <span className="brand-mark__icon" aria-hidden="true"><Recycle size={compact ? 18 : 22} /></span>
      <span className="brand-mark__copy">
        <strong>Eco<span>Link</span></strong>
        {compact ? null : <small>Myanmar recycling network</small>}
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, markAllNotificationsRead, resetDemo } = useEcoLink();
  const { user } = useSupabaseUser();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [memberCode, setMemberCode] = useState(state.user.memberCode);
  const unread = state.notifications.filter((item) => !item.read).length;
  const metadataName = typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name : undefined;
  const displayName = metadataName ?? user?.email?.split("@")[0] ?? state.user.displayName;
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    if (DEMO_MODE || !user) return;
    let cancelled = false;
    void syncCurrentProfile().then((result) => {
      if (!cancelled && result.ok) setMemberCode(result.profile.member_code);
    });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!assistantOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAssistantOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [assistantOpen]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link href="/" aria-label="EcoLink home"><EcoLinkMark /></Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link className={pathname === href ? "nav-link is-active" : "nav-link"} href={href} key={href} aria-current={pathname === href ? "page" : undefined}>
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <div className="popover-anchor">
            <button className="icon-button" type="button" aria-label={`Notifications, ${unread} unread`} aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }}>
              <Bell size={20} />{unread > 0 ? <span className="notification-dot">{unread}</span> : null}
            </button>
            {notificationsOpen ? (
              <section className="header-popover notification-panel" aria-label="Notifications">
                <div className="popover-heading"><div><strong>Notifications</strong><span>{unread} unread</span></div><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={18} /></button></div>
                <div className="notification-list">
                  {state.notifications.length === 0 ? <p className="empty-copy">You are all caught up.</p> : state.notifications.slice(0, 5).map((item) => (
                    <Link href={item.href} key={item.id} className={item.read ? "notification-item" : "notification-item is-unread"} onClick={() => setNotificationsOpen(false)}>
                      <span><strong>{item.title}</strong><small>{item.message}</small></span>{item.read ? <Check size={16} /> : <i />}
                    </Link>
                  ))}
                </div>
                {unread > 0 ? <button className="popover-action" type="button" onClick={markAllNotificationsRead}>Mark all as read</button> : null}
              </section>
            ) : null}
          </div>
          {!user ? (
            <Link className="profile-button" href="/sign-in"><span>EL</span><div><strong>Sign in</strong><small>Access your EcoLink account</small></div></Link>
          ) : (
            <div className="popover-anchor">
              <button className="profile-button" type="button" aria-label="Open profile and member code" aria-expanded={profileOpen} onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }}>
                <span>{initials}</span><div><strong>{displayName}</strong><small>{memberCode}</small></div>
              </button>
              {profileOpen ? (
                <section className="header-popover profile-panel" aria-label="Member profile">
                  <div className="popover-heading"><div><strong>{displayName}</strong><span>EcoLink member</span></div><button type="button" onClick={() => setProfileOpen(false)} aria-label="Close profile"><X size={18} /></button></div>
                  <div className="member-code-card"><QrCode size={52} /><span><small>Member code</small><strong>{memberCode}</strong></span></div>
                  <p>Show this code when a partner center needs to identify your EcoLink profile.</p>
                  <div className="profile-account-row"><span>Account and sign out</span><EcoLinkUserButton /></div>
                  {DEMO_MODE ? (
                    <button className="profile-reset" type="button" onClick={() => { resetDemo(); setProfileOpen(false); }}><RotateCcw size={17} /> Reset demo data</button>
                  ) : null}
                </section>
              ) : null}
            </div>
          )}
        </div>
      </header>
      <div className="page-frame">{children}</div>
      <div className={assistantOpen ? "eco-bot-dock is-open" : "eco-bot-dock"}>
        {assistantOpen ? (
          <section className="eco-bot-panel" aria-label="EcoGuide assistant">
            <div className="eco-bot-panel__bar">
              <div>
                <strong>EcoGuide</strong>
                <span>Ask about recycling, points, reports, and rewards</span>
              </div>
              <button type="button" aria-label="Close EcoGuide assistant" onClick={() => setAssistantOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <FaqAssistantScreen mode="panel" />
          </section>
        ) : null}
        <button
          type="button"
          className="eco-bot-launcher"
          aria-label={assistantOpen ? "Close EcoGuide assistant" : "Open EcoGuide assistant"}
          aria-expanded={assistantOpen}
          onClick={() => {
            setAssistantOpen((value) => !value);
            setNotificationsOpen(false);
            setProfileOpen(false);
          }}
        >
          <Image alt="" aria-hidden="true" height={68} priority src="/eco-guide-bot.svg" width={84} />
          <span>EcoGuide</span>
        </button>
      </div>
      <BottomNavigation
        aria-label="Mobile navigation"
        className="mobile-nav"
        showLabels
        value={NAV_ITEMS.find((item) => item.href === pathname)?.href ?? false}
      >
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <BottomNavigationAction
            aria-current={pathname === href ? "page" : undefined}
            component={Link}
            href={href}
            icon={<Icon size={21} aria-hidden="true" />}
            key={href}
            label={label}
            value={href}
          />
        ))}
      </BottomNavigation>
    </div>
  );
}
