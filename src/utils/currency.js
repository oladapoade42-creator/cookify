// A curated list rather than free-text entry — keeps the data clean
// (no typos like "usd" vs "USD" vs "US Dollars") and lets the display
// code show a proper symbol instead of guessing one from arbitrary text.
// Add more here anytime; nothing else needs to change to support a new one.
export const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "NGN", label: "Nigerian Naira", symbol: "₦" },
  { code: "GHS", label: "Ghanaian Cedi", symbol: "GH₵" },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
];

const SYMBOL_BY_CODE = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.symbol]));

// Formats an amount with its currency's symbol if we recognize the code
// (e.g. "₦1,500.00"), or falls back to showing the raw code after the
// amount for anything not in the list above (e.g. "1500.00 XYZ") rather
// than silently mislabeling it with the wrong symbol.
export function formatPrice(amount, currencyCode) {
  const value = Number(amount || 0).toFixed(2);
  const symbol = SYMBOL_BY_CODE[currencyCode];
  return symbol ? `${symbol}${value}` : `${value} ${currencyCode || "USD"}`;
}
