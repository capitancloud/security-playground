import React from "react";

// Minimal markdown-ish renderer for task descriptions.
// Supports: blank-line paragraphs, bullet lists ("- "), numbered lists ("1. "),
// inline **bold** and `code`.

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Split on **bold** and `code` while keeping delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const k = `${keyBase}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={k} className="text-ivory">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code key={k} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-ivory break-all">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={k}>{part}</React.Fragment>;
  });
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className={className ?? "space-y-3 text-sm leading-relaxed text-muted-foreground"}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const isBullet = lines.every((l) => /^-\s+/.test(l));
        const isNumbered = lines.every((l) => /^\d+\.\s+/.test(l));

        if (isBullet && lines.length > 0) {
          return (
            <ul key={bi} className="list-disc space-y-1.5 pl-5 marker:text-gold/70">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^-\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        if (isNumbered && lines.length > 0) {
          return (
            <ol key={bi} className="list-decimal space-y-1.5 pl-5 marker:text-gold/70">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\d+\.\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={bi}>{renderInline(block.replace(/\n/g, " "), String(bi))}</p>
        );
      })}
    </div>
  );
}
