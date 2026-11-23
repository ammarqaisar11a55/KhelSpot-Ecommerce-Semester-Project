"use client";

// Columns of quotes drifting in opposite directions, easing to a stop under the mouse,
// with a pause button. No animation library: one requestAnimationFrame loop per column
// writes a transform straight to the DOM (no React renders while it runs), and the loop
// idles while the wall is off screen. Reduced motion: still, scrollable columns.

import { useEffect, useRef, useState, type RefObject } from "react";

export interface WallQuote {
  quote: string;
  /** Part of `quote` to mark, the line a reader should take away. */
  highlight?: string;
  name: string;
  role: string;
  place: string;
}

// Stays false until mounted so the server render and the first client render match.
function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduce;
}

const TONES = ["quoteAvatar--turf", "quoteAvatar--flood", "quoteAvatar--sand"];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function toneFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

function QuoteText({ text, highlight }: { text: string; highlight?: string }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{highlight}</mark>
      {text.slice(at + highlight.length)}
    </>
  );
}

function QuoteCard({ item }: { item: WallQuote }) {
  return (
    <figure className="quoteCard">
      <svg className="quoteCard__mark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 7H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v1a2 2 0 0 1-2 2v2a4 4 0 0 0 4-4zm10 0h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v1a2 2 0 0 1-2 2v2a4 4 0 0 0 4-4z" />
      </svg>
      <blockquote>
        <QuoteText text={item.quote} highlight={item.highlight} />
      </blockquote>
      <figcaption>
        <span className={`quoteAvatar ${toneFor(item.name)}`} aria-hidden="true">
          {initials(item.name)}
        </span>
        <span className="quoteCard__who">
          <span className="quoteCard__name">{item.name}</span>
          <span className="quoteCard__role">
            {item.role}, {item.place}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

function ScrollColumn({
  items,
  speed,
  reverse,
  offset,
  hovered,
  paused,
  visible,
  reduce,
}: {
  items: WallQuote[];
  speed: number;
  reverse: boolean;
  offset: number;
  hovered: RefObject<boolean>;
  paused: boolean;
  visible: RefObject<boolean>;
  reduce: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(2);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const copy = copyRef.current;
    if (!viewport || !track || !copy) return;
    if (reduce) {
      track.style.transform = "";
      return;
    }

    let height = 0;
    let y = 0;
    let velocity = 0;
    let last = 0;
    let frame = 0;

    const measure = () => {
      height = copy.offsetHeight;
      if (height > 0) {
        setCopies(Math.max(2, Math.ceil(viewport.offsetHeight / height) + 1));
        y = -height * offset;
        track.style.transform = `translate3d(0, ${y}px, 0)`;
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(copy);

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = last ? Math.min(now - last, 50) / 1000 : 0;
      last = now;
      if (!height || !visible.current) return;
      const still = hovered.current || pausedRef.current;
      const target = still ? 0 : reverse ? speed : -speed;
      const rate = still ? 3.2 : 1.4; // stop quicker than it starts
      velocity += (target - velocity) * (1 - Math.exp(-rate * dt));
      if (target === 0 && Math.abs(velocity) < 0.3) {
        velocity = 0;
        return;
      }
      y = ((((y + velocity * dt) % height) - height) % height) || 0;
      track.style.transform = `translate3d(0, ${y}px, 0)`;
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [reduce, offset, reverse, speed, hovered, visible]);

  return (
    <div
      ref={viewportRef}
      className={reduce ? "quoteCol quoteCol--still" : "quoteCol"}
      role={reduce ? "region" : undefined}
      aria-label={reduce ? "Quotes" : undefined}
      tabIndex={reduce ? 0 : undefined}
    >
      <div ref={trackRef} className="quoteCol__track">
        {Array.from({ length: reduce ? 1 : copies }, (_, copy) => (
          <div key={copy} ref={copy === 0 ? copyRef : undefined} className="quoteCol__copy" aria-hidden={copy > 0 || undefined}>
            {items.map((item) => (
              <QuoteCard key={item.name} item={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuoteWall({
  quotes,
  eyebrow,
  title,
  note,
  speed = 28,
}: {
  quotes: WallQuote[];
  eyebrow: string;
  title: string;
  /** Small line under the title, e.g. saying the quotes are samples. */
  note?: string;
  /** Pixels per second for the first column; the others run a little faster. */
  speed?: number;
}) {
  const reduce = useReducedMotion();
  const wallRef = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const visible = useRef(false);
  const [paused, setPaused] = useState(false);
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setColumnCount(w < 560 ? 1 : w < 860 ? 2 : 3);
    });
    ro.observe(wall);
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
    });
    io.observe(wall);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const columns = Array.from({ length: columnCount }, (_, c) => quotes.filter((_, i) => i % columnCount === c));

  return (
    <section className="quotes" aria-labelledby="quotes-title">
      <div className="wrap">
        <header className="quotes__head">
          <div>
            <p className="eyebrow eyebrow--dark">{eyebrow}</p>
            <h2 id="quotes-title">{title}</h2>
            {note ? <p className="quotes__note">{note}</p> : null}
          </div>
          {!reduce && (
            <button
              type="button"
              className="quotes__pause"
              aria-pressed={paused}
              aria-label={paused ? "Resume scrolling quotes" : "Pause scrolling quotes"}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5.5v13l10.5-6.5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                </svg>
              )}
            </button>
          )}
        </header>
        <div
          ref={wallRef}
          className="quotes__wall"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") hovered.current = true;
          }}
          onPointerLeave={() => {
            hovered.current = false;
          }}
        >
          {columns.map((items, c) => (
            <ScrollColumn
              key={`${columnCount}-${c}`}
              items={items}
              speed={speed * (1 + (c % 3) * 0.12)}
              reverse={c % 2 === 1}
              offset={c * 0.37}
              hovered={hovered}
              paused={paused}
              visible={visible}
              reduce={reduce}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
