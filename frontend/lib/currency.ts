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

export function currencySymbol(code?: string | null): string {
  if (!code) return "$";
  return SYMBOLS[code.toUpperCase()] ?? `${code} `;
}
