import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Type,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  sanitizeRichHtml,
  TEXT_COLOR_OPTIONS,
  HIGHLIGHT_COLOR_OPTIONS,
  type ColorOption,
} from '@/lib/richText';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  /** Tailwind classes for the editable area (e.g. 'h-48'). */
  className?: string;
}

const TOOLBAR_MARGIN = 12;
const TOOLBAR_GAP = 10;

type ToolbarPosition = { x: number; y: number };

type Formats = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
};

const EMPTY_FORMATS: Formats = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
};

function isInsideEditor(editor: HTMLElement, node: Node | null): boolean {
  return Boolean(node) && (node === editor || editor.contains(node));
}

/** Get the element a selection is anchored in (works for text and element nodes). */
function selectionContainer(): HTMLElement | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const container = selection.getRangeAt(0).commonAncestorContainer;
  if (container.nodeType === Node.ELEMENT_NODE) return container as HTMLElement;
  return container.parentElement;
}

/** Read the effective text color / highlight of the current selection. */
function readSelectionStyles(): { color: string; highlight: string } {
  const el = selectionContainer();
  if (!el) return { color: '', highlight: '' };
  const style = window.getComputedStyle(el);
  const color = style.getPropertyValue('color').trim();
  const highlight = style.getPropertyValue('background-color').trim();
  const isNone = (v: string) =>
    !v || v === 'transparent' || v === 'rgba(0, 0, 0, 0)';
  return {
    color: isNone(color) ? '' : color,
    highlight: isNone(highlight) ? '' : highlight,
  };
}

function rgbToHex(value: string): string {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '';
  return (
    '#' +
    [match[1], match[2], match[3]]
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')
  );
}

function matchesOption(options: ColorOption[], value: string): string {
  const hex = rgbToHex(value);
  if (!hex) return '';
  return options.find((o) => o.value && rgbToHex(o.value) === hex)?.value ?? '';
}

/**
 * Wrap the current selection in a <span> carrying one CSS property. Works for
 * text and multi-node selections (falls back to extract/insert when
 * surroundContents rejects the range).
 */
function wrapRangeWithStyle(
  range: Range,
  prop: 'color' | 'background-color',
  value: string,
): HTMLElement {
  const span = document.createElement('span');
  span.style.setProperty(prop, value);
  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  return span;
}

/** Remove a style (or the wrapping span entirely) from the selected content. */
function unwrapStyleInRange(
  range: Range,
  prop: 'color' | 'background-color',
): void {
  const container = range.commonAncestorContainer;
  const root =
    container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : (container as HTMLElement | null);
  if (!root) return;

  const candidates: HTMLElement[] = [];
  if (root.tagName === 'SPAN' && root.style.getPropertyValue(prop)) {
    candidates.push(root);
  }
  root.querySelectorAll('span').forEach((el) => {
    if ((el as HTMLElement).style.getPropertyValue(prop)) candidates.push(el);
  });

  for (const el of candidates) {
    if (!range.intersectsNode(el)) continue;
    el.style.removeProperty(prop);
    if (!el.getAttribute('style')) {
      el.replaceWith(...Array.from(el.childNodes));
    }
  }

  // The container itself may carry the style (e.g. whole paragraph selected).
  if (root.style.getPropertyValue(prop)) {
    root.style.removeProperty(prop);
    if (!root.getAttribute('style') && root.tagName === 'SPAN') {
      root.replaceWith(...Array.from(root.childNodes));
    }
  }
}

