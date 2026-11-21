import { NextResponse } from "next/server";
import { auth, unstable_update } from "@/app/lib/auth/auth";
import { connectMongoose } from "@/app/lib/db/mongoose";
import ShopDetails from "@/app/lib/models/ShopDetails";
import User from "@/app/lib/models/User";
import { shopSetupSchema } from "@/app/lib/validation/shop";

function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  try {
    return Boolean(origin) && new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function getImageTypeFromBytes(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function POST(request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });

  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Sign in with an account that has an email address to continue." }, { status: 401 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Submit the shop details as a form." }, { status: 400 });
  }

  const parsed = shopSetupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return NextResponse.json({ error: "Review the highlighted shop details.", fieldErrors }, { status: 400 });
  }

  const photo = parsed.data.photo;
  const imageBytes = Buffer.from(await photo.arrayBuffer());
  const detectedType = getImageTypeFromBytes(imageBytes);
  if (detectedType !== photo.type) {
    return NextResponse.json({ error: "The uploaded file does not match its image type.", fieldErrors: { photo: "Choose a valid JPG, PNG, or WebP image." } }, { status: 400 });
  }

  const now = new Date();
  const image = {
    data: imageBytes,
    contentType: detectedType,
    fileName: photo.name.split(/[\\/]/).pop().slice(0, 100),
    size: imageBytes.length,
  };
  const email = session.user.email.trim().toLowerCase();
  const shop = {
    ownerId: session.user.id,
    ownerEmail: email,
    ownerName: session.user.name || "",
    shopName: parsed.data.shopName,
    marketName: parsed.data.marketName,
    address: parsed.data.address,
    category: parsed.data.category,
    phone: parsed.data.phone,
    image,
    updatedAt: now,
  };

  try {
    await connectMongoose();
    await ShopDetails.init();
    await User.init();
    await ShopDetails.findOneAndUpdate(
      { ownerEmail: email },
      { $set: shop },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: false },
    );

    await User.updateOne(
      { email },
      {
        $set: { role: "owner", ownerActivatedAt: now },
        $setOnInsert: { email, name: session.user.name || "", createdAt: now },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: false },
    );

    try {
      await unstable_update({ user: { role: "owner" } });
    } catch (sessionError) {
      console.error("Shop was saved but the owner session refresh failed", sessionError?.name || "UnknownError");
    }

    return NextResponse.json({ message: "Shop details saved.", shopName: shop.shopName });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ error: "A shop profile is already linked to this account." }, { status: 409 });
    const errorName = error?.name || "UnknownError";
    const safeMessage = String(error?.message || "").replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[database URI]");
    console.error("Could not save owner shop details", { name: errorName, message: safeMessage, code: error?.code });
    if (errorName === "ValidationError") return NextResponse.json({ error: "Some shop details did not pass database validation. Review the form." }, { status: 400 });
    if (errorName.includes("ServerSelection") || errorName.includes("MongoNetwork") || errorName.includes("MongooseServerSelection")) {
      return NextResponse.json({ error: "Could not connect to MongoDB. Check the database URI, network access list, and credentials." }, { status: 503 });
    }
    const message = process.env.NODE_ENV === "development"
      ? `Shop details could not be saved (${errorName}). Check the terminal log for details.`
      : "Could not save your shop details right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
