import { z } from "zod";

export const SHOP_CATEGORIES = [
  { value: "clothing", label: "Clothing & textiles" },
  { value: "footwear", label: "Footwear" },
  { value: "groceries", label: "Groceries & produce" },
  { value: "food", label: "Food & drinks" },
  { value: "electronics", label: "Electronics" },
  { value: "home", label: "Home & lifestyle" },
  { value: "services", label: "Services" },
  { value: "other", label: "Other" },
];

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

export const shopSetupSchema = z.object({
  shopName: z.string().trim().min(2, "Enter at least 2 characters.").max(100, "Keep the shop name under 100 characters."),
  marketName: z.string().trim().min(2, "Enter the market or local area.").max(100, "Keep the market name under 100 characters."),
  address: z.string().trim().min(5, "Enter a more complete address.").max(240, "Keep the address under 240 characters."),
  category: z.enum(SHOP_CATEGORIES.map(({ value }) => value), { error: "Choose a business category." }),
  phone: z.string().trim().regex(/^\+?[0-9][0-9\s()-]{7,17}$/, "Enter a valid contact number, including country code if needed."),
  photo: z.custom(
    (value) => typeof File !== "undefined" && value instanceof File && value.size > 0 && value.size <= 2 * 1024 * 1024 && allowedImageTypes.includes(value.type),
    { error: "Choose a JPG, PNG, or WebP image under 2 MB." },
  ),
});
