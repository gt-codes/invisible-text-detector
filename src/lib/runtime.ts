import { getPreferenceValues, Clipboard, getSelectedText } from "@raycast/api";
import { analyzeText } from "./analyze";

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export type NormalizedPreferences = Omit<Preferences, "tabWidth"> & { tabWidth: number };

export function getNormalizedPreferences(): NormalizedPreferences {
  const raw = getPreferenceValues<Preferences>();
  const { tabWidth: tabWidthRaw, ...rest } = raw;
  const parsedTabWidth = Math.max(0, Number.parseInt(tabWidthRaw ?? "4", 10) || 4);
  const normalized: NormalizedPreferences = { ...rest, tabWidth: parsedTabWidth } as NormalizedPreferences;
  return normalized;
}

export async function readPreferredTextSource(
  prefs: Pick<Preferences, "preferSelectedText">,
): Promise<string | undefined> {
  if (prefs.preferSelectedText) {
    try {
      const sel = await getSelectedText();
      if (sel && sel.length > 0) return sel;
    } catch {
      // fall back to clipboard
    }
  }
  const clip = await Clipboard.readText();
  return clip ?? undefined;
}

export { analyzeText };
export { fixInvisibleOnly, fixAllUnicode } from "./clean";
