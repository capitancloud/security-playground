import { useState } from "react";
import { CodeBlock } from "@/components/lab/Terminal";
import { InfoNote, SuccessNote, WarnNote } from "@/components/lab/Feedback";
import { B64_STRING, DECODED_PAYLOAD } from "../payloads";
import type { TaskContext } from "../../types";

// UTF-16LE decode (come fa PowerShell con -EncodedCommand)
function decodeUtf16Le(b64: string): string {
  try {
    const bin = atob(b64.trim());
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-16le").decode(bytes);
  } catch {
    return "";
  }
}

export default function Task03Base64({ markComplete, isComplete }: TaskContext) {
  const [value, setValue] = useState("");
  const [decoded, setDecoded] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const paste = () => setValue(B64_STRING);
  const decode = () => {
    setErr(null);
    const clean = value.replace(/\s+/g, "");
    if (!clean) {
      setErr("Incolla prima la stringa Base64.");
      return;
    }
    const out = decodeUtf16Le(clean);
    if (!out || !out.includes("HKCU")) {
      setErr("Decodifica fallita o output non plausibile. Ricontrolla la stringa.");
      setDecoded(null);
      return;
    }
    setDecoded(out);
    markComplete();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Blocco Base64 — flag -EncodedCommand (UTF-16 LE)
          </span>
          <button
            onClick={paste}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-ivory hover:border-gold/60"
          >
            Incolla dall'update.ps1
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          placeholder="JABwAD0AJwBIAEsAQwBVADoAXABTAG8AZgB0AHcA..."
          className="w-full rounded-md border border-border bg-background p-3 font-mono text-[11px] text-ivory outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={decode}
            className="shrink-0 rounded-md bg-gold px-4 py-2 text-xs font-medium text-primary-foreground transition hover:brightness-110 active:scale-95"
          >
            Decodifica
          </button>
          <span className="min-w-0 flex-1 break-all font-mono text-[11px] text-muted-foreground">
            equivalente di: [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($b))
          </span>
        </div>
      </div>

      {err && <WarnNote>{err}</WarnNote>}

      {decoded && (
        <CodeBlock language="payload decodificato — PowerShell">{decoded}</CodeBlock>
      )}

      {!isComplete && (
        <InfoNote>
          <strong>-EncodedCommand</strong> si aspetta Base64 di una stringa Unicode
          (UTF-16 LE). Ecco perché nella stringa vedi tanti byte a zero: sono i byte
          alti dei caratteri ASCII. La decodifica è il primo colpo di piccone contro
          l'offuscamento.
        </InfoNote>
      )}
      {isComplete && (
        <SuccessNote>
          Ecco il vero contenuto: lo script imposta una chiave di registro{" "}
          <code className="break-all">HKCU\Software\Microsoft\Windows\CurrentVersion\Run</code> — è{" "}
          <strong>persistenza</strong>: al prossimo login dell'utente verrà rieseguita.
          Il valore lancia un secondo stage che scarica <code>a.ps1</code> da un IP
          esterno.
        </SuccessNote>
      )}

      {/* debug hint: il payload atteso */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-ivory">
          Suggerimento: cosa ti aspetti di vedere?
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-black/40 p-2 font-mono text-[10px] text-muted-foreground/80">
          {DECODED_PAYLOAD.slice(0, 90)}…
        </pre>
      </details>
    </div>
  );
}
