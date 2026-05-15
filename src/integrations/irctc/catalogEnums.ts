/**
 * IRCTC eCatering aggregator closed enums for menu items.
 *
 * Mirrors the backend `IrctcCatalogEnums` Java class. Wire values use
 * UPPER_SNAKE_CASE per the IRCTC aggregator spec; UI should display the
 * humanised form via {@link humanizeEnumValue}.
 *
 * Keep these in sync with `IRCTC_API_REFERENCE.md` (`cuisine` / `foodType`).
 */

export const IRCTC_CUISINES = [
  "SOUTH_INDIAN",
  "PUNJABI",
  "NORTH_INDIAN",
  "MUGHALAI",
  "BENGALI",
  "GOAN",
  "TAMIL",
  "ANDHRA",
  "KERALA",
  "INDIAN_CHINESE",
  "CHINESE",
  "AWADHI",
  "MALAYSIAN",
  "MAHARASHTRIAN",
  "TIBETAN",
  "SRI_LANKAN",
  "SIKKIMESE",
  "TASTE_OF_BIHAR",
  "ASSAMESE",
  "BAKERY_CONFECTIONERY",
  "CONTINENTAL",
  "ITALIAN",
  "MEXICAN",
  "LEBANESE",
  "MONGOLIAN",
  "MALABARI",
  "HYDERABADI",
  "ODIYA",
  "MARATHI",
  "GUJRATI",
  "RAJASTHANI",
  "AMERICAN",
] as const;

export const IRCTC_FOOD_TYPES = [
  "SNACKS",
  "BREAKFAST",
  "STARTERS",
  "MAINS",
  "MAINS_GRAVY",
  "BREADS",
  "THALI",
  "COMBO",
  "DESSERTS",
  "SOUP",
  "BEVERAGE",
  "NAVRATRI_SPECIAL",
  "DIET",
  "BAKERY_CONFECTIONERY",
  "HEALTHY_DIET",
  "SWEETS",
  "DIWALI_SPECIAL",
  "BIRYANI",
  "BULK",
  "SPECIALITY_ITEM",
  "CHAATS",
  "NAMKEENS",
  "SALADS",
  "MOUTH_FRESHENER_DIGESTIVE",
  "PIZZA",
  "BURGER",
  "HOLI_SPECIAL",
  "PASTAS",
  "TACOS",
  "QUESADILLAS",
  "SIDES",
  "JAIN_FOOD",
] as const;

export type IrctcCuisine = (typeof IRCTC_CUISINES)[number];
export type IrctcFoodType = (typeof IRCTC_FOOD_TYPES)[number];

/**
 * Convert an UPPER_SNAKE_CASE enum value to a human-readable Title Case string.
 * e.g. `NORTH_INDIAN` -> `North Indian`, `MAINS_GRAVY` -> `Mains Gravy`.
 */
export function humanizeEnumValue(value: string): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}
