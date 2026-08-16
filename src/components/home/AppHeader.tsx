import { AccountSettingsDialog } from "@/components/AccountSettingsDialog";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { BookOpen, Home, Library, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

export type AppNavId = "home" | "find" | "directory";

const DIRECTORY_HREF = "/dashboard?mode=directory";

const NAV: { id: AppNavId; to: string; label: string; icon: typeof Home }[] = [
  { id: "home", to: "/", label: "Home", icon: Home },
  { id: "find", to: "/dashboard", label: "Find", icon: Search },
  {
    id: "directory",
    to: DIRECTORY_HREF,
    label: "Browse",
    icon: BookOpen,
  },
];

export function AppHeader({ active }: { active?: AppNavId }) {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const onDirectory = active === "directory";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to={DIRECTORY_HREF}
          aria-label="Open strain library"
          aria-current={onDirectory ? "page" : undefined}
          className={cn(
            "flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary",
            onDirectory
              ? "border-primary/40 bg-primary/10 text-primary"
              : "text-muted-foreground",
          )}
        >
          <Library className="size-4" strokeWidth={onDirectory ? 2.4 : 2} />
          <span className="hidden sm:inline">Library</span>
        </Link>
        <nav
          className="hidden items-center gap-1 sm:flex"
          aria-label="App"
        >
          {NAV.map((item) => (
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
    </header>
  );
}

export function AppTabBar({ active }: { active?: AppNavId }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:hidden"
      aria-label="App"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isOn = active === item.id;
          return (
            <Link
              key={item.id}
              to={item.to}
              className={cn(
                "flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium",
                isOn ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={isOn ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
