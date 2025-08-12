import * as Ray from "@raycast/api";
import { analyzeText } from "./lib/analyze";
import { getPreferences, readPreferredTextSource } from "./lib/runtime";

export default async function Command() {
  const prefs = getPreferences();
  const text = await readPreferredTextSource(prefs);
  if (!text) {
    await Ray.showToast({
      style: Ray.Toast.Style.Failure,
      title: "No text to analyze",
      message: "Select text or copy it to the clipboard",
    });
    return;
  }
  const a = analyzeText(text);
  const summary = `Invisible: ${a.invisible.count} • Non-Keyboard: ${a.nonKeyboard.count} • Special Spaces: ${a.specialSpaces.count}`;
  const report = `${summary}\n\nInvisible: ${a.invisible.codePoints.join(", ") || "-"}\nNon-Keyboard: ${a.nonKeyboard.codePoints.join(", ") || "-"}\nSpecial Spaces: ${a.specialSpaces.codePoints.join(", ") || "-"}`;
  await Ray.Clipboard.copy(report);
  if (prefs.showToasts) {
    await Ray.showToast({
      style: Ray.Toast.Style.Success,
      title: "Clipboard Analysis",
      message: summary,
    });
  }
}
