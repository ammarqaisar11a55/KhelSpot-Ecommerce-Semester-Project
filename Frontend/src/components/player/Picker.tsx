"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "@/lib/format";
import v from "./venues.module.css";

export interface PickerOption {
  value: string;
  label: string;
  /** Short note on the right, e.g. "12 free". */
  meta?: string;
  /** Shown muted (still selectable), e.g. nothing free there. */
  dim?: boolean;
}

interface PickerProps {
  /** Accessible name, e.g. "Sport". */
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
}

/**
 * Inline word that opens a listbox: the underlined words in the
 * "Show me ___ courts ___ in ___" sentence. Follows the ARIA listbox pattern.
 */
export function Picker({ label, value, options, onChange }: PickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[selectedIndex];

  const show = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  const choose = (index: number) => {
    onChange(options[index].value);
    close(true);
  };

  // Focus the list when it opens; close on outside press.
  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Nudge the panel left if it would run off the right edge of a narrow screen.
  useLayoutEffect(() => {
    const el = list.current;
    if (!open || !el) return;
    el.style.translate = "";
    const overflow = el.getBoundingClientRect().right - (window.innerWidth - 16);
    if (overflow > 0) el.style.translate = `${-overflow}px 0`;
  }, [open]);

  // Keep the active option in view.
  useEffect(() => {
    if (open) document.getElementById(`${id}-o${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const onButtonKey = (e: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      show();
    }
  };

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
      default:
        // Type a letter to jump to the next option starting with it.
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const k = e.key.toLowerCase();
          const order = [...options.keys()].map((n) => (active + 1 + n) % options.length);
          const hit = order.find((n) => options[n].label.toLowerCase().startsWith(k));
          if (hit !== undefined) setActive(hit);
        }
    }
  };

  return (
    <span className={v.picker} ref={root}>
      <button
        ref={button}
        type="button"
        className={cx(v.pickerBtn, open && v.pickerBtnOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${current.label}`}
        onClick={() => (open ? close(true) : show())}
        onKeyDown={onButtonKey}
      >
        {current.label}
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5L6 8l3.5-3.5" />
        </svg>
      </button>
      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-o${active}`}
          className={v.pickerPanel}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={o.value === value}
              className={cx(v.pickerOption, i === active && v.pickerOptionActive, o.dim && v.pickerOptionDim)}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span className={v.pickerTick} aria-hidden="true">
                {o.value === value && (
                  <svg viewBox="0 0 16 16">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                )}
              </span>
              <span className={v.pickerLabel}>{o.label}</span>
              {o.meta && <span className={v.pickerMeta}>{o.meta}</span>}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
