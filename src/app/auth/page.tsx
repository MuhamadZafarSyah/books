import { redirect } from "next/navigation";

type AuthIndexPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: AuthIndexPageProps) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        nextParams.append(key, item);
      }
      continue;
    }

    if (value) {
      nextParams.set(key, value);
    }
  }

  const target = nextParams.size
    ? `/auth/login?${nextParams.toString()}`
    : "/auth/login";

  redirect(target);
}
