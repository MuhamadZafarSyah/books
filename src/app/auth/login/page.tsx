import LoginForm from "@/features/auth/components/login-form";
import LoginShell from "@/features/auth/components/login-shell";

export default function Page() {
  return (
    <LoginShell>
      <LoginForm />
    </LoginShell>
  );
}
