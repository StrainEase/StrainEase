export type AppNavId = "home" | "find" | "directory" | "doctors";

export type DashboardMode =
  | "find"
  | "directory"
  | "compare"
  | "history"
  | "checkins";

export const HOME_HREF = "/";
/** The "Browse" tab. Hosted by `StrainBrowse` (the recommendation form). */
export const BROWSE_HREF = "/dashboard";
/** The "Find" tab. Hosted by `StrainFind` (the catalog browser). */
export const FIND_HREF = "/dashboard?mode=directory";
export const DOCTORS_HREF = "/doctors";
export const HISTORY_HREF = "/dashboard?mode=history";
export const CHECKINS_HREF = "/dashboard?mode=checkins";
export const REPORT_HREF = "/report";

export const APP_NAV: { id: AppNavId; to: string; label: string }[] = [
  { id: "home", to: HOME_HREF, label: "Home" },
  { id: "find", to: BROWSE_HREF, label: "Browse" },
  { id: "directory", to: FIND_HREF, label: "Find" },
  { id: "doctors", to: DOCTORS_HREF, label: "Doctors" },
];

export function dashboardModeFromSearch(mode: string | null): DashboardMode {
  if (
    mode === "directory" ||
    mode === "compare" ||
    mode === "history" ||
    mode === "checkins"
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
