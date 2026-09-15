import { useState } from "react";
import { FileViewer } from "@/components/lab/FileViewer";
import { InfoNote, SuccessNote } from "@/components/lab/Feedback";
import { resolvePath, lookup } from "../fs";
import type { TaskContext } from "../../types";
import { cn } from "@/lib/utils";

const BASE = "/var/www/html/uploads/user-42";
const TARGET = "/home/acme/.ssh/id_rsa";

export default function Task09Api({ markComplete, isComplete }: TaskContext) {
  const [body, setBody] = useState(
    JSON.stringify({ filename: "avatar.png" }, null, 2),
  );
  const [sent, setSent] = useState<{ body: string; resolved: string } | null>(null);

  const send = () => {
    try {
      const obj = JSON.parse(body);
      const filename = String(obj.filename ?? "");
      const resolved = resolvePath(filename, { base: BASE });
      setSent({ body, resolved });
      if (resolved === TARGET) markComplete();
    } catch {
      setSent({ body, resolved: "" });
    }
  };

  const file = sent?.resolved ? lookup(sent.resolved) : undefined;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50">
        <div className="border-b border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
          <span className="mr-2 rounded bg-gold/20 px-1.5 py-0.5 font-mono text-[10px] text-gold">
            POST
          </span>
          <span className="font-mono">https://api.acme.example/files/download</span>
        </div>
        <div className="p-4">
          <label className="mb-2 block text-[11px] uppercase tracking-widest text-muted-foreground">
            Body JSON
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            rows={5}
            className="w-full rounded-md border border-border bg-background p-3 font-mono text-xs text-ivory outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
          />
          <button
            onClick={send}
            className={cn(
              "mt-3 rounded-md bg-gold px-4 py-2 text-xs font-medium text-primary-foreground transition hover:brightness-110 active:scale-95",
            )}
          >
            Invia richiesta
          </button>
        </div>
        {sent && (
          <FileViewer
            resolvedPath={sent.resolved || "(json non valido)"}
            content={file?.content}
            notFound={!file}
            secret={file?.secret}
          />
        )}
      </div>

      {!isComplete && (
        <InfoNote>
          Il file che chiedi viene cercato nella tua cartella{" "}
          <span className="font-mono">{BASE}</span>. Il server prende quella cartella e ci attacca
          il <code className="text-gold">filename</code> che hai scritto nel JSON, senza
          controllare dove finisce il percorso. Quindi: scrivi <code className="text-gold">../</code>{" "}
          abbastanza volte per tornare alla radice, poi il percorso della chiave SSH di{" "}
          <code>acme</code>:{" "}
          <code className="text-gold break-all">"../../../../../home/acme/.ssh/id_rsa"</code>.
        </InfoNote>
      )}

      {isComplete && (
        <SuccessNote>
          Ce l'hai fatta: anche una richiesta API senza URL modificato permette di leggere file
          fuori dalla tua cartella. Con una chiave SSH privata un attaccante entra nel server come
          quell'utente. La difesa migliore: il client non manda nomi di file, manda solo un numero
          (l'id del file nel database) — il percorso vero lo calcola il server, e l'utente non può
          cambiarlo.
        </SuccessNote>
      )}
    </div>
  );
}
