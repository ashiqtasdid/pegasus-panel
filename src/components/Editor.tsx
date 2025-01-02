import { FC, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { FileItem } from '@/types/type';

interface CodeEditorProps {
  file: FileItem;
  onChange: (content: string) => void;
}

const Editor: FC<CodeEditorProps> = ({ file, onChange }) => {
  const [fontSize, setFontSize] = useState(14);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };
  const handleEditorMount = (editor: any) => {
    // Prevent browser zoom
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '+')) {
        e.preventDefault();
      }
    }, { passive: false });

    // Handle editor-specific zoom
    editor.onKeyDown((e: any) => {
      if (e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setFontSize(prev => Math.min(prev + 2, 40));
        } else if (e.key === '-') {
          e.preventDefault();
          setFontSize(prev => Math.max(prev - 2, 8));
        }
      }
    });

    // Handle mouse wheel zoom
    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      editorDomNode.addEventListener('wheel', (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -2 : 2;
          setFontSize(prev => Math.min(Math.max(prev + delta, 8), 40));
        }
      }, { passive: false });
    }
  };

  return (
    <MonacoEditor
      height="100%"
      language={file.name.split('.').pop() || 'typescript'}
      theme="vs-dark"
      value={file.content}
      onChange={handleEditorChange}
      onMount={handleEditorMount}
      options={{
        minimap: { enabled: true },
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        fontSize: fontSize,
        automaticLayout: true,
      }}
    />
  );
};

export default Editor;