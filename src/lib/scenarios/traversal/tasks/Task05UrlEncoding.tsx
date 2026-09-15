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
          Il filtro controlla se nella stringa c'è <code className="text-gold">..</code>: se lo
          trova, blocca. Ma tu non devi scrivere i due punti direttamente: ogni carattere di un
          URL si può scrivere in forma codificata. Il punto <code>.</code> si scrive %2e e lo
          slash <code>/</code> si scrive %2f. Quindi <code>../</code> diventa{" "}
          <code className="break-all text-gold">%2e%2e%2f</code>. Il filtro guarda la stringa
          codificata, non vede «..» e lascia passare; poi il server decodifica e i due punti
          riappariscono. Prova con{" "}
          <code className="break-all text-gold">?file=%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd</code>.
        </InfoNote>
      )}

      {blockedByFilter && (
        <WarnNote>Il filtro ha visto i ".." in chiaro. Nascondili scrivendoli in forma codificata.</WarnNote>
      )}

      {isComplete && (
        <SuccessNote>
          Cosa è successo: il filtro controllava la stringa <em>prima</em> che venisse decodificata
          (%2e%2e%2f non contiene «..»), ma il file system leggeva <em>dopo</em> la decodifica, quando
          %2e%2e%2f era tornato ../. La difesa vera è decodificare la stringa per prima cosa e
          controllare solo la forma finale del percorso.
        </SuccessNote>
      )}
    </div>
  );
}
