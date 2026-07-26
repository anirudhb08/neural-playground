import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import {
  HighlightStyle,
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";

/** Syntax colours drawn from the page's own palette rather than a stock theme. */
const highlight = HighlightStyle.define([
  { tag: tags.comment, color: "#77806f", fontStyle: "italic" },
  { tag: tags.keyword, color: "#c22c5e" },
  { tag: [tags.string, tags.special(tags.string)], color: "#2e6a5c" },
  { tag: [tags.number, tags.bool, tags.null], color: "#8a6d1f" },
  { tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: "#1e4e6e" },
  { tag: tags.operator, color: "#15201b" },
  { tag: tags.punctuation, color: "#77806f" },
]);

const theme = EditorView.theme({
  "&": {
    backgroundColor: "#f2f3ed",
    color: "#15201b",
    fontSize: "12px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-content": {
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    padding: "12px 0",
    caretColor: "#ed3f72",
  },
  ".cm-line": { padding: "0 12px" },
  ".cm-gutters": {
    backgroundColor: "#f2f3ed",
    color: "#aab2a4",
    border: "none",
    borderRight: "1px solid rgba(46,106,92,0.16)",
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 12px" },
  ".cm-activeLine": { backgroundColor: "rgba(46,106,92,0.05)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  "&.cm-editor .cm-cursor": { borderLeftColor: "#ed3f72" },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(237,63,114,0.18) !important",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(46,106,92,0.18)",
    outline: "none",
  },
});

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Fired by Cmd/Ctrl+Enter, the notebook convention. */
  onRun: () => void;
};

export function CodeEditor({ value, onChange, onRun }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Kept in refs so the editor is built once and never torn down mid-typing.
  const latest = useRef({ onChange, onRun });
  latest.current = { onChange, onRun };

  useEffect(() => {
    if (!host.current) return;

    const extensions: Extension[] = [
      lineNumbers(),
      history(),
      indentOnInput(),
      bracketMatching(),
      python(),
      syntaxHighlighting(highlight),
      theme,
      placeholderExt("# your Python here"),
      EditorView.lineWrapping,
      keymap.of([
        {
          key: "Mod-Enter",
          preventDefault: true,
          run: () => {
            latest.current.onRun();
            return true;
          },
        },
        ...historyKeymap,
        ...defaultKeymap,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          latest.current.onChange(update.state.doc.toString());
        }
      }),
    ];

    const instance = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: host.current,
    });
    view.current = instance;
    return () => {
      instance.destroy();
      view.current = null;
    };
    // Built once; later value changes are reconciled in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only push external changes in (such as "Put it back"), never echo typing.
  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const current = instance.state.doc.toString();
    if (current === value) return;
    instance.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  return <div ref={host} className="overflow-hidden" />;
}
