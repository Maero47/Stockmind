const SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  JPY: "\u00A5",
  CNY: "\u00A5",
  TRY: "\u20BA",
  KRW: "\u20A9",
  INR: "\u20B9",
  BRL: "R$",
  CAD: "CA$",
  AUD: "A$",
  CHF: "CHF ",
  HKD: "HK$",
  SGD: "S$",
  SEK: "kr ",
  NOK: "kr ",
  DKK: "kr ",
  PLN: "z\u0142",
  ZAR: "R",
  MXN: "MX$",
  TWD: "NT$",
  THB: "\u0E3F",
  IDR: "Rp",
  ILS: "\u20AA",
  SAR: "SR",
  AED: "AED ",
};

const FLAGS: Record<string, string> = {
  USD: "\u{1F1FA}\u{1F1F8}", EUR: "\u{1F1EA}\u{1F1FA}", GBP: "\u{1F1EC}\u{1F1E7}",
  JPY: "\u{1F1EF}\u{1F1F5}", CNY: "\u{1F1E8}\u{1F1F3}", TRY: "\u{1F1F9}\u{1F1F7}",
  KRW: "\u{1F1F0}\u{1F1F7}", INR: "\u{1F1EE}\u{1F1F3}", BRL: "\u{1F1E7}\u{1F1F7}",
  CAD: "\u{1F1E8}\u{1F1E6}", AUD: "\u{1F1E6}\u{1F1FA}", CHF: "\u{1F1E8}\u{1F1ED}",
  HKD: "\u{1F1ED}\u{1F1F0}", SGD: "\u{1F1F8}\u{1F1EC}", SEK: "\u{1F1F8}\u{1F1EA}",
  NOK: "\u{1F1F3}\u{1F1F4}", DKK: "\u{1F1E9}\u{1F1F0}", PLN: "\u{1F1F5}\u{1F1F1}",
  ZAR: "\u{1F1FF}\u{1F1E6}", MXN: "\u{1F1F2}\u{1F1FD}", TWD: "\u{1F1F9}\u{1F1FC}",
  THB: "\u{1F1F9}\u{1F1ED}", IDR: "\u{1F1EE}\u{1F1E9}", ILS: "\u{1F1EE}\u{1F1F1}",
  SAR: "\u{1F1F8}\u{1F1E6}", AED: "\u{1F1E6}\u{1F1EA}",
};

export function currencyFlag(code?: string | null): string {
  if (!code) return "";
  return FLAGS[code.toUpperCase()] ?? "";
}

export const CURRENCY_CODES = Object.keys(SYMBOLS);

export const CURRENCY_LIST = Object.entries(SYMBOLS).map(([code, symbol]) => ({
  code,
  symbol,
  flag: FLAGS[code] ?? "",
}));

export function currencySymbol(code?: string | null): string {
  if (!code) return "$";
  return SYMBOLS[code.toUpperCase()] ?? `${code} `;
}
