import { AccountSettingsDialog } from "@/components/AccountSettingsDialog";
import { CompareTray } from "@/components/compare/CompareTray";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/hooks/use-auth";
import { useCompareSelection } from "@/hooks/use-compare-selection";
import {
  APP_NAV,
  DIRECTORY_HREF,
  FIND_HREF,
  SAVED_HREF,
  type AppNavId,
} from "@/lib/app-nav";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Heart,
  Home,
  Library,
  Search,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

const ICONS: Record<AppNavId, typeof Home> = {
  home: Home,
  find: Search,
  directory: BookOpen,
  doctors: Stethoscope,
};

export type { AppNavId };

export function AppCompareTray({
  onCompare,
  isRunning = false,
}: {
  onCompare?: () => void;
  isRunning?: boolean;
}) {
  const selection = useCompareSelection();
  const navigate = useNavigate();
  return (
    <CompareTray
      selection={selection}
      onCompare={
        onCompare ??
        (() => navigate(`${FIND_HREF}?mode=compare`))
      }
      isRunning={isRunning}
      className="bottom-[4.75rem] pb-3 sm:bottom-0 sm:pb-[env(safe-area-inset-bottom)]"
    />
  );
}

export function AppHeader({
  active,
  favorites = false,
  onCompare,
  isComparing = false,
}: {
  active?: AppNavId;
  favorites?: boolean;
  onCompare?: () => void;
  isComparing?: boolean;
}) {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            to={SAVED_HREF}
            aria-label="Favorites"
            aria-current={favorites ? "page" : undefined}
            className={cn(
              "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
              favorites && "border-primary/40 bg-primary/10 text-primary",
            )}
          >
            <Heart className="size-4" strokeWidth={favorites ? 2.4 : 2} />
          </Link>
          <Link
            to={DIRECTORY_HREF}
            aria-label="Open strain library"
            className="hidden shrink-0 cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex"
          >
            <Library className="size-4" />
            Library
          </Link>
        </div>

        <nav
          className="hidden items-center gap-1 sm:flex"
          aria-label="App"
        >
          {APP_NAV.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium",
                active === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <ProfileMenu onOpenSettings={() => setSettingsOpen(true)} />
          ) : (
            <Link
              to="/auth"
              className="rounded-full border border-border/70 px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
        <AccountSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      </div>
      <AppCompareTray onCompare={onCompare} isRunning={isComparing} />
    </header>
  );
}

export function AppTabBar({ active }: { active?: AppNavId }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md sm:hidden"
      aria-label="App"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {APP_NAV.map((item) => {
          const Icon = ICONS[item.id];
          const isOn = active === item.id;
          return (
            <Link
              key={item.id}
              to={item.to}
              aria-current={isOn ? "page" : undefined}
              className={cn(
                "flex min-h-11 min-w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-medium",
                isOn ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon
                className="size-5"
                strokeWidth={isOn ? 2.4 : 2}
                fill={isOn ? "currentColor" : "none"}
                fillOpacity={isOn ? 0.18 : 0}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
