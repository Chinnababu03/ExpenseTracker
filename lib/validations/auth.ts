import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().trim().min(1, "Display name is required").max(100),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Display name cannot be empty").max(100),
  currency: z
    .string()
    .trim()
    .length(3, "Currency code must be exactly 3 uppercase letters (e.g. INR, USD, EUR)")
    .transform((val) => val.toUpperCase()),
  timezone: z.string().trim().min(1, "Timezone cannot be empty").max(60),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
