"use client";

import { useMemo } from "react";
import { Check, Copy, Download, Wand2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { useCopy } from "@/hooks/useCopy";
import { buildAIPrompt } from "@/lib/prompt";
import type { Challenge } from "@/lib/types";

interface PromptModalProps {
  challenge: Challenge | null;
  onClose: () => void;
}

export function PromptModal({ challenge, onClose }: PromptModalProps) {
  const { copiedKey, copy } = useCopy();
  const prompt = useMemo(
    () => (challenge ? buildAIPrompt(challenge) : ""),
    [challenge],
  );

  const words = prompt ? prompt.trim().split(/\s+/).length : 0;

  const download = () => {
    if (!challenge) return;
    const blob = new Blob([prompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${challenge.id}-build-prompt.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={Boolean(challenge)}
      onClose={onClose}
      title="AI build prompt"
      subtitle={
        challenge
          ? `${challenge.name} · ~${words} words · paste into any coding assistant`
          : undefined
      }
      className="modal-wide"
      footer={
        <>
          <button
            type="button"
            className="btn btn-primary"
            data-autofocus
            onClick={() => copy(prompt, "prompt")}
          >
            {copiedKey === "prompt" ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copiedKey === "prompt" ? "Copied!" : "Copy prompt"}
          </button>
          <button type="button" className="btn" onClick={download}>
            <Download className="size-4" />
            Download .md
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="prompt-note">
        <Wand2 className="size-4" aria-hidden />
        <span>
          Everything below is generated from the challenge data already stored in
          this app — no external AI service is called.
        </span>
      </div>
      <pre className="prompt-pre" tabIndex={0}>
        {prompt}
      </pre>
    </Modal>
  );
}
