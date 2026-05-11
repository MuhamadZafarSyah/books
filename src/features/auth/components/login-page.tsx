"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { loginWithCredentials, loginWithGoogle } from "@/actions/auth";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
    loginSchema,
    type LoginFormValues,
} from "@/features/auth/schemas/auth-schemas";
import { ThemeToggle } from "@/components/theme-toggle";

const noiseBackground =
    "url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')";

const readingCornerImage =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuANT1Vw7l_nFCWLjBoauUol2cB6ZnDAvVxQ_dBpzkZEqBqhCiqbGzJIdiRGkEtu160cuApO-96zB5nVdxooERUrctnVoTKcu512NKUrdEc8-Z1keewKPfIbiI3z1k_yZPsA5k5FPdao4TkTRDvN4vY4ELsh2MRtayUiPBf9SANcqz3ZpG2sLLKLF4L7per4StTPh6vmUGv4R82sZcaRmV7zKq5KYHbpNsbep_-YBiu38U22qjUrN1cHjvxOrSUdAjD9AY2tXgZm-3s";

function LoginPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    function onSubmit(values: LoginFormValues) {
        startTransition(async () => {
            const result = await loginWithCredentials(values.email, values.password);

            if (!result.success) {
                toast.error(result.error ?? "Unable to sign in.");
                return;
            }

            toast.success("Signed in successfully.");
            router.replace("/dashboard");
            router.refresh();
        });
    }

    const handleLoginWithGoogle = async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error("Login error:", error);
            toast.error("Gagal login dengan Google. Silakan coba lagi.");
        }
    };

    return (
        <div className="relative min-h-screen bg-background text-foreground">
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-10 opacity-[0.03]"
                style={{ backgroundImage: noiseBackground }}
            />

            <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
                <section className="relative hidden overflow-hidden bg-muted/40 lg:flex">
                    <div className="absolute inset-0">
                        <div
                            aria-label="Cozy reading corner"
                            className="h-full w-full bg-cover bg-center"
                            role="img"
                            style={{ backgroundImage: `url(${readingCornerImage})` }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-primary/80 via-primary/30 to-primary/10 mix-blend-multiply" />
                    </div>

                    <div className="relative z-10 flex h-full flex-col px-12 py-14 text-primary-foreground xl:px-16 xl:py-16">
                        <div className="text-2xl font-heading italic tracking-wide">
                            Shelfgram
                        </div>

                        <ThemeToggle />

                        <div className="mt-auto max-w-xl space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="mt-2 h-16 w-1 bg-secondary" />
                                <h1 className="font-heading text-4xl italic leading-tight xl:text-5xl">
                                    &quot;A room without books is like a body without a
                                    soul.&quot;
                                </h1>
                            </div>
                            <p className="text-base text-primary-foreground/80">
                                Welcome to a modern reading universe. Join our community of
                                curators and bibliophiles.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="relative flex items-center justify-center px-6 py-12 sm:px-10">
                    <Card className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 gap-6 bg-transparent py-0 shadow-none ring-0 duration-700">
                        <CardHeader className="px-0">
                            <div className="mb-8 text-center lg:hidden">
                                <span className="text-2xl font-heading italic text-primary">
                                    Shelfgram
                                </span>
                            </div>
                            <CardTitle className="text-2xl normal-case tracking-normal">
                                Sign in to your account
                            </CardTitle>
                            <CardDescription>
                                Enter your details below to continue.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="px-0">
                            <form
                                className="space-y-6"
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-sm normal-case tracking-normal text-muted-foreground"
                                    >
                                        Email Address
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="reader@example.com"
                                            autoComplete="email"
                                            disabled={isPending}
                                            aria-invalid={Boolean(errors.email)}
                                            className="h-12 rounded-2xl border border-input bg-background px-10 text-sm shadow-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                                            {...register("email")}
                                        />
                                    </div>
                                    {errors.email ? (
                                        <p className="text-sm font-medium text-destructive">
                                            {errors.email.message}
                                        </p>
                                    ) : null}
                                </div>

                                <PasswordInput
                                    id="password"
                                    label="Password"
                                    labelAddon={
                                        <Link
                                            className="text-xs font-semibold text-secondary-foreground transition-colors hover:text-primary"
                                            href="#"
                                        >
                                            Forgot password?
                                        </Link>
                                    }
                                    labelClassName="text-sm normal-case tracking-normal text-muted-foreground"
                                    placeholder="********"
                                    autoComplete="current-password"
                                    disabled={isPending}
                                    error={errors.password?.message}
                                    inputClassName="h-12 rounded-2xl border border-input bg-background pl-4 pr-12 text-sm shadow-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                                    {...register("password")}
                                />

                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="h-12 w-full rounded-2xl text-sm font-semibold normal-case tracking-normal shadow-lg shadow-primary/10"
                                >
                                    Sign In
                                    <ArrowRight className="size-4" />
                                </Button>
                            </form>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-6 px-0">
                            <div className="flex w-full items-center gap-3">
                                <Separator className="flex-1" />
                                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                                    Or
                                </span>
                                <Separator className="flex-1" />
                            </div>

                            <Button
                                onClick={handleLoginWithGoogle}
                                type="button"
                                variant="outline"
                                className="h-12 w-full rounded-2xl text-sm font-semibold normal-case tracking-normal"
                            >
                                <svg
                                    className="size-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.81 15.72 17.59V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.72 17.59C14.73 18.25 13.48 18.66 12 18.66C9.13 18.66 6.7 16.73 5.82 14.14H2.15V16.99C3.96 20.59 7.69 23 12 23Z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.82 14.14C5.59 13.48 5.46 12.76 5.46 12C5.46 11.24 5.59 10.52 5.82 9.86V7.01H2.15C1.4 8.51 1 10.21 1 12C1 13.79 1.4 15.49 2.15 16.99L5.82 14.14Z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.34C13.62 5.34 15.06 5.89 16.2 6.98L19.36 3.82C17.45 2.03 14.97 1 12 1C7.69 1 3.96 3.41 2.15 7.01L5.82 9.86C6.7 7.27 9.13 5.34 12 5.34Z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Continue with Google
                            </Button>

                            <p className="text-center text-sm text-muted-foreground">
                                Don&apos;t have an account?{" "}
                                <Link
                                    href="/auth/register"
                                    className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
                                >
                                    Sign Up
                                </Link>
                            </p>
                        </CardFooter>
                    </Card>
                </section>
            </div>
        </div>
    );
}

export default LoginPage;
