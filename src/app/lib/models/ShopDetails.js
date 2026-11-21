import mongoose from "mongoose";
import { SHOP_CATEGORIES } from "@/app/lib/validation/shop";

const shopDetailsSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    ownerName: { type: String, default: "", trim: true },
    shopName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    marketName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    address: { type: String, required: true, trim: true, minlength: 5, maxlength: 240 },
    category: { type: String, required: true, enum: SHOP_CATEGORIES.map(({ value }) => value) },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    image: {
      data: { type: Buffer, required: true },
      contentType: { type: String, required: true, enum: ["image/jpeg", "image/png", "image/webp"] },
      fileName: { type: String, required: true, maxlength: 100 },
      size: { type: Number, required: true, max: 2 * 1024 * 1024 },
    },
  },
  { collection: "Shop_details", timestamps: true, versionKey: false },
);

shopDetailsSchema.index({ ownerEmail: 1 }, { unique: true });

const ShopDetails = mongoose.models.ShopDetails || mongoose.model("ShopDetails", shopDetailsSchema);

export default ShopDetails;
