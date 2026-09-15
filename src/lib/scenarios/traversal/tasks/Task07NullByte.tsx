import { useState } from "react";
import { BrowserFrame } from "@/components/lab/BrowserFrame";
import { FileViewer } from "@/components/lab/FileViewer";
import { InfoNote, SuccessNote, WarnNote } from "@/components/lab/Feedback";
import { resolvePath, lookup } from "../fs";
import type { TaskContext } from "../../types";

const BASE = "/var/www/html/pages";
const TARGET = "/etc/passwd";

// Server: appende ".txt" se il path non finisce con .txt, ma legge il file con una libreria vecchia che tronca al \0
export default function Task07NullByte({ markComplete, isComplete }: TaskContext) {
  const [url, setUrl] = useState("https://acme.example/read?file=note.txt");
  const parsed = url.match(/file=([^&]+)/)?.[1] ?? "";
  const resolved = parsed
    ? resolvePath(parsed, {
        base: BASE,
        decodeLevels: 1,
        acceptNullByte: true,
        extensionWhitelist: [".txt"],
      })
    : "";
  const file = resolved ? lookup(resolved) : undefined;

  const go = () => {
    if (resolved === TARGET) markComplete();
  };

  const missingNullByte = parsed.includes("passwd") && !parsed.includes("%00");

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
          Il server aggiunge <code className="text-gold">.txt</code> ai file che non finiscono
          già così. Ma il carattere <code className="text-gold">%00</code> (null byte) dice
          «qui finisce il testo»: tutto ciò che viene dopo viene ignorato, incluso il .txt.
          Prova <code className="text-gold">?file=../../../../etc/passwd%00</code>.
        </InfoNote>
      )}

      {missingNullByte && !file && (
        <WarnNote>
          Il server ha aggiunto <code>.txt</code> e il file non esiste. Aggiungi{" "}
          <code>%00</code> alla fine dell'indirizzo: il null byte taglia il testo in quel
          punto e il server dimentica il .txt.
        </WarnNote>
      )}

      {isComplete && (
        <SuccessNote>
          Perfetto: il null byte ha tagliato il .txt e il server ha letto /etc/passwd.
          Nei linguaggi moderni questo trucco è bloccato, ma la lezione vale ancora:
          quando due componenti leggono la stessa stringa in modi diversi, nasce una falla.
        </SuccessNote>
      )}
    </div>
  );
}
