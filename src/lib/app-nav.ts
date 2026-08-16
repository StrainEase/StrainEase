export type AppNavId = "home" | "find" | "directory" | "doctors";

export type DashboardMode =
  | "find"
  | "directory"
  | "compare"
  | "saved"
  | "history";

export const HOME_HREF = "/";
export const FIND_HREF = "/dashboard";
export const DIRECTORY_HREF = "/dashboard?mode=directory";
export const DOCTORS_HREF = "/doctors";
export const SAVED_HREF = "/dashboard?mode=saved";
export const HISTORY_HREF = "/dashboard?mode=history";

export const APP_NAV: { id: AppNavId; to: string; label: string }[] = [
  { id: "home", to: HOME_HREF, label: "Home" },
  { id: "find", to: FIND_HREF, label: "Find" },
  { id: "directory", to: DIRECTORY_HREF, label: "Browse" },
  { id: "doctors", to: DOCTORS_HREF, label: "Doctors" },
];

export function dashboardModeFromSearch(mode: string | null): DashboardMode {
  if (
    mode === "directory" ||
    mode === "compare" ||
    mode === "saved" ||
    mode === "history"
  ) {
    return mode;
  }
  return "find";
}

/** Which bottom-tab is current for a dashboard mode. Saved/compare/history are not tabs. */
export function dashboardTab(mode: DashboardMode): AppNavId | undefined {
  if (mode === "directory") return "directory";
  if (mode === "find") return "find";
  return undefined;
}
