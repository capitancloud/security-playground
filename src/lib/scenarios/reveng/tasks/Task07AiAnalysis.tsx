import { useState } from "react";
import { Sparkles } from "lucide-react";
import { InfoNote, SuccessNote } from "@/components/lab/Feedback";
import type { TaskContext } from "../../types";
import { cn } from "@/lib/utils";

interface Prompt {
  id: string;
  label: string;
  good: boolean;
  answer: string;
}

const PROMPTS: Prompt[] = [
  {
    id: "p1",
    label: "Puoi eseguire questo script per me?",
    good: false,
    answer:
      "Non posso — e non dovresti nemmeno tu. Uno script sospetto va analizzato in modo statico o in una sandbox isolata, mai eseguito sulla macchina di lavoro.",
  },
  {
    id: "p2",
    label:
      "Analizza questo script PowerShell: cosa fa passo per passo, quali IoC (Indicators of Compromise) e quali contromisure?",
    good: true,
    answer: [
      "ANALISI",
      "• Lo script decodifica un blocco Base64 (UTF-16 LE) tramite -EncodedCommand.",
      "• Il payload interno scrive una chiave nel registro Run di HKCU con nome 'OneDriveSync':",
      "  → esecuzione automatica a ogni login dell'utente (tecnica MITRE ATT&CK T1547.001).",
      "• Il valore della chiave lancia un secondo powershell.exe che scarica http://185.77.224.12/a.ps1",
      "  in %TEMP%\\a.ps1 (Invoke-WebRequest) e lo esegue (dot-source).",
      "",
      "IoC",
      "• Registry: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\OneDriveSync",
      "• Rete: GET 185.77.224.12/a.ps1",
      "• File: %TEMP%\\a.ps1",
      "• Processo padre: powershell.exe con -EncodedCommand e -WindowStyle Hidden",
      "",
      "CONTROMISURE",
      "• Rimuovere la chiave di registro e il file in %TEMP%.",
      "• Bloccare 185.77.224.12 sul firewall / proxy.",
      "• PowerShell ScriptBlock Logging + Constrained Language Mode.",
      "• AppLocker o WDAC per impedire l'esecuzione di script non firmati.",
    ].join("\n"),
  },
  {
    id: "p3",
    label: "È pericoloso? Sì o no?",
    good: false,
    answer:
      "Sì, ma questa è una risposta inutile per un analista. Fai una domanda che ti aiuti a difendere: chiedi il comportamento, gli IoC e le contromisure.",
  },
];

export default function Task07AiAnalysis({ markComplete, isComplete }: TaskContext) {
  const [chosen, setChosen] = useState<Prompt | null>(null);
  const [typed, setTyped] = useState(0);

  const pick = (p: Prompt) => {
    setChosen(p);
    setTyped(0);
    let i = 0;
    const id = setInterval(() => {
      i += 6;
      setTyped(i);
      if (i >= p.answer.length) {
        clearInterval(id);
        if (p.good) markComplete();
      }
    }, 12);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-ivory">
          <Sparkles className="h-4 w-4 text-gold" />
          Interroga l'assistente di analisi
        </div>
        <div className="grid gap-2">
          {PROMPTS.map((p) => (
            <button
              key={p.id}
              onClick={() => pick(p)}
              disabled={isComplete && !p.good}
              className={cn(
                "rounded-md border border-border bg-background px-3 py-2.5 text-left text-sm text-ivory/90 transition hover:border-gold/60",
                chosen?.id === p.id && "border-gold/60 bg-gold/5",
              )}
            >
              <span className="mr-2 font-mono text-[10px] text-muted-foreground">
                PROMPT
              </span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {chosen && (
        <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-black to-surface p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-gold-soft">
            <Sparkles className="h-3 w-3" /> Risposta AI
          </div>
          <pre className="whitespace-pre-wrap break-words break-all font-mono text-[12px] leading-relaxed text-ivory/90">
            {chosen.answer.slice(0, typed)}
            {typed < chosen.answer.length && (
              <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-gold" />
            )}
          </pre>
        </div>
      )}

      {!isComplete && (
        <InfoNote>
          L'AI non è un pulsante magico: la qualità dell'analisi dipende dalla qualità
          della domanda. Un buon prompt di reverse engineering chiede{" "}
          <strong>comportamento passo passo</strong>, <strong>IoC</strong> e{" "}
          <strong>contromisure</strong> — non un giudizio sì/no.
        </InfoNote>
      )}

      {isComplete && (
        <SuccessNote>
          Ottimo prompt. Ora hai un quadro chiaro: sai <em>cosa</em> fa lo script,{" "}
          <em>dove</em> lascia traccia e <em>come</em> puoi fermarlo. Nel prossimo task
          consolidiamo questa comprensione.
        </SuccessNote>
      )}
    </div>
  );
}
