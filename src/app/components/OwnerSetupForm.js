"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  fieldErrorsFromIssues,
  MAX_CATEGORIES,
  shopFormToObject,
  shopSetupSchema,
} from "@/app/lib/validation/shop";

const inputClass = "mt-1.5 h-12 w-full rounded-xl border border-[#6C5636] bg-[#090907]/90 px-3.5 text-sm text-[#F5F3EF] outline-none placeholder:text-[#F5F3EF]/30 transition focus:border-[#B99D73] focus:ring-2 focus:ring-[#B99D73]/20";

export default function OwnerSetupForm({ markets, categories }) {
  const router = useRouter();
  const [marketId, setMarketId] = useState("");
  const [stallId, setStallId] = useState("");
  const [stalls, setStalls] = useState([]);
  const [loadingStalls, setLoadingStalls] = useState(false);
  const [stallLoadError, setStallLoadError] = useState("");
  const [categoryIds, setCategoryIds] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!marketId) return undefined;

    const controller = new AbortController();
    fetch(`/api/owner/shop/options?marketId=${encodeURIComponent(marketId)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Could not load this market's stalls.");
        return result.stalls || [];
      })
      .then(setStalls)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setStallLoadError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStalls(false);
      });

    return () => controller.abort();
  }, [marketId]);

  function chooseMarket(value) {
    setMarketId(value);
    setStallId("");
    setStalls([]);
    setStallLoadError("");
    setLoadingStalls(Boolean(value));
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0] || null;
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : "");
  }

  function toggleCategory(categoryId) {
    setCategoryIds((selected) => selected.includes(categoryId)
      ? selected.filter((id) => id !== categoryId)
      : selected.length < MAX_CATEGORIES ? [...selected, categoryId] : selected);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = shopSetupSchema.safeParse(shopFormToObject(formData));
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
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

      <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="shop-marketId">
        Market
        <select id="shop-marketId" name="marketId" value={marketId} onChange={(event) => chooseMarket(event.target.value)} className={`${inputClass} appearance-none`} aria-invalid={Boolean(fieldErrors.marketId)} aria-describedby={fieldErrors.marketId ? "shop-marketId-error" : undefined}>
          <option value="" className="bg-[#090907]">Choose a market</option>
          {markets.map((market) => <option key={market.id} value={market.id} className="bg-[#090907]">{market.name} · {market.areaName}, {market.city}</option>)}
        </select>
        {fieldErrors.marketId ? <span id="shop-marketId-error" className="mt-1 block text-[11px] font-medium text-[#ffb2a8]">{fieldErrors.marketId}</span> : null}
        {markets.length === 0 ? <span className="mt-1 block text-[11px] text-[#F5F3EF]/45">No markets are available yet.</span> : null}
      </label>

      <label className="block text-xs font-semibold text-[#F5F3EF]/85" htmlFor="shop-stallId">
        Lane and stall
        <select id="shop-stallId" name="stallId" value={stallId} onChange={(event) => setStallId(event.target.value)} disabled={!marketId || loadingStalls || Boolean(stallLoadError)} className={`${inputClass} appearance-none disabled:cursor-not-allowed disabled:opacity-50`} aria-invalid={Boolean(fieldErrors.stallId)} aria-describedby={fieldErrors.stallId ? "shop-stallId-error" : undefined}>
          <option value="" className="bg-[#090907]">{loadingStalls ? "Loading stalls…" : marketId ? "Choose a stall" : "Choose a market first"}</option>
          {stalls.map((stall) => (
            <option key={stall.id} value={stall.id} disabled={stall.taken} className="bg-[#090907]">
              {stall.zoneName ? `${stall.zoneName} · ` : ""}{stall.laneName} · Stall {stall.stallNo}{stall.side ? ` (${stall.side})` : ""}{stall.isMine ? " · Your current stall" : stall.taken ? " · Taken" : ""}
            </option>
          ))}
        </select>
        {fieldErrors.stallId ? <span id="shop-stallId-error" className="mt-1 block text-[11px] font-medium text-[#ffb2a8]">{fieldErrors.stallId}</span> : null}
        {stallLoadError ? <span role="alert" className="mt-1 block text-[11px] font-medium text-[#ffb2a8]">{stallLoadError}</span> : null}
        {!loadingStalls && marketId && stalls.length === 0 && !stallLoadError ? <span className="mt-1 block text-[11px] text-[#F5F3EF]/45">No stalls are listed for this market yet.</span> : null}
      </label>

      {field("phone", "Owner contact number", { type: "tel", autoComplete: "tel", maxLength: 20, placeholder: "+91 98765 43210", required: true })}
      <div className="md:col-span-2">{field("address", "Shop address or landmark", { autoComplete: "street-address", maxLength: 240, placeholder: "Shop number, nearby landmark, and directions", required: true })}</div>

      <fieldset className="min-w-0 md:col-span-2" aria-describedby={fieldErrors.categoryIds ? "shop-categoryIds-error" : undefined}>
        <legend className="text-xs font-semibold text-[#F5F3EF]/85">Business categories <span className="font-normal text-[#F5F3EF]/45">(choose up to {MAX_CATEGORIES})</span></legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const checked = categoryIds.includes(category.id);
            return (
              <label key={category.id} className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3 text-xs transition ${checked ? "border-[#B99D73] bg-[#B99D73]/15 text-[#F5F3EF]" : "border-[#6C5636]/70 bg-[#090907]/80 text-[#F5F3EF]/70"}`}>
                <input type="checkbox" name="categoryIds" value={category.id} checked={checked} onChange={() => toggleCategory(category.id)} disabled={busy || (categoryIds.length >= MAX_CATEGORIES && !checked)} className="size-4 accent-[#B99D73]" />
                {category.name}
              </label>
            );
          })}
        </div>
        {fieldErrors.categoryIds ? <span id="shop-categoryIds-error" className="mt-1 block text-[11px] font-medium text-[#ffb2a8]">{fieldErrors.categoryIds}</span> : null}
        {categories.length === 0 ? <span className="mt-1 block text-[11px] text-[#F5F3EF]/45">No categories are configured yet.</span> : null}
      </fieldset>

      <label className="block text-xs font-semibold text-[#F5F3EF]/85 md:col-span-2" htmlFor="shop-photo">
        Logo or shop photo
        <span className="mt-1.5 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#6C5636] bg-[#090907]/90 px-3.5 text-sm text-[#F5F3EF]/55 transition hover:border-[#B99D73]">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#6C5636]/35 text-lg text-[#B99D73]" aria-hidden="true">＋</span>
          <span className="min-w-0 flex-1 truncate">{photo?.name || "Choose JPG, PNG, or WebP"}</span>
          <span className="text-[10px] text-[#B99D73]">Max 2 MB</span>
          <input id="shop-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={choosePhoto} aria-invalid={Boolean(fieldErrors.photo)} aria-describedby={fieldErrors.photo ? "shop-photo-error" : undefined} />
        </span>
        {fieldErrors.photo ? <span id="shop-photo-error" className="mt-1 block text-[11px] font-medium text-[#ffb2a8]">{fieldErrors.photo}</span> : null}
        {preview ? <Image src={preview} alt="Selected shop photo preview" width={96} height={80} unoptimized className="mt-3 h-20 w-24 rounded-xl border border-[#B99D73]/40 object-cover" /> : null}
      </label>

      {error ? <p role="alert" className="mb-0 rounded-xl border border-[#ffb2a8]/25 bg-[#ffb2a8]/10 p-3 text-xs text-[#ffc4bc] md:col-span-2">{error}</p> : null}
      <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="mb-0 max-w-sm text-[11px] leading-relaxed text-[#F5F3EF]/45">Your market, stall, categories, and contact details help workers find and recognize your shop.</p>
        <button type="submit" disabled={busy || loadingStalls} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#B99D73] px-6 text-sm font-bold text-[#090907] shadow-[0_8px_25px_#B99D7326] transition hover:bg-[#cfb894] disabled:cursor-wait disabled:opacity-60">
          {busy ? "Saving shop…" : "Save shop details"}
          {!busy ? <span aria-hidden="true">→</span> : null}
        </button>
      </div>
    </form>
  );
}
