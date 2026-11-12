"use client";

/**
 * A tiny overlay stack so that Escape always closes the top-most layer.
 *
 * Each overlay (drawer, modal) registers a closer when it opens. A single
 * shared keydown listener then closes whatever is on top — so Escape inside a
 * modal that sits above a drawer closes only the modal, not both.
 */

type Closer = () => void;

const closers: Closer[] = [];
let listening = false;

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  const top = closers[closers.length - 1];
  if (!top) return;
  e.preventDefault();
  e.stopPropagation();
  top();
}

/** Register an overlay closer. Returns the unregister function. */
export function registerOverlay(closer: Closer): () => void {
  if (typeof window !== "undefined" && !listening) {
    window.addEventListener("keydown", onKey);
    listening = true;
  }
  closers.push(closer);

  return () => {
    const i = closers.indexOf(closer);
    if (i >= 0) closers.splice(i, 1);
  };
}
