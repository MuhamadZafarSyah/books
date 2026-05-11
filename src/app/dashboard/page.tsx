import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/session";

export default async function Page() {
  const user = await requireAuth();

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <Card className="mx-auto max-w-2xl rounded-3xl">
        <CardHeader>
          <CardTitle className="normal-case tracking-normal">
            Welcome to Shelfgram
          </CardTitle>
          <CardDescription>
            You are signed in as {user.email ?? "a verified reader"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logout}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
