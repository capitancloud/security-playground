import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { SuccessNote } from "@/components/lab/Feedback";
import type { TaskContext } from "../../types";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  {
    q: "Cosa fa la sequenza ../ dentro un percorso?",
    options: [
      "Ripete la cartella corrente",
      "Sale di una cartella nel filesystem",
      "Cifra il percorso",
      "Rimuove il file",
    ],
    correct: 1,
  },
  {
    q: "Su un server Linux, quale file è il classico bersaglio di un path traversal?",
    options: ["/etc/passwd", "/tmp/index.html", "/root/logo.png", "/usr/bin/ls"],
    correct: 0,
  },
  {
    q: "Su un server Windows, uno dei file storici di riferimento è:",
    options: ["C:\\Windows\\win.ini", "C:\\Users\\Public\\index.html", "C:\\Autoexec.bat", "C:\\Program Files\\password.txt"],
    correct: 0,
  },
  {
    q: "%2e%2e%2f è l'URL-encoding di:",
    options: ["../", "..\\", "%%%", "//."],
    correct: 0,
  },
  {
    q: "Perché %252e%252e%252f può bypassare un filtro?",
    options: [
      "Perché è più corto",
      "Perché sfrutta una doppia decodifica applicata dal server",
      "Perché è ignorato dal browser",
      "Perché è un formato binario",
    ],
    correct: 1,
  },
  {
    q: "A cosa serviva storicamente il null byte %00 in un attacco di path traversal?",
    options: [
      "A cancellare il file",
      "A troncare la stringa dopo il nome scelto, ignorando l'estensione appesa dal server",
      "A cifrare la richiesta",
      "A raddoppiare il payload",
    ],
    correct: 1,
  },
  {
    q: "Qual è la difesa più solida contro il path traversal?",
    options: [
      "Bloccare i .. con una regex",
      "Rendere canonico il percorso e verificare che resti dentro la cartella permessa",
      "Rinominare il file",
      "Rimuovere l'estensione",
    ],
    correct: 1,
  },
  {
    q: "Dove NON dovrebbero mai finire le password del database?",
    options: [
      "In un secret manager",
      "In variabili d'ambiente del processo",
      "In un file di configurazione dentro la webroot",
      "Cifrate in un KMS",
    ],
    correct: 2,
  },
  {
    q: "Il path traversal può presentarsi solo negli URL?",
    options: [
      "Sì, solo negli URL",
      "No, ovunque un input utente finisca in una chiamata al filesystem (body JSON, header, upload…)",
    ],
    correct: 1,
  },
  {
    q: "Rispetto a un nome di file, cos'è preferibile passare al server?",
    options: [
      "Un percorso relativo",
      "Un identificatore opaco (es. l'id del file nel DB)",
      "Il percorso assoluto completo",
      "Il nome originale scelto dall'utente",
    ],
    correct: 1,
  },
];

export default function Task10Quiz({ markComplete, isComplete }: TaskContext) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(QUESTIONS.length).fill(null),
  );
  const [checked, setChecked] = useState(false);

  const rightCount = QUESTIONS.filter((q, i) => answers[i] === q.correct).length;
  const allRight = rightCount === QUESTIONS.length;

  const check = () => {
    setChecked(true);
    if (allRight) markComplete();
  };

  return (
    <div>
      <div className="space-y-4">
        {QUESTIONS.map((q, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-2xl shadow-black/40"
          >
            <p className="mb-3 font-serif text-lg text-ivory">
              <span className="mr-2 font-mono text-xs text-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
              {q.q}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, j) => {
                const selected = answers[i] === j;
                const isCorrect = checked && j === q.correct;
                const isWrong = checked && selected && j !== q.correct;
                return (
                  <button
                    key={j}
                    onClick={() => {
                      const a = [...answers];
                      a[i] = j;
                      setAnswers(a);
                      setChecked(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border px-4 py-2.5 text-left text-sm transition",
                      selected
                        ? "border-gold bg-gold/10 text-ivory"
                        : "border-border bg-background text-muted-foreground hover:border-gold/50 hover:text-ivory",
                      isCorrect && "border-success bg-success/10 text-ivory",
                      isWrong && "border-destructive bg-destructive/10 text-ivory",
                    )}
                  >
                    <span>{opt}</span>
                    {isCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {isWrong && <XCircle className="h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          onClick={check}
          disabled={answers.some((a) => a === null)}
          className="rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Verifica risposte
        </button>
        {checked && (
          <span
            className={cn(
              "text-sm",
              allRight ? "text-success" : "text-muted-foreground",
            )}
          >
            {rightCount} / {QUESTIONS.length} corrette
            {!allRight && " — rivedi le sbagliate e riprova."}
          </span>
        )}
      </div>

      {isComplete && (
        <SuccessNote>
          Modulo completato. Le tre regole d'oro contro il path traversal:{" "}
          <strong>canonicalizza prima di validare</strong>, <strong>confina il processo</strong>{" "}
          (chroot, container, permessi) e <strong>tratta i file come id, non come nomi</strong>.
        </SuccessNote>
      )}
    </div>
  );
}