function placeCaretAtEnd(editor: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  ariaLabel = 'Isi catatan',
  autoFocus = false,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const toolbarVisibleRef = useRef(false);

  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition | null>(null);
  const [formats, setFormats] = useState<Formats>(EMPTY_FORMATS);
  const [activeTextColor, setActiveTextColor] = useState('');
  const [activeHighlight, setActiveHighlight] = useState('');
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [highlightPopoverOpen, setHighlightPopoverOpen] = useState(false);

  const syncValue = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    // Browsers leave a stray <br> when all content is deleted — normalize so
    // the CSS :empty placeholder shows and validation sees an empty note.
    if (html === '<br>' || html === '<div><br></div>') {
      editor.innerHTML = '';
      onChange('');
      return;
    }
    onChange(html);
  }, [onChange]);

  const refreshFormats = useCallback(() => {
    try {
      setFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
      });
    } catch {
      setFormats(EMPTY_FORMATS);
    }
    const { color, highlight } = readSelectionStyles();
    setActiveTextColor(matchesOption(TEXT_COLOR_OPTIONS, color));
    setActiveHighlight(matchesOption(HIGHLIGHT_COLOR_OPTIONS, highlight));
  }, []);

  const positionToolbar = useCallback((range: Range) => {
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setToolbarPos(null);
      return;
    }
    const el = toolbarRef.current;
    const width = el ? el.offsetWidth : 320;
    const height = el ? el.offsetHeight : 44;
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;

    const x = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, TOOLBAR_MARGIN),
      Math.max(TOOLBAR_MARGIN, vw - width - TOOLBAR_MARGIN),
    );
    let y = rect.top - height - TOOLBAR_GAP;
    if (y < TOOLBAR_MARGIN) {
      y = rect.bottom + TOOLBAR_GAP;
      if (y + height > vh - TOOLBAR_MARGIN) {
        y = Math.max(TOOLBAR_MARGIN, vh - height - TOOLBAR_MARGIN);
      }
    }
    setToolbarPos({ x, y });
  }, []);

  const updateSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      savedRangeRef.current = null;
      toolbarVisibleRef.current = false;
      setToolbarPos(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!isInsideEditor(editor, range.commonAncestorContainer)) {
      savedRangeRef.current = null;
      toolbarVisibleRef.current = false;
      setToolbarPos(null);
      return;
    }
    savedRangeRef.current = range.cloneRange();
    toolbarVisibleRef.current = true;
    positionToolbar(range);
    refreshFormats();
  }, [positionToolbar, refreshFormats]);

  // Keep the toolbar glued to the selection while the page scrolls.
  useEffect(() => {
    let frame = 0;
    const reposition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (savedRangeRef.current && toolbarVisibleRef.current) {
          positionToolbar(savedRangeRef.current);
        }
      });
    };
    document.addEventListener('selectionchange', updateSelection);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', updateSelection);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [updateSelection, positionToolbar]);

  // Restore the saved selection before running a formatting command. Toolbar
  // buttons preventDefault on pointerdown so the editor never loses focus, but
  // this also covers popover interactions where focus moves to the popover.
  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;
    if (savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
    editor.focus({ preventScroll: true });
  }, []);

  const afterFormat = useCallback(() => {
    syncValue();
    refreshFormats();
    // execCommand can collapse the selection; keep the toolbar only if a
    // non-collapsed selection still exists.
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      positionToolbar(selection.getRangeAt(0));
    } else {
      savedRangeRef.current = null;
      toolbarVisibleRef.current = false;
      setToolbarPos(null);
    }
  }, [syncValue, refreshFormats, positionToolbar]);

  const runInlineFormat = useCallback(
    (command: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      restoreSelection();
      try {
        document.execCommand(command, false, undefined);
      } catch {
        // execCommand throws on some webviews for some commands — ignore.
      }
      afterFormat();
    },
    [restoreSelection, afterFormat],
  );

  const applyColor = useCallback(
    (option: ColorOption, prop: 'color' | 'background-color') => {
      const editor = editorRef.current;
      if (!editor) return;
      restoreSelection();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }
      const range = selection.getRangeAt(0);
      if (option.value) {
        const span = wrapRangeWithStyle(range, prop, option.value);
        // Keep the selection on the formatted text so the user can chain
        // more formatting (e.g. bold + color + highlight).
        const next = document.createRange();
        next.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(next);
      } else {
        unwrapStyleInRange(range, prop);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      afterFormat();
    },
    [restoreSelection, afterFormat],
  );

  // Hydrate the editable area when the note changes (open, switch note, voice
  // transcript, form.reset). The equality guard keeps typing from being
  // interrupted — onChange keeps the parent value in sync with the DOM.
  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // Typing keeps the DOM and the form value in sync (onChange runs on every
    // input), so a cheap string compare covers the common path. Sanitize only
    // when the value really changed from outside (open, switch note, voice
    // transcript, form.reset).
    const current = editor.innerHTML === '<br>' ? '' : editor.innerHTML;
    if (current !== value) {
      const sanitized = sanitizeRichHtml(value || '');
      if (current !== sanitized) {
        editor.innerHTML = sanitized;
        if (autoFocus) editor.focus({ preventScroll: true });
        if (sanitized) placeCaretAtEnd(editor);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Initial focus when autoFocus is requested but value is still empty.
  useEffect(() => {
    if (!autoFocus) return;
    const editor = editorRef.current;
    if (editor && !editor.innerHTML) {
      editor.focus({ preventScroll: true });
    }
  }, [autoFocus]);

  const handleBlur = useCallback(() => {
    // Give focus a chance to land on the toolbar/popover (which live outside
    // the editor) before deciding the selection is gone.
    window.setTimeout(() => {
      const active = document.activeElement;
      const inToolbar =
        toolbarRef.current?.contains(active as Node) ||
        document.querySelector('[data-rich-toolbar]')?.contains(active as Node);
      if (inToolbar) return;
      savedRangeRef.current = null;
      toolbarVisibleRef.current = false;
      setToolbarPos(null);
      setColorPopoverOpen(false);
      setHighlightPopoverOpen(false);
    }, 0);
  }, []);

  const preventPointerDown = useCallback(
    (e: React.PointerEvent) => e.preventDefault(),
    [],
  );

  const toolbarButtonClass = (active: boolean) =>
    [
      'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      active
        ? 'bg-primary/15 text-primary'
        : 'text-foreground/70 hover:bg-muted active:bg-muted/70',
    ].join(' ');

  const toolbar = toolbarPos && (
    <div
      ref={toolbarRef}
      data-rich-toolbar
      role="toolbar"
      aria-label="Alat format teks"
      onPointerDown={preventPointerDown}
      className="fixed z-[70] flex items-center gap-0.5 rounded-xl border border-border/60 bg-card/95 p-1 shadow-elevation-3 backdrop-blur-xl"
      style={{
        left: toolbarPos.x,
        top: toolbarPos.y,
        maxWidth: 'calc(100vw - 1.5rem)',
        overflowX: 'auto',
      }}
    >
      <button
        type="button"
        aria-label="Tebal"
        aria-pressed={formats.bold}
        title="Tebal"
        className={toolbarButtonClass(formats.bold)}
        onClick={() => runInlineFormat('bold')}
      >
        <Bold size={17} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        aria-label="Miring"
        aria-pressed={formats.italic}
        title="Miring"
        className={toolbarButtonClass(formats.italic)}
        onClick={() => runInlineFormat('italic')}
      >
        <Italic size={17} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        aria-label="Garis bawah"
        aria-pressed={formats.underline}
        title="Garis bawah"
        className={toolbarButtonClass(formats.underline)}
        onClick={() => runInlineFormat('underline')}
      >
        <Underline size={17} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        aria-label="Coret"
        aria-pressed={formats.strike}
        title="Coret"
        className={toolbarButtonClass(formats.strike)}
        onClick={() => runInlineFormat('strikeThrough')}
      >
        <Strikethrough size={17} strokeWidth={2.4} />
      </button>

      <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border/70" />

      {/* Text color */}
      <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Warna teks"
            title="Warna teks"
            className={toolbarButtonClass(Boolean(activeTextColor))}
          >
            <Type size={17} strokeWidth={2.4} />
            <span
              aria-hidden="true"
              className="absolute bottom-1.5 left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full"
              style={{ backgroundColor: activeTextColor || 'currentColor' }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          data-rich-toolbar
          side="top"
          align="center"
          sideOffset={8}
          className="z-[80] w-auto rounded-xl border-border/60 bg-card p-2 shadow-elevation-3"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="px-1 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Warna teks
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {TEXT_COLOR_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                aria-label={`Warna teks ${option.label}`}
                title={option.label}
                onPointerDown={preventPointerDown}
                onClick={() => {
                  applyColor(option, 'color');
                  setColorPopoverOpen(false);
                }}
                className={[
                  'relative h-8 w-8 rounded-full border border-border/50 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activeTextColor === option.value ? 'ring-2 ring-foreground/60 ring-offset-2' : '',
                ].join(' ')}
                style={{ backgroundColor: option.swatch }}
              >
                {option.value === '' && (
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground/50"
                  />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlight color */}
      <Popover open={highlightPopoverOpen} onOpenChange={setHighlightPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Warna highlight"
            title="Warna highlight"
            className={toolbarButtonClass(Boolean(activeHighlight))}
          >
            <Highlighter size={17} strokeWidth={2.4} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          data-rich-toolbar
          side="top"
          align="center"
          sideOffset={8}
          className="z-[80] w-auto rounded-xl border-border/60 bg-card p-2 shadow-elevation-3"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="px-1 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Warna highlight
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {HIGHLIGHT_COLOR_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                aria-label={`Highlight ${option.label}`}
                title={option.label}
                onPointerDown={preventPointerDown}
                onClick={() => {
                  applyColor(option, 'background-color');
                  setHighlightPopoverOpen(false);
                }}
                className={[
                  'relative h-8 w-8 rounded-full border border-border/50 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activeHighlight === option.value ? 'ring-2 ring-foreground/60 ring-offset-2' : '',
                ].join(' ')}
                style={{ backgroundColor: option.swatch }}
              >
                {option.value === '' && (
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground/50"
                  />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        spellCheck
        className={[
          'rich-editor w-full resize-none bg-transparent text-lg font-medium leading-relaxed outline-none',
          className ?? '',
        ].join(' ')}
        onInput={syncValue}
        onKeyUp={updateSelection}
        onMouseUp={updateSelection}
        onBlur={handleBlur}
      />
      {toolbar}
    </>
  );
}
