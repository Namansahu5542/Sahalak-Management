"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SHOP_CATEGORIES, shopSetupSchema } from "@/app/lib/validation/shop";

const inputClass = "mt-1.5 h-12 w-full rounded-xl border border-[#6C5636] bg-[#090907]/90 px-3.5 text-sm text-[#F5F3EF] outline-none placeholder:text-[#F5F3EF]/30 transition focus:border-[#B99D73] focus:ring-2 focus:ring-[#B99D73]/20";

export default function OwnerSetupForm() {
  const router = useRouter();
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function choosePhoto(event) {
    const file = event.target.files?.[0] || null;
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : "");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = shopSetupSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      const errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/owner/shop", { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        throw new Error(result.error || "Could not save your shop details.");
      }
      router.replace("/dashboard/Home?shop=setup-complete");
      router.refresh();
    } catch (requestError) {
      setError(requestError.message || "Could not save your shop details. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = (key, label, props = {}) => (
    <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor={`shop-${key}`}>
      {label}
      <input id={`shop-${key}`} name={key} className={inputClass} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `shop-${key}-error` : undefined} {...props} />
      {fieldErrors[key] ? <span id={`shop-${key}-error`} className="mt-1 block text-[11px] font-medium text-[#ffb2a8]">{fieldErrors[key]}</span> : null}
    </label>
  );

  return (
    <form onSubmit={submit} className="grid gap-x-5 gap-y-5 md:grid-cols-2" noValidate>
      <div className="md:col-span-2">{field("shopName", "Business or shop name", { autoComplete: "organization", maxLength: 100, placeholder: "e.g. Naman Garments", required: true })}</div>
      {field("marketName", "Market or local area", { autoComplete: "address-level2", maxLength: 100, placeholder: "e.g. Para Market", required: true })}
      {field("phone", "Owner contact number", { type: "tel", autoComplete: "tel", maxLength: 20, placeholder: "+91 98765 43210", required: true })}
      <div className="md:col-span-2">{field("address", "Market address", { autoComplete: "street-address", maxLength: 240, placeholder: "Shop number, lane, landmark, city, state, PIN code", required: true })}</div>

      <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="shop-category">
        Business category
        <select id="shop-category" name="category" defaultValue="" className={`${inputClass} appearance-none`} aria-invalid={Boolean(fieldErrors.category)} aria-describedby={fieldErrors.category ? "shop-category-error" : undefined}>
          <option value="" disabled className="bg-[#090907]">Select a category</option>
          {SHOP_CATEGORIES.map((category) => <option key={category.value} value={category.value} className="bg-[#090907]">{category.label}</option>)}
        </select>
        {fieldErrors.category ? <span id="shop-category-error" className="mt-1 block text-[11px] font-medium text-[#ffb2a8]">{fieldErrors.category}</span> : null}
      </label>

      <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="shop-photo">
        Logo or shop photo
        <span className="mt-1.5 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#6C5636] bg-[#090907]/90 px-3.5 text-sm text-[#F5F3EF]/55 transition hover:border-[#B99D73]">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#6C5636]/35 text-lg text-[#B99D73]" aria-hidden="true">＋</span>
          <span className="min-w-0 flex-1 truncate">{photo?.name || "Choose JPG, PNG, or WebP"}</span>
          <span className="text-[10px] text-[#B99D73]">Max 2 MB</span>
          <input id="shop-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={choosePhoto} />
        </span>
        {fieldErrors.photo ? <span className="mt-1 block text-[11px] font-medium text-[#ffb2a8]">{fieldErrors.photo}</span> : null}
        {preview ? <Image src={preview} alt="Selected shop photo preview" width={96} height={80} unoptimized className="mt-3 h-20 w-24 rounded-xl border border-[#B99D73]/40 object-cover" /> : null}
      </label>

      {error ? <p role="alert" className="mb-0 rounded-xl border border-[#ffb2a8]/25 bg-[#ffb2a8]/10 p-3 text-xs text-[#ffc4bc] md:col-span-2">{error}</p> : null}
      <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="mb-0 max-w-sm text-[11px] leading-relaxed text-[#F5F3EF]/45">Your contact details are used to help coordinate work with your shop.</p>
        <button type="submit" disabled={busy} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#B99D73] px-6 text-sm font-bold text-[#090907] shadow-[0_8px_25px_#B99D7326] transition hover:bg-[#cfb894] disabled:cursor-wait disabled:opacity-60">
          {busy ? "Saving shop…" : "Save shop details"}
          {!busy ? <span aria-hidden="true">→</span> : null}
        </button>
      </div>
    </form>
  );
}
