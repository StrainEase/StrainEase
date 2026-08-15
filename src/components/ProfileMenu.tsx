import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "·";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/**
 * Top-right profile control. Opens a small dropdown with the user's
 * name, a link to Account Settings, and Sign Out. Replaces the bare
 * Sign-out button that used to live in the header.
 */
export function ProfileMenu({
  onOpenSettings,
  className,
}: {
  onOpenSettings: () => void;
  className?: string;
}) {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-background text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          className,
        )}
        aria-label="Open profile menu"
      >
        <span className="flex size-9 items-center justify-center">
          {initials(user.name)}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-60 border-border/70 shadow-none"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <User className="size-3.5" />
            Signed in as
          </span>
          <span className="truncate text-sm font-medium text-foreground">
            {user.name}
          </span>
          {user.email && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onOpenSettings();
          }}
          className="cursor-pointer"
        >
          <Settings className="size-4" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
          className="cursor-pointer"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}