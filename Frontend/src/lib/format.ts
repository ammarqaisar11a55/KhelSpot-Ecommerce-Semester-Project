export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)} ••• ${digits.slice(-4)}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : phone;
}

export const PK_MOBILE = /^03\d{9}$/;

/** "+92 300-1234567" -> "03001234567" */
export function normalisePhone(raw: string): string {
  const compact = raw.replace(/[\s-]/g, "");
  return compact.startsWith("+92") ? `0${compact.slice(3)}` : compact;
}
