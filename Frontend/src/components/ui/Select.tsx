"use client";

// Form dropdown that replaces the native <select>: a field-styled button that
// announces "Label: current value" and opens an ARIA listbox. Same keyboard model
// as the player Picker (arrows, Home/End, type-to-jump, Enter/Space, Escape, Tab).

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "@/lib/format";
import ui from "./ui.module.css";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectProps<T extends string | number> {
  /** Accessible name; the visible label stays in the surrounding <label>. */
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Submits the value with a surrounding <form>, like a native select would. */
  name?: string;
  invalid?: boolean;
  className?: string;
}

export function Select<T extends string | number>({ label, value, options, onChange, name, invalid, className }: SelectProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[selectedIndex];

  const enabled = (i: number) => !options[i]?.disabled;
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (enabled(i)) return i;
    return from;
  };

  const show = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const choose = (i: number) => {
    if (!enabled(i)) return;
    onChange(options[i].value);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Open upwards when there is no room below (e.g. near the bottom of a dialog).
  useLayoutEffect(() => {
    const el = list.current;
    if (!open || !el) return;
    el.dataset.up = "";
    const r = el.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 8 && r.top - r.height > 80) el.dataset.up = "1";
  }, [open]);

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
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => step(i, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => step(i, -1));
        break;
      case "Home":
        e.preventDefault();
        setActive(step(-1, 1));
        break;
      case "End":
        e.preventDefault();
        setActive(step(options.length, -1));
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
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const k = e.key.toLowerCase();
          const order = [...options.keys()].map((n) => (active + 1 + n) % options.length);
          const hit = order.find((n) => enabled(n) && options[n].label.toLowerCase().startsWith(k));
          if (hit !== undefined) setActive(hit);
        }
    }
  };

  return (
    <span className={cx(ui.selectWrap, className)} ref={root}>
      <button
        ref={button}
        type="button"
        className={ui.selectBtn}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${label}: ${current?.label ?? ""}`}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? close(true) : show())}
        onKeyDown={onButtonKey}
      >
        <span className={ui.selectValue}>{current?.label}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true" className={ui.selectChevron}>
          <path d="M2.5 4.5L6 8l3.5-3.5" />
        </svg>
      </button>
      {name ? <input type="hidden" name={name} value={String(value)} /> : null}
      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-o${active}`}
          className={ui.selectPanel}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              className={cx(ui.selectOption, i === active && ui.selectOptionActive)}
              onPointerEnter={() => enabled(i) && setActive(i)}
              onClick={() => choose(i)}
            >
              <span className={ui.selectTick} aria-hidden="true">
                {o.value === value && (
                  <svg viewBox="0 0 16 16">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                )}
              </span>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
