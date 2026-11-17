/**
 * Colour names in the catalogue are free text (Arabic or English), so the UI
 * must understand spelling variants such as "اخضر" / "أخضر" and "الأسود".
 * Everything is normalised to one key before looking the colour up.
 */

const COLOR_MAP: Record<string, string> = {
  // neutrals
  "اسود": "#26212a",
  "بلاك": "#26212a",
  "black": "#26212a",
  "ابيض": "#fbf8f6",
  "وايت": "#fbf8f6",
  "white": "#fbf8f6",
  "اوف وايت": "#f2ece2",
  "اوفوايت": "#f2ece2",
  "off white": "#f2ece2",
  "offwhite": "#f2ece2",
  "كريمي": "#f0e4d2",
  "cream": "#f0e4d2",
  "لبني": "#f6f1e7",
  "بيج": "#d9c2a7",
  "beige": "#d9c2a7",
  "رمادي": "#969097",
  "جري": "#969097",
  "gray": "#969097",
  "grey": "#969097",
  "فضي": "#c9ccd2",
  "سيلفر": "#c9ccd2",
  "silver": "#c9ccd2",

  // warm colours
  "احمر": "#c9465a",
  "ريد": "#c9465a",
  "red": "#c9465a",
  "نبيتي": "#8c3044",
  "خمري": "#8c3044",
  "عنابي": "#8c3044",
  "مارون": "#7d2f40",
  "burgundy": "#8c3044",
  "maroon": "#7d2f40",
  "وردي": "#e589a4",
  "بينك": "#e589a4",
  "روز": "#de7d98",
  "pink": "#e589a4",
  "rose": "#de7d98",
  "كورالي": "#e07a68",
  "coral": "#e07a68",
  "برتقالي": "#dd8a4c",
  "اورنج": "#dd8a4c",
  "orange": "#dd8a4c",
  "بني": "#8a5c45",
  "براون": "#8a5c45",
  "brown": "#8a5c45",
  "بيج غامق": "#b79a78",
  "اصفر": "#e0b64a",
  "يلو": "#e0b64a",
  "yellow": "#e0b64a",
  "ذهبي": "#c9a44b",
  "جولد": "#c9a44b",
  "gold": "#c9a44b",

  // cool colours
  "ازرق": "#4b74c9",
  "زرق": "#4b74c9",
  "زرقا": "#4b74c9",
  "زرقاء": "#4b74c9",
  "بلو": "#4b74c9",
  "blue": "#4b74c9",
  "ازرق فاتح": "#7cbdd6",
  "ازرق غامق": "#345a9e",
  "كحلي": "#3a4a74",
  "كحلي غامق": "#2b3757",
  "نيفي": "#3a4a74",
  "navy": "#3a4a74",
  "سماوي": "#7cbdd6",
  "لبني سماوي": "#7cbdd6",
  "sky": "#7cbdd6",
  "light blue": "#7cbdd6",
  "تركواز": "#3fa8a0",
  "تركوازي": "#3fa8a0",
  "فيروزي": "#3fa8a0",
  "فيروز": "#3fa8a0",
  "turquoise": "#3fa8a0",
  "teal": "#3fa8a0",
  "اخضر": "#4f9b6f",
  "خضر": "#4f9b6f",
  "خضرا": "#4f9b6f",
  "خضراء": "#4f9b6f",
  "اخضر فاتح": "#7cc4a4",
  "اخضر غامق": "#2f6d49",
  "جرين": "#4f9b6f",
  "green": "#4f9b6f",
  "زيتي": "#7b8a4f",
  "اوليف": "#7b8a4f",
  "olive": "#7b8a4f",
  "فستقي": "#a9c47f",
  "نعناعي": "#7cc4a4",
  "mint": "#7cc4a4",
  "بنفسجي": "#8b6fc0",
  "موف": "#a06fb4",
  "mauve": "#a06fb4",
  "ليلكي": "#9b86cf",
  "lavender": "#9b86cf",
  "purple": "#8b6fc0",
  "فوشيا": "#c44d8e",
  "fuchsia": "#c44d8e",
  "متعدد": "#b98aa8",
  "ملون": "#b98aa8",
  "multi": "#b98aa8",

  // common Arabic forms (feminine, plural, and everyday spelling)
  "حمر": "#c9465a",
  "حمرا": "#c9465a",
  "حمراء": "#c9465a",
  "صفر": "#e0b64a",
  "صفرا": "#e0b64a",
  "صفراء": "#e0b64a",
  "سود": "#26212a",
  "سودا": "#26212a",
  "سوداء": "#26212a",
  "بيض": "#fbf8f6",
  "بيضا": "#fbf8f6",
  "بيضاء": "#fbf8f6",
  "رصاصي": "#969097",
  "سمني": "#e07a68",
  "سالمون": "#e07a68",
  "برتقال": "#dd8a4c",
  "كافيه": "#8a5c45",
  "هافان": "#8a5c45",
  "نود": "#d9c2a7",
  "جملي": "#c8a982",
  "توتي": "#8c3044",
  "بمبي": "#e589a4",
  "ليموني": "#e0b64a",
  "ليمون": "#e0b64a",
  "شامبانيا": "#e7d6b3",
  "تيراكوتا": "#c96f52",
  "ذهبي وردي": "#d19a7d",
  "فضي غامق": "#7f858d",
};

