import { describe, expect, it } from "@jest/globals";
import { RESERVED_CHORDS, SHORTCUTS, chordOf, clashes, formatChord, platformOf, tiptapKey } from "./shortcuts";

describe("shortcuts", () => {
  it("no two commands share a chord, and none takes one that the system uses", () => {
    expect(clashes()).toEqual([]);
    for (const command of SHORTCUTS) if (command.chord) expect(RESERVED_CHORDS).not.toContain(command.chord);
  });

  it("every chord has the form of modifiers and one key, and every command appears once", () => {
    const ids = SHORTCUTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const command of SHORTCUTS) {
      if (command.chord) expect(command.chord).toMatch(/^(?:(?:Mod|Alt|Shift)\+)*[^+]$/);
    }
  });

  it("finds a clash when there is one", () => {
    expect(clashes([{ id: "a", group: "text", chord: "Mod+B", scope: "editor" }, { id: "b", group: "text", chord: "Mod+B", scope: "window" }])).toEqual(["Mod+B"]);
  });

  it("writes a chord for each platform", () => {
    expect(formatChord("Mod+Alt+1", "mac")).toBe("⌥⌘1");
    expect(formatChord("Mod+Shift+S", "mac")).toBe("⇧⌘S");
    expect(formatChord("Mod+Alt+1", "win")).toBe("Ctrl+Alt+1");
    expect(formatChord("Mod+Shift+S", "linux")).toBe("Ctrl+Shift+S");
    expect(formatChord("Mod+,", "win")).toBe("Ctrl+,");
    expect(formatChord("Mod+\\", "mac")).toBe("⌘\\");
    expect(formatChord("Mod+/", "mac")).toBe("⌘/");
  });

  it("names a chord for TipTap", () => {
    expect(tiptapKey("Mod+Alt+C")).toBe("Mod-Alt-c");
    expect(tiptapKey("Mod+Shift+8")).toBe("Mod-Shift-8");
  });

  it("reads the platform from the name the browser gives", () => {
    expect(platformOf("MacIntel")).toBe("mac");
    expect(platformOf("Win32")).toBe("win");
    expect(platformOf("Linux x86_64")).toBe("linux");
  });

  it("looks a chord up by command", () => {
    expect(chordOf("bold")).toBe("Mod+B");
    expect(chordOf("nothing")).toBeNull();
  });
});
