export interface BuiltInKurtiType {
  key: string;
  name: string;
  nameHi: string;
  nameGu: string;
  defaultImage: string;
  isHidden?: boolean;
}

/**
 * The original kurti types. They fill the KurtiType table the first time it is
 * read, and keep supplying the default picture for their key afterwards.
 */
export const BUILT_IN_KURTI_TYPES: BuiltInKurtiType[] = [
  { key: "roundedPair", name: "Rounded Pair", nameHi: "राउंड पेयर", nameGu: "રાઉન્ડ પેર", defaultImage: "/kurti_type/Rounded Pair.png" },
  { key: "straightPair", name: "Straight Pair", nameHi: "स्ट्रेट पेयर", nameGu: "સ્ટ્રેટ પેર", defaultImage: "/kurti_type/Straight Pair.png" },
  { key: "plazzaPair", name: "Plazza Pair", nameHi: "प्लाज्जा पेयर", nameGu: "પ્લાઝા પેર", defaultImage: "/kurti_type/Plazza Pair.png" },
  { key: "sararaPair", name: "Sarara Pair", nameHi: "शरारा पेयर", nameGu: "શરારા પેર", defaultImage: "/kurti_type/Sarara Pair.png", isHidden: true },
  { key: "straightKurtiPent", name: "Straight Kurti Pent", nameHi: "स्ट्रेट कुर्ती पेंट", nameGu: "સ્ટ્રેટ કુર્તી પેન્ટ", defaultImage: "/kurti_type/Straight Kurti Pent.png" },
  { key: "roundKurti", name: "Round Kurti", nameHi: "राउंड कुर्ती", nameGu: "રાઉન્ડ કુર્તી", defaultImage: "/kurti_type/Round Kurti.png" },
  { key: "straightKurti", name: "Straight Kurti", nameHi: "स्ट्रेट कुर्ती", nameGu: "સ્ટ્રેટ કુર્તી", defaultImage: "/kurti_type/Straight Kurti.png" },
  { key: "straight", name: "Straight", nameHi: "स्ट्रेट", nameGu: "સ્ટ્રેટ", defaultImage: "/kurti_type/Straight.png" },
  { key: "onlyPent", name: "Only Pant", nameHi: "सिर्फ पेंट", nameGu: "ફક્ત પેન્ટ", defaultImage: "/kurti_type/Only Pant.png" },
  { key: "lehengaCholi", name: "Lehenga Choli", nameHi: "लहंगा चोली", nameGu: "લહેંગા ચોલી", defaultImage: "/kurti_type/Lehenga Choli.png", isHidden: true },
  { key: "codeSet", name: "Code-Set", nameHi: "कोड-सेट", nameGu: "કોડ-સેટ", defaultImage: "/kurti_type/Code-Set.png" },
  { key: "tunique", name: "Tunique", nameHi: "ट्यूनिक", nameGu: "ટ્યુનિક", defaultImage: "/kurti_type/Tunique.png" },
  { key: "gaune", name: "Gaune", nameHi: "गाउन", nameGu: "ગાઉન", defaultImage: "/kurti_type/Gown.png" },
  { key: "aLineKurti", name: "A-Line Kurti", nameHi: "A-लाइन कुर्ती", nameGu: "A-લાઈન કુર્તી", defaultImage: "/kurti_type/A-Line-Kurti.png" },
  { key: "aLineKurtiPant", name: "A-Line Kurti Pant", nameHi: "A-लाइन कुर्ती पेंट", nameGu: "A-લાઈન કુર્તી પેન્ટ", defaultImage: "/kurti_type/A-Line-Kurti-Pant.png" },
  { key: "roundedKurtiPant", name: "Round & Kurti Pant", nameHi: "राउंड और कुर्ती पेंट", nameGu: "રાઉન્ડ અને કુર્તી પેન્ટ", defaultImage: "/kurti_type/Round & Kurti Pant.png" },
];

export const builtInImage = (key: string) =>
  BUILT_IN_KURTI_TYPES.find((t) => t.key === key)?.defaultImage ?? null;

/** Camel-case key from a display name, e.g. "A-Line Suit" -> "aLineSuit". */
export const kurtiTypeKeyFromName = (name: string) => {
  const words = name.replace(/&/g, " and ").match(/[a-zA-Z0-9]+/g) ?? [];
  return words
    .map((w, i) =>
      i === 0
        ? w.charAt(0).toLowerCase() + w.slice(1)
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join("");
};
