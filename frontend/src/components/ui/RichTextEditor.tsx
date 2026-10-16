import { useEffect, useRef, useState, useCallback } from 'react';
import type React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  RemoveFormatting,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Sparkles,
} from 'lucide-react';
import { FieldWrap } from './Input';
import { cn } from '@/utils/cn';

interface RichTextEditorProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  variables?: { label: string; value: string }[];
}

export function RichTextEditor({
  label,
  error,
  hint,
  required,
  value = '',
  onChange,
  placeholder = 'Write or paste agreement text here...',
  minHeight = '220px',
  className,
  variables = [
    { label: 'Tenant Name', value: '{{tenantName}}' },
    { label: 'Unit Number', value: '{{unitNumber}}' },
    { label: 'Building Name', value: '{{buildingName}}' },
    { label: 'Rent Amount', value: '{{rentAmount}}' },
    { label: 'Due Day', value: '{{dueDay}}' },
    { label: 'Start Date', value: '{{startDate}}' },
    { label: 'End Date', value: '{{endDate}}' },
  ],
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ul: false,
    ol: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
  });
  const [blockFormat, setBlockFormat] = useState<'p' | 'h1' | 'h2' | 'h3'>('p');
  const [showVariables, setShowVariables] = useState(false);

  // Sync value to editor only when external value changes and doesn't match current DOM
  useEffect(() => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      if (value !== currentHtml && (document.activeElement !== editorRef.current || !currentHtml)) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const updateActiveStates = useCallback(() => {
    if (typeof document === 'undefined') return;
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        alignLeft: document.queryCommandState('justifyLeft'),
        alignCenter: document.queryCommandState('justifyCenter'),
        alignRight: document.queryCommandState('justifyRight'),
      });

      const block = (document.queryCommandValue('formatBlock') || 'p').toLowerCase();
      if (block.includes('h1')) setBlockFormat('h1');
      else if (block.includes('h2')) setBlockFormat('h2');
      else if (block.includes('h3')) setBlockFormat('h3');
      else setBlockFormat('p');
    } catch {
      // Ignore unsupported command state errors
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveStates();
  };

  const exec = (command: string, arg?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleBlockChange = (tag: 'p' | 'h1' | 'h2' | 'h3') => {
    setBlockFormat(tag);
    exec('formatBlock', `<${tag}>`);
  };

  const insertVariable = (variableValue: string) => {
    exec('insertText', variableValue);
    setShowVariables(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        exec('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        exec('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        exec('underline');
      }
    }
  };

  return (
    <FieldWrap label={label} error={error} hint={hint} required={required} className={className}>
      <div
        className={cn(
          'flex flex-col rounded-2xl border border-line bg-paper overflow-hidden transition-all duration-150',
          'focus-within:border-crimson-400 focus-within:ring-4 focus-within:ring-crimson-100',
          error && 'border-crimson-300 ring-crimson-100'
        )}
      >
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-1 border-b border-line bg-paper-dim/80 px-2 py-1.5 backdrop-blur-xs select-none">
          {/* Headings dropdown */}
          <div className="flex items-center gap-0.5 rounded-lg bg-paper border border-line/60 p-0.5 shadow-2xs">
            <button
              type="button"
              title="Normal paragraph"
              onClick={() => handleBlockChange('p')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                blockFormat === 'p' ? 'bg-crimson-500 text-white' : 'text-ink-soft hover:bg-paper-deep'
              )}
            >
              <Pilcrow className="size-3.5" /> Normal
            </button>
            <button
              type="button"
              title="Heading 1"
              onClick={() => handleBlockChange('h1')}
              className={cn(
                'flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-semibold transition-colors',
                blockFormat === 'h1' ? 'bg-crimson-500 text-white' : 'text-ink-soft hover:bg-paper-deep'
              )}
            >
              <Heading1 className="size-3.5" /> H1
            </button>
            <button
              type="button"
              title="Heading 2"
              onClick={() => handleBlockChange('h2')}
              className={cn(
                'flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-semibold transition-colors',
                blockFormat === 'h2' ? 'bg-crimson-500 text-white' : 'text-ink-soft hover:bg-paper-deep'
              )}
            >
              <Heading2 className="size-3.5" /> H2
            </button>
            <button
              type="button"
              title="Heading 3"
              onClick={() => handleBlockChange('h3')}
              className={cn(
                'flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-semibold transition-colors',
                blockFormat === 'h3' ? 'bg-crimson-500 text-white' : 'text-ink-soft hover:bg-paper-deep'
              )}
            >
              <Heading3 className="size-3.5" /> H3
            </button>
          </div>

          <div className="h-4 w-px bg-line/80 mx-1" />

          {/* Inline formats */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Bold (Ctrl+B)"
              onClick={() => exec('bold')}
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep',
                activeFormats.bold && 'bg-crimson-100 font-bold text-crimson-700'
              )}
            >
              <Bold className="size-3.5" />
            </button>
            <button
              type="button"
              title="Italic (Ctrl+I)"
              onClick={() => exec('italic')}
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep',
                activeFormats.italic && 'bg-crimson-100 font-bold text-crimson-700'
              )}
            >
              <Italic className="size-3.5" />
            </button>
            <button
              type="button"
              title="Underline (Ctrl+U)"
              onClick={() => exec('underline')}
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep',
                activeFormats.underline && 'bg-crimson-100 font-bold text-crimson-700'
              )}
            >
              <Underline className="size-3.5" />
            </button>
            <button
              type="button"
              title="Strikethrough"
              onClick={() => exec('strikeThrough')}
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep',
                activeFormats.strike && 'bg-crimson-100 font-bold text-crimson-700'
              )}
            >
              <Strikethrough className="size-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-line/80 mx-1" />

          {/* Lists */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Bullet list"
              onClick={() => exec('insertUnorderedList')}
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep',
                activeFormats.ul && 'bg-crimson-100 font-bold text-crimson-700'
              )}
            >
              <List className="size-3.5" />
            </button>
            <button
              type="button"
              title="Numbered list"
              onClick={() => exec('insertOrderedList')}
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep',
                activeFormats.ol && 'bg-crimson-100 font-bold text-crimson-700'
              )}
            >
              <ListOrdered className="size-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-line/80 mx-1" />

          {/* Alignment */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Align left"
              onClick={() => exec('justifyLeft')}
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep',
                activeFormats.alignLeft && 'bg-crimson-100 font-bold text-crimson-700'
              )}
            >
              <AlignLeft className="size-3.5" />
            </button>
            <button
              type="button"
              title="Align center"
              onClick={() => exec('justifyCenter')}
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep',
                activeFormats.alignCenter && 'bg-crimson-100 font-bold text-crimson-700'
              )}
            >
              <AlignCenter className="size-3.5" />
            </button>
            <button
              type="button"
              title="Align right"
              onClick={() => exec('justifyRight')}
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep',
                activeFormats.alignRight && 'bg-crimson-100 font-bold text-crimson-700'
              )}
            >
              <AlignRight className="size-3.5" />
            </button>
            <button
              type="button"
              title="Justify"
              onClick={() => exec('justifyFull')}
              className="flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep"
            >
              <AlignJustify className="size-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-line/80 mx-1" />

          {/* Divider line & clear */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Insert horizontal line"
              onClick={() => exec('insertHorizontalRule')}
              className="flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep"
            >
              <Minus className="size-3.5" />
            </button>
            <button
              type="button"
              title="Clear formatting"
              onClick={() => exec('removeFormat')}
              className="flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep"
            >
              <RemoveFormatting className="size-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-line/80 mx-1" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Undo"
              onClick={() => exec('undo')}
              className="flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep"
            >
              <Undo className="size-3.5" />
            </button>
            <button
              type="button"
              title="Redo"
              onClick={() => exec('redo')}
              className="flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep"
            >
              <Redo className="size-3.5" />
            </button>
          </div>

          {/* Insert Variable Tag dropdown */}
          {variables && variables.length > 0 && (
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowVariables((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2 py-1 text-xs font-medium text-crimson-600 transition hover:bg-crimson-50"
              >
                <Sparkles className="size-3.5 text-crimson-500" />
                <span>Insert variable</span>
              </button>

              {showVariables && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowVariables(false)} />
                  <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-xl border border-line bg-paper p-1 shadow-lg ring-1 ring-black/5">
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      Placeholders
                    </p>
                    {variables.map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => insertVariable(v.value)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-ink hover:bg-crimson-50 hover:text-crimson-700 transition"
                      >
                        <span>{v.label}</span>
                        <code className="text-[10px] text-ink-faint">{v.value}</code>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── ContentEditable Document Canvas ── */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          onKeyDown={handleKeyDown}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className={cn(
            'w-full p-4 text-ink outline-none overflow-y-auto leading-relaxed text-[14.5px]',
            'prose-headings:font-display prose-headings:font-semibold prose-headings:text-ink',
            '[&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mt-4 [&>h1]:mb-2 [&>h1]:border-b [&>h1]:border-line [&>h1]:pb-1',
            '[&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mt-3.5 [&>h2]:mb-2 [&>h2]:text-ink',
            '[&>h3]:text-base [&>h3]:font-semibold [&>h3]:mt-3 [&>h3]:mb-1.5 [&>h3]:text-ink-soft',
            '[&>p]:mb-2.5 [&>p]:leading-relaxed',
            '[&>u]:underline [&>u]:decoration-ink-soft [&>u]:underline-offset-2',
            '[&>strong]:font-semibold [&>strong]:text-ink',
            '[&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-2 [&>ul]:space-y-1',
            '[&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:my-2 [&>ol]:space-y-1',
            '[&>hr]:my-4 [&>hr]:border-line',
            // Placeholder simulation when completely empty
            'empty:before:content-[attr(data-placeholder)] empty:before:text-ink-faint empty:before:pointer-events-none'
          )}
        />
      </div>
    </FieldWrap>
  );
}
