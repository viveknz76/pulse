import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MemberAvatar } from "./MemberAvatar";
import { cn } from "@/lib/utils";

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
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-foreground"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const isTeamActive = pathname.startsWith("/team") || pathname.startsWith("/check-ins");
  const isReviewActive = pathname.startsWith("/review");
  const isDashboardActive = !isTeamActive && !isReviewActive;

  const name = user?.name || user?.email || "";

  return (
    <div className="flex min-h-screen w-full gap-4 bg-background p-4 text-foreground">
      <aside className="flex w-[var(--sidebar-width)] shrink-0 flex-col p-3">
        <div className="mb-8 pl-1 text-xl font-semibold tracking-tight">Pulse</div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavItem to="/" active={isDashboardActive}>
            <DashboardIcon />
            Dashboard
          </NavItem>
          <NavItem to="/team" active={isTeamActive}>
            <TeamIcon />
            Team
          </NavItem>
          <NavItem to="/review" active={isReviewActive}>
            <ReviewIcon />
            Review
          </NavItem>
        </nav>
        <div className="flex items-center gap-2.5 border-t border-border pt-4">
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
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto rounded-lg bg-panel p-10 ring-1 ring-white/10">
        <Outlet />
      </main>
    </div>
  );
}
