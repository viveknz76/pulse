import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun, UsersRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { MemberAvatar } from "./MemberAvatar";
import { IconActionButton } from "./IconActionButton";
import { PulseMark } from "./PulseBrand";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

function DashboardIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="2" width="7" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M1.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 12.3c2.3.3 4 1.9 4 4.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <path
        d="M4 3h9l3 3v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M6.5 9h7M6.5 12.5h5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function NavItem({
  to,
  active,
  icon,
  label,
  collapsed,
}: {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  const link = (
    <Link
      to={to}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
        collapsed && "justify-center px-0",
        active
          ? "bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand-border"
          : "text-muted-foreground hover:translate-x-0.5 hover:bg-overlay-subtle hover:text-foreground",
        collapsed && "hover:translate-x-0"
      )}
    >
      {icon}
      {!collapsed && label}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  const isPeopleActive = pathname.startsWith("/team/") || pathname === "/team" || pathname.startsWith("/check-ins");
  const isTeamsActive = pathname.startsWith("/teams");
  const isReviewActive = pathname.startsWith("/review");
  const isCalendarActive = pathname.startsWith("/calendar");
  const isDashboardActive = !isPeopleActive && !isTeamsActive && !isReviewActive && !isCalendarActive;

  const name = user?.name || user?.email || "";

  return (
    <div className="flex min-h-screen w-full gap-4 bg-background p-4 text-foreground">
      <aside
        className={cn(
          "flex shrink-0 flex-col p-3 transition-[width] duration-200",
          collapsed ? "w-[4.75rem]" : "w-[var(--sidebar-width)]"
        )}
      >
        <div className={cn("mb-8", collapsed ? "flex justify-center" : "px-1")}>
          {collapsed ? (
            <PulseMark />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <PulseMark />
                  <span className="text-xl font-bold tracking-[-0.035em] text-foreground">Pulse</span>
                </div>
                <IconActionButton
                  label="Collapse sidebar"
                  icon={<PanelLeftClose />}
                  onClick={() => setCollapsed(true)}
                />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Thoughtful check-ins, meaningful momentum.
              </p>
            </>
          )}
        </div>
        {collapsed && (
          <IconActionButton
            label="Expand sidebar"
            icon={<PanelLeftOpen />}
            onClick={() => setCollapsed(false)}
            className="mb-4 self-center"
          />
        )}
        <nav className="flex flex-1 flex-col gap-1">
          <NavItem to="/" active={isDashboardActive} icon={<DashboardIcon />} label="Dashboard" collapsed={collapsed} />
          <NavItem to="/team" active={isPeopleActive} icon={<TeamIcon />} label="People" collapsed={collapsed} />
          <NavItem
            to="/teams"
            active={isTeamsActive}
            icon={<UsersRound className="size-[17px]" />}
            label="Teams"
            collapsed={collapsed}
          />
          <NavItem to="/review" active={isReviewActive} icon={<ReviewIcon />} label="Review" collapsed={collapsed} />
          <NavItem
            to="/calendar"
            active={isCalendarActive}
            icon={<CalendarDays className="size-[17px]" />}
            label="Calendar"
            collapsed={collapsed}
          />
        </nav>
        <div
          className={cn(
            "flex items-center gap-2.5 border-t border-border pt-4",
            collapsed && "flex-col gap-3"
          )}
        >
          {collapsed ? (
            <>
              <MemberAvatar id={name || "?"} name={name} size="sm" />
              <IconActionButton label="Sign out" icon={<LogOut />} onClick={() => logout()} />
            </>
          ) : (
            <>
              <MemberAvatar id={name || "?"} name={name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{name}</div>
                <button
                  className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => logout()}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
          <IconActionButton
            label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            icon={theme === "dark" ? <Sun /> : <Moon />}
            onClick={toggleTheme}
          />
        </div>
      </aside>
      <main
        className="relative flex-1 overflow-y-auto rounded-2xl bg-panel p-10 ring-1 ring-overlay-strong"
        style={{ boxShadow: "var(--surface-shadow)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
        <Outlet />
      </main>
    </div>
  );
}
