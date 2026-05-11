import SetPasswordForm from "@/features/auth/components/set-password-form";
import SetPasswordShell from "@/features/auth/components/set-password-shell";

type SetPasswordRouteProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function Page({ searchParams }: SetPasswordRouteProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token)
    ? (params.token[0] ?? "")
    : (params.token ?? "");

  return (
    <SetPasswordShell>
      <SetPasswordForm token={token} />
    </SetPasswordShell>
  );
}
