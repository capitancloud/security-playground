import { useState } from "react";
import { CodeBlock } from "@/components/lab/Terminal";
import { InfoNote, SuccessNote } from "@/components/lab/Feedback";
import { CHARCODE_SCRIPT } from "../payloads";
import type { TaskContext } from "../../types";

const BYTES_C = [73, 110, 118, 111, 107, 101, 45, 69, 120, 112, 114, 101, 115, 115, 105, 111, 110];
const BYTES_U = [
  104, 116, 116, 112, 58, 47, 47, 49, 56, 53, 46, 55, 55, 46, 50, 50, 52, 46, 49, 50, 47, 97, 46,
  112, 115, 49,
];

export default function Task05CharCode({ markComplete, isComplete }: TaskContext) {
  const [showC, setShowC] = useState(false);
  const [showU, setShowU] = useState(false);

  const decodeC = () => setShowC(true);
  const decodeU = () => {
    setShowU(true);
    markComplete();
  };

  return (
    <div className="space-y-4">
      <CodeBlock language="variante 2 — array di byte → char">{CHARCODE_SCRIPT}</CodeBlock>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel
          title="$c — decodifica in ASCII"
          bytes={BYTES_C}
          decoded={String.fromCharCode(...BYTES_C)}
          show={showC}
          onDecode={decodeC}
        />
        <Panel
          title="$u — decodifica in ASCII"
          bytes={BYTES_U}
          decoded={String.fromCharCode(...BYTES_U)}
          show={showU}
          onDecode={decodeU}
        />
      </div>

      {!isComplete && (
        <InfoNote>
          Ogni numero è il <em>codice ASCII</em> di un carattere. <code>73</code> è
          'I', <code>110</code> è 'n', ecc. È lo stesso trucco della concatenazione,
          ma con un livello in più: sposta la ricerca dell'antivirus dai testi ai
          numeri, che sono molto più facili da mascherare.
        </InfoNote>
      )}

      {isComplete && (
        <SuccessNote>
          Anche qui la ricetta finale è <code>Invoke-Expression</code> +
          <code> Net.WebClient.DownloadString</code>: scarica lo stage 2 da un IP e lo
          esegue in memoria. Stesso comportamento, offuscamento diverso.
        </SuccessNote>
      )}
    </div>
  );
}

function Panel({
  title,
  bytes,
  decoded,
  show,
  onDecode,
}: {
  title: string;
  bytes: number[];
  decoded: string;
  show: boolean;
  onDecode: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div className="mb-3 flex flex-wrap gap-1 font-mono text-[11px] text-ivory/80">
        {bytes.map((b, i) => (
          <span key={i} className="rounded bg-black/40 px-1.5 py-0.5">
            {b}
          </span>
        ))}
      </div>
      {!show ? (
        <button
          onClick={onDecode}
          className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:brightness-110 active:scale-95"
        >
          Decodifica in ASCII
        </button>
      ) : (
        <div className="overflow-x-auto rounded border border-success/40 bg-success/10 p-2 font-mono text-[12px] break-all whitespace-normal text-ivory">
          {decoded}
        </div>
      )}
    </div>
  );
}
