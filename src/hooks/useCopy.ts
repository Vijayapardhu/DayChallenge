"use client";

import { useCallback, useEffect, useRef, useState } from "react";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function useCopy(resetMs = 1800) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string, key = "default") => {
      const ok = await writeClipboard(text);
      if (ok) {
        setCopiedKey(key);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopiedKey(null), resetMs);
      }
      return ok;
    },
    [resetMs],
  );

  return { copiedKey, copy };
}
