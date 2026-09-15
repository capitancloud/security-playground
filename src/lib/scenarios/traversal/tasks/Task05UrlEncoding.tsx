import { useState } from "react";
import { BrowserFrame } from "@/components/lab/BrowserFrame";
import { FileViewer } from "@/components/lab/FileViewer";
import { InfoNote, SuccessNote, WarnNote } from "@/components/lab/Feedback";
import { resolvePath, lookup } from "../fs";
import type { TaskContext } from "../../types";

const BASE = "/var/www/html/pages";
const TARGET = "/etc/passwd";

// Server "filtra" i ".." letterali ma poi fa decodifica URL una volta.
export default function Task05UrlEncoding({ markComplete, isComplete }: TaskContext) {
  const [url, setUrl] = useState("https://acme.example/read?file=note.txt");
  const parsed = url.match(/file=([^&]+)/)?.[1] ?? "";
  const resolved = parsed
    ? resolvePath(parsed, { base: BASE, blockLiteralDotDot: true, decodeLevels: 1 })
    : "";
  const file = resolved ? lookup(resolved) : undefined;
  const usedLiteral = parsed.includes("..");
  const blockedByFilter = usedLiteral && !file;

  const go = () => {
    if (resolved === TARGET) markComplete();
  };

  return (
    <div>
      <BrowserFrame url={url} onUrlChange={setUrl} onGo={go} label="Apri">
        {parsed ? (
          <FileViewer
            resolvedPath={resolved}
            content={file?.content}
            notFound={!file}
            secret={file?.secret}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Nessun file richiesto.</p>
        )}
      </BrowserFrame>

      {!isComplete && (
        <InfoNote>
          Il server oggi ha imparato a bloccare i <code className="text-gold">..</code> letterali.
          Ma i browser (e i client HTTP) applicano URL-encoding: <code>.</code> = %2e,{" "}
          <code>/</code> = %2f. Sostituisci i caratteri e prova{" "}
          <code className="break-all text-gold">?file=%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd</code>.
        </InfoNote>
      )}

      {blockedByFilter && (
        <WarnNote>Il filtro ha rimosso i "..". Devi nasconderli con l'URL-encoding.</WarnNote>
      )}

      {isComplete && (
        <SuccessNote>
          Il filtro guardava la stringa <em>prima</em> della decodifica, ma il file system la usa{" "}
          <em>dopo</em>. Regola: non validare sulla forma di superficie — canonicalizza prima
          (normalizza il percorso), poi decidi.
        </SuccessNote>
      )}
    </div>
  );
}
