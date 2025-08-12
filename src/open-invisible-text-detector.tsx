import * as Ray from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { analyzeText } from "./lib/analyze";
import { INVISIBLE_CLASS } from "./lib/sets";
import { fixAllUnicode, fixInvisibleOnly } from "./lib/clean";
import { getPreferences } from "./lib/runtime";

const EXAMPLE =
  "Hollywood is making a movie about your life, but it has to be in the style of a famous Black film or show (e.g., “Love Jones” vibe, “Insecure” style). Which one are you choosing?\nZWSP:\u200B Soft hyphen:\u00AD NBSP:\u00A0 Em—dash";

export default function Command() {
  const prefs = getPreferences();
  const [text, setText] = useState("");
  const [previewFlags, setPreviewFlags] = useState({
    showSpaces: prefs.previewShowSpaces,
    showNonKeyboard: prefs.previewShowNonKeyboard,
    showUnicodeTags: prefs.previewShowUnicodeTags,
  });

  useEffect(() => {
    (async () => {
      const saved = await Ray.LocalStorage.getItem<string>("last-input");
      if (saved) setText(saved);
    })();
  }, []);

  useEffect(() => {
    Ray.LocalStorage.setItem("last-input", text);
  }, [text]);

  const analysis = useMemo(() => analyzeText(text), [text]);
  const preview = useMemo(() => buildPreview(text, previewFlags), [text, previewFlags]);

  const { push } = Ray.useNavigation();

  return (
    <Ray.Form
      actions={
        <Ray.ActionPanel>
          <Ray.Action
            title="Fix ONLY Invisible Characters"
            onAction={async () => {
              const cleaned = fixInvisibleOnly(text, prefs);
              setText(cleaned);
              await Ray.showToast({ style: Ray.Toast.Style.Success, title: "Removed invisible characters" });
            }}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Ray.Action
            title="Fix ALL Unicode Characters"
            onAction={async () => {
              const cleaned = fixAllUnicode(text, prefs);
              setText(cleaned);
              await Ray.showToast({ style: Ray.Toast.Style.Success, title: "Normalized Unicode to ASCII" });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Ray.Action.CopyToClipboard
            title="Copy Cleaned Text"
            content={text}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Ray.Action
            title="Paste Cleaned Text"
            onAction={async () => {
              await Ray.Clipboard.copy(text);
              await Ray.showToast({ style: Ray.Toast.Style.Success, title: "Copied cleaned text. Paste with ⌘V" });
            }}
          />
          <Ray.Action
            title="See Example"
            onAction={() => setText(EXAMPLE)}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Ray.Action
            title="Analyze Details"
            onAction={() => push(<AnalysisDetail text={text} />)}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Ray.Action
            title="Copy Analysis"
            onAction={async () => {
              const a = analyzeText(text);
              const summary = [
                `Invisible: ${a.invisible.count} • Non-Keyboard: ${a.nonKeyboard.count} • Special Spaces: ${a.specialSpaces.count}`,
                "",
                `Invisible: ${a.invisible.codePoints.join(", ") || "-"}`,
                `Non-Keyboard: ${a.nonKeyboard.codePoints.join(", ") || "-"}`,
                `Special Spaces: ${a.specialSpaces.codePoints.join(", ") || "-"}`,
              ].join("\n");
              await Ray.Clipboard.copy(summary);
              await Ray.showToast({ style: Ray.Toast.Style.Success, title: "Copied analysis" });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Ray.Action title="Clear" onAction={() => setText("")} shortcut={{ modifiers: ["cmd"], key: "backspace" }} />
        </Ray.ActionPanel>
      }
    >
      <Ray.Form.TextArea
        id="input"
        title="Input Text"
        value={text}
        onChange={setText}
        autoFocus
        enableMarkdown={false}
      />

      <Ray.Form.Separator />
      <Ray.Form.Description
        title="Character Analysis"
        text={`Visible: ${analysis.totalCharacters - analysis.invisible.count}  |  Invisible: ${analysis.invisible.count}\n# Characters: ${analysis.totalCharacters}   # Words: ${analysis.totalWords}`}
      />
      <Ray.Form.Description
        title="Detected"
        text={`Invisible: ${analysis.invisible.count}  •  Non-Keyboard: ${analysis.nonKeyboard.count}  •  Special Spaces: ${analysis.specialSpaces.count}`}
      />
      <Ray.Form.Separator />
      <Ray.Form.Description title="Preview (toggles)" text={"Use actions to toggle markers"} />
      <Ray.Form.Checkbox
        id="spaces"
        label="Show Spaces"
        value={previewFlags.showSpaces}
        onChange={(v: boolean) => setPreviewFlags((f) => ({ ...f, showSpaces: v }))}
      />
      <Ray.Form.Checkbox
        id="nonkbd"
        label="Show Non-Keyboard"
        value={previewFlags.showNonKeyboard}
        onChange={(v: boolean) => setPreviewFlags((f) => ({ ...f, showNonKeyboard: v }))}
      />
      <Ray.Form.Checkbox
        id="unicode"
        label="Show [U+XXXX]"
        value={previewFlags.showUnicodeTags}
        onChange={(v: boolean) => setPreviewFlags((f) => ({ ...f, showUnicodeTags: v }))}
      />
      <Ray.Form.Separator />
      <Ray.Form.Description title="Revealed & Highlighted" text={preview} />
      <Ray.Form.Separator />
      <Ray.Form.Description title="Legend" text={"Markers used in the preview:"} />
      <Ray.Form.Description title="🟪 Invisible" text={"Zero-width/control/filler characters"} />
      <Ray.Form.Description title="🟩 Non-keyboard" text={"Smart quotes, dashes, ellipsis"} />
      <Ray.Form.Description title="· Space" text={"Regular space (when Show Spaces is enabled)"} />
      <Ray.Form.Description title="⍽ NBSP" text={"Non-breaking space"} />
      <Ray.Form.Description title="→ Tab" text={"Tab character"} />
      <Ray.Form.Description title="[U+XXXX]" text={"Code point tag (annotation only)"} />
    </Ray.Form>
  );
}

function buildPreview(
  text: string,
  flags: { showSpaces: boolean; showNonKeyboard: boolean; showUnicodeTags: boolean },
): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const isSpace = ch === " ";
    const isTab = ch === "\t";
    const isNBSP = ch === "\u00A0";
    // Use the shared pattern to identify invisibles without a literal regex to satisfy lint rule
    const isInvisible = new RegExp(INVISIBLE_CLASS, "u").test(ch);
    const isNonKeyboard = /[\u2018\u2019\u201C\u201D\u2013\u2014\u2026]/u.test(ch);
    if (flags.showSpaces && (isSpace || isTab || isNBSP)) {
      out += isTab ? "→" : isNBSP ? "⍽" : "·";
    } else if (isInvisible) {
      out += "🟪"; // invisible marker
    } else if (flags.showNonKeyboard && isNonKeyboard) {
      out += "🟩";
    } else {
      out += ch;
    }
    if (flags.showUnicodeTags && ch > "\u007f") {
      out += `[${cp.toString(16).toUpperCase().padStart(4, "0")}]`;
    }
  }
  return out;
}

function AnalysisDetail({ text }: { text: string }) {
  const a = analyzeText(text);
  const md = [
    `# Analysis`,
    `- Total characters: ${a.totalCharacters}`,
    `- Words: ${a.totalWords}`,
    `- Invisible: ${a.invisible.count} (${a.invisible.codePoints.join(", ")})`,
    `- Non-Keyboard: ${a.nonKeyboard.count} (${a.nonKeyboard.codePoints.join(", ")})`,
    `- Special Spaces: ${a.specialSpaces.count} (${a.specialSpaces.codePoints.join(", ")})`,
  ].join("\n");
  return <Ray.Detail markdown={md} />;
}
