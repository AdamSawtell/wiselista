"use client";

import { useCallback, useRef, useState } from "react";

type BeforeAfterSliderProps = {
  originalUrl: string;
  editedUrl: string;
  alt: string;
};

export function BeforeAfterSlider({ originalUrl, editedUrl, alt }: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    setPosition((x / rect.width) * 100);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updatePosition(e.clientX);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    updatePosition(e.clientX);
  }

  function onPointerUp() {
    dragging.current = false;
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full cursor-ew-resize select-none overflow-hidden bg-slate-100"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="slider"
      aria-label={`${alt} before and after comparison`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
    >
      <img src={editedUrl} alt={`${alt} edited`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={originalUrl} alt={`${alt} original`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.35)]"
        style={{ left: `${position}%` }}
      />
      <div
        className="pointer-events-none absolute top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-wiselista-accent text-xs font-bold text-white shadow-md"
        style={{ left: `${position}%` }}
        aria-hidden
      >
        ↔
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
        Original
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
        Edited
      </div>
    </div>
  );
}
