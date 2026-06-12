/**
 * Niche -> design brief map. The prompt builder reads from this to give claude
 * concrete, niche-appropriate direction instead of generic SaaS defaults.
 *
 * Keys are matched loosely (substring) against the detected niche so "beach
 * resort", "luxury hotel", etc. resolve to the closest entry.
 */
export const NICHE_BRIEFS = Object.freeze({
  hotel: {
    label: "Hotel",
    vibe: "elegant, imagery-led, hospitality luxury",
    typography: "high-contrast serif display (e.g. Cormorant Garamond) paired with a clean grotesque body (e.g. Inter)",
    palette: ["#1a1a2e", "#c9a227", "#f5f1e8", "#2c3e50"],
    layout: "full-bleed hero photography, a room/suite showcase grid, an amenities band, a prominent booking CTA, guest testimonials",
    imagery: "https://picsum.photos/seed/hotel-room/1600/900 style architectural + interior shots",
    palettes: [
      { name: "Midnight Gold", colors: ["#1a1a2e", "#c9a227", "#f5f1e8"] },
      { name: "Slate Linen", colors: ["#2c3e50", "#b08968", "#ede0d4"] },
      { name: "Deep Emerald", colors: ["#0b3d2e", "#d4af37", "#f7f4ef"] },
    ],
  },
  "beach resort": {
    label: "Beach Resort",
    vibe: "tropical, airy, breezy escape",
    typography: "rounded humanist sans for headings (e.g. Poppins) with an easy serif accent",
    palette: ["#0077b6", "#48cae4", "#fff3b0", "#fefae0"],
    layout: "ocean hero video/photo, activity cards, a packages section, a gallery, a sticky reservation bar",
    imagery: "https://picsum.photos/seed/beach/1600/900 style ocean, palm, sand shots",
    palettes: [
      { name: "Lagoon", colors: ["#0077b6", "#48cae4", "#fff3b0"] },
      { name: "Sunset Coast", colors: ["#ff6b6b", "#ffd166", "#06d6a0"] },
      { name: "White Sand", colors: ["#264653", "#2a9d8f", "#e9f5db"] },
    ],
  },
  cafe: {
    label: "Cafe",
    vibe: "warm, cozy, artisanal",
    typography: "characterful slab or handwritten display with a friendly sans body",
    palette: ["#6f4e37", "#c8a27a", "#fbf3e4", "#3d2b1f"],
    layout: "menu-forward hero, a featured-drinks grid, an about/story band with a photo, hours + location map block",
    imagery: "https://picsum.photos/seed/coffee/1600/900 style coffee, pastry, interior shots",
    palettes: [
      { name: "Roasted", colors: ["#6f4e37", "#c8a27a", "#fbf3e4"] },
      { name: "Matcha Cream", colors: ["#52796f", "#cad2c5", "#fefae0"] },
      { name: "Cocoa Blush", colors: ["#5e503f", "#eaddcf", "#f0ead2"] },
    ],
  },
  restaurant: {
    label: "Restaurant",
    vibe: "appetite-driven, refined, atmospheric",
    typography: "editorial serif headings with a confident sans body",
    palette: ["#2b2118", "#a4161a", "#f3e9dc", "#e5b80b"],
    layout: "dramatic dish hero, a signature-menu section, chef story, reservations CTA, gallery",
    imagery: "https://picsum.photos/seed/food/1600/900 style plated-food + ambience shots",
    palettes: [
      { name: "Supper Club", colors: ["#2b2118", "#a4161a", "#e5b80b"] },
      { name: "Trattoria", colors: ["#386641", "#bc4749", "#f2e8cf"] },
    ],
  },
  portfolio: {
    label: "Portfolio",
    vibe: "minimal, confident, work-first",
    typography: "oversized variable sans display with generous whitespace",
    palette: ["#0a0a0a", "#fafafa", "#5b5bf7", "#e5e5e5"],
    layout: "bold name/intro hero, selected-work grid with hover detail, an about strip, a contact block",
    imagery: "https://picsum.photos/seed/work/1200/800 style project mockups",
    palettes: [
      { name: "Mono Electric", colors: ["#0a0a0a", "#fafafa", "#5b5bf7"] },
      { name: "Paper Ink", colors: ["#1d1d1f", "#f5f5f7", "#0071e3"] },
    ],
  },
  generic: {
    label: "Business",
    vibe: "clean, credible, modern",
    typography: "a distinctive heading face paired with a readable body — NOT the default system stack",
    palette: ["#101418", "#e6e6e6", "#3b82f6", "#1f2937"],
    layout: "a clear value-prop hero, a features/services section, social proof, a closing CTA",
    imagery: "https://picsum.photos/seed/business/1600/900 style relevant photography",
    palettes: [
      { name: "Graphite Blue", colors: ["#101418", "#3b82f6", "#e6e6e6"] },
      { name: "Warm Slate", colors: ["#1f2421", "#e07a5f", "#f4f1de"] },
    ],
  },
});

/**
 * @param {string} niche
 * @returns {{ key: string, brief: typeof NICHE_BRIEFS[keyof typeof NICHE_BRIEFS] }}
 */
export function resolveNiche(niche) {
  const needle = (niche ?? "").toLowerCase().trim();
  if (needle) {
    for (const key of Object.keys(NICHE_BRIEFS)) {
      if (key === "generic") continue;
      if (needle.includes(key) || key.includes(needle)) {
        return { key, brief: NICHE_BRIEFS[key] };
      }
    }
    // single-word fuzzy: "hotels" -> "hotel"
    for (const key of Object.keys(NICHE_BRIEFS)) {
      if (key === "generic") continue;
      const root = key.split(" ")[0];
      if (needle.includes(root)) return { key, brief: NICHE_BRIEFS[key] };
    }
  }
  return { key: "generic", brief: NICHE_BRIEFS.generic };
}
