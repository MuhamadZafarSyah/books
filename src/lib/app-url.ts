function normalizeAppUrl(value: string) {
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

export function getAppUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (envUrl) {
    return normalizeAppUrl(envUrl);
  }

  return "http://localhost:3000";
}
