import RegisterForm from "@/features/auth/components/register-form";
import RegisterShell from "@/features/auth/components/register-shell";


function getSafeCallbackUrl(callbackUrl?: string | string[]) {
  const value = Array.isArray(callbackUrl)
    ? (callbackUrl[0] ?? "")
    : (callbackUrl ?? "");

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ callbackUrl?: string | string[] }> }) {
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);

  return (
    <RegisterShell>
      <RegisterForm callbackUrl={callbackUrl} />
    </RegisterShell>
  );
}
