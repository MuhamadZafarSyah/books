import RegisterForm from "@/features/auth/components/register-form";
import RegisterShell from "@/features/auth/components/register-shell";

export default function Page() {
  return (
    <RegisterShell>
      <RegisterForm />
    </RegisterShell>
  );
}
