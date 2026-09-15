import { useState } from "react";
import { BrowserFrame } from "@/components/lab/BrowserFrame";
import { FileViewer } from "@/components/lab/FileViewer";
import { InfoNote, SuccessNote, WarnNote } from "@/components/lab/Feedback";
import { resolvePath, lookup } from "../fs";
import type { TaskContext } from "../../types";

const BASE = "/var/www/html/pages";
const TARGET = "/etc/passwd";

// Ora il server: 1) fa decodifica una volta, 2) blocca "..", 3) poi ripassa dal decoder (bug!)
export default function Task06DoubleEncoding({ markComplete, isComplete }: TaskContext) {
  const [url, setUrl] = useState("https://acme.example/read?file=note.txt");
  const parsed = url.match(/file=([^&]+)/)?.[1] ?? "";

  // Simulazione: decodifica 1 volta, blocca ".." letterali, poi decodifica ancora 1 volta.
  const step1 = safeDecode(parsed);
  const filtered = step1.replace(/\.\.[\\/]/g, "").replace(/[\\/]\.\.(?=[\\/]|$)/g, "");
  const resolved = parsed ? resolvePath(filtered, { base: BASE, decodeLevels: 1 }) : "";
  const file = resolved ? lookup(resolved) : undefined;

  const go = () => {
    if (resolved === TARGET) markComplete();
  };

  const usedSingle = /%2e%2e/i.test(parsed) && !/%25/.test(parsed);

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
        <>
          <InfoNote>
            Il filtro ora lavora bene: decodifica la stringa, cerca i «..» letterali e li blocca.
            Con una sola codifica non entri più. Il punto debole è un altro: prima di arrivare
            all'applicazione la richiesta passa per più componenti (proxy, framework), e più di
            uno decodifica l'URL. Il trucco è codificare <em>due volte</em>. Ricorda che il
            simbolo % si scrive <code className="text-gold">%25</code>, quindi il punto{" "}
            <code className="text-gold">%2e</code> diventa{" "}
            <code className="text-gold">%252e</code>. Al primo giro la stringa torna{" "}
            <code>%2e%2e%2f</code>: il filtro non vede ancora «..» e lascia passare. Al secondo
            giro diventa <code>../</code>, quando ormai il controllo è passato.
          </InfoNote>
          <div className="mt-4 rounded-lg border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Payload da provare
            </p>
            <code className="mt-2 block break-all font-mono text-sm leading-relaxed text-gold">
              ?file=%252e%252e%252f%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd
            </code>
          </div>
        </>
      )}

      {usedSingle && !file && (
        <WarnNote>
          Il filtro ha visto i «..» dopo la prima decodifica e ti ha bloccato. Nascondili anche
          dal primo giro: codifica <em>due volte</em> (ricorda: <code>%25</code> = <code>%</code>).
        </WarnNote>
      )}

      {isComplete && (
        <SuccessNote>
          Ogni layer che decodifica senza saperlo apre una feritoia. Difesa: decodifica{" "}
          <strong>una sola volta</strong>, poi normalizza, poi valida — e usa librerie per rendere il tutto canonico, non regex fai-da-te.
        </SuccessNote>
      )}
    </div>
  );
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
