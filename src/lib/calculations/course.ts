/** Prerequisites are stored as a JSON string; tolerate legacy shapes. */
export function parsePrerequisites(v: string | undefined | null): string[] {
  if (!v || v === "") return [];
  try { return JSON.parse(v); } catch { return [v]; }
}
