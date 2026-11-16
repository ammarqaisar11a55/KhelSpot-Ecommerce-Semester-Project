import ui from "./ui.module.css";

export function BlockSkeleton({ height = 240, label = "Loading" }: { height?: number; label?: string }) {
  return (
    <div role="status" aria-label={label}>
      <div className={ui.skeleton} style={{ height }} />
    </div>
  );
}

export function GridSkeleton({ count = 6, height = 250 }: { count?: number; height?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={ui.skeleton} style={{ height }} />
      ))}
    </div>
  );
}
