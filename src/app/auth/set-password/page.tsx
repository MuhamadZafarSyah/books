import SetPasswordPage from "@/features/auth/components/set-password-page";

type SetPasswordRouteProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function Page({ searchParams }: SetPasswordRouteProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token)
    ? (params.token[0] ?? "")
    : (params.token ?? "");

  return <SetPasswordPage token={token} />;
}
