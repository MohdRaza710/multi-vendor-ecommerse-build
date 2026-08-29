export function money(value: number | string | { toString(): string }, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    Number(value),
  );
}
