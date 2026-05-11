import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
});

export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(
        /\d|[^A-Za-z0-9]/,
        "Password must include a number or special character.",
      ),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;
