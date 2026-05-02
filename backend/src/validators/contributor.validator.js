import { z } from "zod";

const percentageSchema = z
  .number({
    required_error: "Percentage is required",
    invalid_type_error: "Percentage must be a number",
  })
  .min(0, "Percentage cannot be negative")
  .max(100, "Percentage cannot be greater than 100");

const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password is too long");

const contributorSchemaBase = z.object({
  name: z.string().trim().min(1, "Contributor name is required").max(120),
  fatherName: z
    .string()
    .trim()
    .min(1, "Contributor father name is required")
    .max(120),
  phoneNumber: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 digits")
    .max(30),
  percentage: percentageSchema,
});

export const createContributorSchema = contributorSchemaBase.extend({
  password: passwordSchema,
});

export const updateContributorSchema = contributorSchemaBase.extend({
  password: passwordSchema,
});

export const deleteContributorSchema = z.object({
  password: passwordSchema,
});
