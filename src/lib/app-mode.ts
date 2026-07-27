export type AppMode = "investor_demo" | "production";

/** Production must be selected explicitly; this early MVP defaults to demo. */
export function getAppMode(): AppMode {
  return process.env.APP_MODE === "production" ? "production" : "investor_demo";
}

export function isInvestorDemo(): boolean {
  return getAppMode() === "investor_demo";
}