/** Suffixes people add to Arabic colours ("خضراء", "حمرا", "بيضا") are dropped when looking up a family. */
const COLOR_STEMS: Record<string, string> = {
  "حمر": "#c9465a",
  "خضر": "#4f9b6f",
  "زرق": "#4b74c9",
  "صفر": "#e0b64a",
  "سود": "#26212a",
  "بيض": "#fbf8f6",
};

const CANONICAL: Record<string, string> = {
  "احمر": "أحمر",
  "حمر": "أحمر",
  "حمرا": "أحمر",
  "حمراء": "أحمر",
  "ازرق": "أزرق",
  "زرق": "أزرق",
  "زرقا": "أزرق",
  "زرقاء": "أزرق",
  "اخضر": "أخضر",
  "خضر": "أخضر",
  "خضرا": "أخضر",
  "خضراء": "أخضر",
  "اصفر": "أصفر",
  "صفر": "أصفر",
  "صفرا": "أصفر",
  "صفراء": "أصفر",
  "اسود": "أسود",
  "سود": "أسود",
  "سودا": "أسود",
  "سوداء": "أسود",
  "ابيض": "أبيض",
  "بيض": "أبيض",
  "بيضا": "أبيض",
  "بيضاء": "أبيض",
  "بيج": "بيج",
  "وردي": "وردي",
  "بني": "بني",
  "رمادي": "رمادي",
  "رصاصي": "رمادي",
  "بنفسجي": "بنفسجي",
  "برتقالي": "برتقالي",
  "برتقال": "برتقالي",
  "ذهبي": "ذهبي",
  "فضي": "فضي",
  "كحلي": "كحلي",
  "سماوي": "سماوي",
  "زيتي": "زيتي",
  "خمري": "خمري",
  "تركواز": "تركواز",
  "تركوازي": "تركواز",
  "اوف وايت": "أوف وايت",
  "كريمي": "كريمي",
  "نبيتي": "نبيتي",
  "فيروزي": "فيروزي",
  "فيروز": "فيروزي",
  "سمني": "سالمون",
  "سالمون": "سالمون",
};

/** Arabic-aware normalisation: hamza forms, taa marbuta, yaa, diacritics and "ال". */
export function normalizeColorName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .replace(/^ال(?=.{2,})/, "");
}

/** Keep the catalogue readable by storing the standard Arabic spelling for known colours. */
export function canonicalColorName(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return CANONICAL[normalizeColorName(trimmed)] ?? trimmed;
}

export function colorSwatch(value: string) {
  const key = normalizeColorName(value || "");
  if (COLOR_MAP[key]) return COLOR_MAP[key];

  // "خضراء" / "حمرا" / "بيضا": drop the feminine ending before looking the family up.
  const stem = key.replace(/(?:اء|ا|ه|ة)$/u, "");
  if (stem !== key) {
    if (COLOR_STEMS[stem]) return COLOR_STEMS[stem];
    if (COLOR_MAP[stem]) return COLOR_MAP[stem];
  }

  // Tolerate descriptive names such as "أزرق فاتح" or "أخضر زيتي".
  const entries = Object.entries(COLOR_MAP).sort((a, b) => b[0].length - a[0].length);
  const startsWith = entries.find(([name]) => key.startsWith(name));
  if (startsWith) return startsWith[1];
  const match = entries.find(([name]) => key.includes(name));
  if (match) return match[1];

  // Unknown colour: derive a stable pastel tone from the text instead of a random blue.
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 360;
  }
  return `hsl(${hash} 44% 58%)`;
}

/** Hex colours need a readable foreground; light swatches should keep dark text. */
export function colorInk(value: string) {
  const hex = colorSwatch(value);
  if (!/^#([0-9a-f]{6})$/i.test(hex)) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.68 ? "#2b2228" : "#ffffff";
}

export const COLOR_SUGGESTIONS = [
  "أسود",
  "أبيض",
  "بيج",
  "أحمر",
  "أزرق",
  "أخضر",
  "أصفر",
  "وردي",
  "بني",
  "رمادي",
  "بنفسجي",
  "برتقالي",
  "ذهبي",
  "فضي",
  "كحلي",
  "سماوي",
  "زيتي",
  "خمري",
  "تركواز",
  "أوف وايت",
];
