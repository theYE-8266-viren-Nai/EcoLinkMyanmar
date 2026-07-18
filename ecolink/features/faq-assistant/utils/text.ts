const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export function sanitizeText(value: string, maxLength = 1200) {
  return value.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function tokenize(value: string) {
  return sanitizeText(value.toLowerCase())
    .split(/[^\p{L}\p{N}+#.]+/u)
    .filter((token) => token.length > 1);
}
