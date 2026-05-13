import { z } from "zod";

function isBlankOrHttpUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const editProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(80, "Nama maksimal 80 karakter."),
  username: z
    .string()
    .trim()
    .max(30, "Username maksimal 30 karakter.")
    .refine(
      (value) => value === "" || value.length >= 3,
      "Username minimal 3 karakter.",
    )
    .refine(
      (value) => value === "" || /^[A-Za-z0-9_]+$/.test(value),
      "Username hanya boleh memakai huruf, angka, dan underscore.",
    ),
  bio: z.string().trim().max(280, "Bio maksimal 280 karakter."),
  location: z.string().trim().max(80, "Lokasi maksimal 80 karakter."),
  image: z
    .string()
    .trim()
    .max(500, "URL foto terlalu panjang.")
    .refine(isBlankOrHttpUrl, "URL foto harus diawali http:// atau https://."),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;
