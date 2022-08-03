import {EditorView, keymap, highlightActiveLine, highlightSpecialChars} from "@codemirror/view"
import {EditorState} from "@codemirror/state"
import {standardKeymap, history, historyKeymap} from "@codemirror/commands"
import {indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching} from "@codemirror/language"
import {closeBrackets, closeBracketsKeymap} from "@codemirror/autocomplete"
import {javascript} from "@codemirror/lang-javascript"

export const initEditor = ({ parent, pre, doc }) => {
  const docElem = document.createElement('div')
  const preElem = document.createElement('div')
  preElem.classList.add('read-only')
  preElem.onclick = () => editor.focus()
  parent.append(preElem, docElem)
  const startLine = pre.split('\n').length
  let line = startLine
  console.log({ pre, doc })
  const editorPre = new EditorView({
    doc: pre,
    extensions: [
      javascript(),
      EditorState.tabSize.of(2),
      EditorState.readOnly.of(true),
      EditorView.editable.of(true),
      syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
    ],
    parent: preElem,
  })
  const editor = new EditorView({
    doc,
    extensions: [
      highlightSpecialChars(),
      // foldGutter(),
      history(),
      // drawSelection(),
      // dropCursor(),
      // EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
      bracketMatching(),
      closeBrackets(),
      // autocompletion(),
      // rectangularSelection(),
      // crosshairCursor(),
      highlightActiveLine(),
      // highlightSelectionMatches(),
      EditorState.tabSize.of(2),
      javascript(),
      keymap.of([
        // Order is important
        ...closeBracketsKeymap,
        // ...defaultKeymap,
        // ...searchKeymap,
        ...historyKeymap,
        // ...foldKeymap
        // ...completionKeymap,
        ...standardKeymap,
        // ...lintKeymap,
      ]),
    ],
    parent: docElem,
  })

  window.ed = editorPre.state
  return {
    setProvidedCode: providedCode => {
      const change = { from: 0, to: editorPre.state.doc.length, insert: providedCode }
      console.log(providedCode)
      editorPre.state.update({ changes: [change]})
    },
    focus: () => editor.focus(),
    getValue: () => editor.state.doc.toString(),
  }
}


    // if the selection is empty
    // -> expand to group?
    // else multi select matching selection

    /*
     {
      mode: 'javascript',
      theme: 'neo',
      keyMap: 'sublime',
      tabSize: 2,
      lineNumbers: true,
      indentWithTabs: false,
      autoCloseBrackets: true,
      scrollbarStyle: 'null',
      extraKeys: { 'Ctrl-S': run, 'Cmd-S': run, 'Ctrl-Enter': run }
    })
    */