import { z } from "zod";

export const MAX_CATEGORIES = 3;

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

// Shared by the browser form and the API route, so both apply exactly the same rules.
export const shopSetupSchema = z.object({
  shopName: z.string().trim().min(2, "Enter at least 2 characters.").max(100, "Keep the shop name under 100 characters."),
  marketId: z.uuid({ error: "Choose your market." }),
  stallId: z.uuid({ error: "Choose your stall." }),
  categoryIds: z
    .array(z.uuid(), { error: "Choose at least one category." })
    .min(1, "Choose at least one category.")
    .max(MAX_CATEGORIES, `Choose up to ${MAX_CATEGORIES} categories.`),
  address: z.string().trim().min(5, "Enter a more complete address.").max(240, "Keep the address under 240 characters."),
  phone: z.string().trim().regex(/^\+?[0-9][0-9\s()-]{7,17}$/, "Enter a valid contact number, including country code if needed."),
  photo: z.custom(
    (value) => typeof File !== "undefined" && value instanceof File && value.size > 0 && value.size <= 2 * 1024 * 1024 && allowedImageTypes.includes(value.type),
    { error: "Choose a JPG, PNG, or WebP image under 2 MB." },
  ),
});

/** FormData -> plain object. Preserve every checkbox value for the categories field. */
export function shopFormToObject(formData) {
  return { ...Object.fromEntries(formData.entries()), categoryIds: formData.getAll("categoryIds") };
}

/** Zod issues -> { fieldName: firstMessage }. */
export function fieldErrorsFromIssues(issues) {
  const errors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
