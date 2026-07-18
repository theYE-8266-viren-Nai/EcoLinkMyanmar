"use client";

import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import { Bell, Bot, Check, CircleGauge, House, MapPinned, QrCode, Recycle, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { syncCurrentProfile } from "@/actions/profile";
import { EcoLinkUserButton } from "@/components/auth/user-button";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { useEcoLink } from "@/providers/ecolink-context";

const DEMO_MODE = process.env.NEXT_PUBLIC_ECOLINK_DEMO_MODE === "true";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: House },
  { href: "/dashboard", label: "Impact", Icon: CircleGauge },
  { href: "/recycle", label: "Recycle", Icon: MapPinned },
  { href: "/assistant", label: "Guide", Icon: Bot },
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
                  <p>Show this code when dropping off recyclables at a partner center.</p>
                  <div className="profile-account-row"><span>Account and sign out</span><EcoLinkUserButton /></div>
                  <button className="profile-reset" type="button" onClick={() => { resetDemo(); setProfileOpen(false); }}><RotateCcw size={17} /> Reset demo data</button>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </header>
      <div className="page-frame">{children}</div>
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
