import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { CodeBlock } from "@/components/lab/Terminal";
import { InfoNote, SuccessNote } from "@/components/lab/Feedback";
import { SUSPICIOUS_LAUNCHER } from "../payloads";
import type { TaskContext } from "../../types";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "a", text: "Il flag -EncodedCommand con un blocco Base64 lungo e -WindowStyle Hidden", ok: true },
  { id: "b", text: "L'uso di Write-Host per stampare a schermo", ok: false },
  { id: "c", text: "Il fatto che sia un file .ps1", ok: false },
  { id: "d", text: "La presenza di un commento in italiano", ok: false },
];

export default function Task02Suspect({ markComplete, isComplete }: TaskContext) {
  const [picked, setPicked] = useState<string | null>(null);

  const choose = (id: string) => {
    setPicked(id);
    const opt = OPTIONS.find((o) => o.id === id);
    if (opt?.ok) markComplete();
  };

  return (
    <div className="space-y-4">
      <CodeBlock language="update.ps1 — file sospetto">{SUSPICIOUS_LAUNCHER}</CodeBlock>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 text-sm text-ivory">
          Quale elemento in questo script fa scattare i campanelli d'allarme?
        </div>
        <div className="grid gap-2">
          {OPTIONS.map((o) => {
            const active = picked === o.id;
            const state = active ? (o.ok ? "ok" : "ko") : "idle";
            return (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                disabled={isComplete && !o.ok}
                className={cn(
                  "flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-left text-sm text-ivory/90 transition hover:border-gold/60",
                  state === "ok" && "border-success/60 bg-success/10",
                  state === "ko" && "border-destructive/60 bg-destructive/10",
                )}
              >
                <span className="mt-0.5">
                  {state === "ok" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : state === "ko" ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <span className="inline-block h-4 w-4 rounded-full border border-muted-foreground/50" />
                  )}
                </span>
                <span>{o.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!isComplete && (
        <InfoNote>
          <strong>-EncodedCommand</strong> serve legittimamente a evitare problemi di
          escaping, ma è anche il modo più comune con cui i malware nascondono ciò che
          fanno. Combinato con <strong>-WindowStyle Hidden</strong> e{" "}
          <strong>-ExecutionPolicy Bypass</strong> è quasi sempre malevolo.
        </InfoNote>
      )}
      {isComplete && (
        <SuccessNote>
          Bene: hai identificato l'artefatto tipico. Nel prossimo task decodifichiamo
          davvero quel blocco Base64 e vediamo cosa nasconde.
        </SuccessNote>
      )}
    </div>
  );
}
