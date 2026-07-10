export const money = (n: number) => `$${n.toLocaleString()}`;
export const pad = (n: number) => String(n).padStart(2, '0');
