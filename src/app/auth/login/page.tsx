import LoginForm from "@/features/auth/components/login-form";
import LoginShell from "@/features/auth/components/login-shell";

type LoginRouteProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

function getSafeCallbackUrl(callbackUrl?: string | string[]) {
  const value = Array.isArray(callbackUrl)
    ? (callbackUrl[0] ?? "")
    : (callbackUrl ?? "");

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default async function Page({ searchParams }: LoginRouteProps) {
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);

  return (
    <LoginShell>
      <LoginForm callbackUrl={callbackUrl} />
    </LoginShell>
  );
}
