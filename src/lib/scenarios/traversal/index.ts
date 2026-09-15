import type { Scenario } from "../types";
import Task01Basics from "./tasks/Task01Basics";
import Task02DotDot from "./tasks/Task02DotDot";
import Task03Etc from "./tasks/Task03Etc";
import Task04Windows from "./tasks/Task04Windows";
import Task05UrlEncoding from "./tasks/Task05UrlEncoding";
import Task06DoubleEncoding from "./tasks/Task06DoubleEncoding";
import Task07NullByte from "./tasks/Task07NullByte";
import Task08Config from "./tasks/Task08Config";
import Task09Api from "./tasks/Task09Api";
import Task10Quiz from "./tasks/Task10Quiz";
import { traversalSlides } from "./slides";

export const traversalScenario: Scenario = {
  id: "directory-traversal",
  slug: "directory-traversal",
  title: "Directory Traversal",
  subtitle: "Uscire dalla cartella prevista dall'applicazione",
  intro:
    "Quando un'applicazione compone un percorso di file usando un input dell'utente, chi conosce la struttura del filesystem può risalire le cartelle con ../ e leggere file che non dovrebbe: /etc/passwd, chiavi SSH, file di configurazione con password del database. Vediamo come funziona, come i filtri ingenui vengono aggirati, e come si difende davvero.",
  slides: traversalSlides,
  difficulty: "Base",
  status: "available",
  tasks: [
    {
      id: "01-basi",
      title: "Come il server trova un file",
      goal: "Capire il join tra cartella base e nome file",
      brief:
        "Il server ha una cartella di base e ci aggiunge il nome che gli passi. Osserva come si compone il percorso finale.",
      details:
        "Un endpoint tipico è `/read?file=note.txt`. Il server:\n\n1. Parte da una **cartella base** (es. `/var/www/html/pages`).\n2. Ci **appende** il nome che gli mandi (`note.txt`).\n3. Apre il file risultante (`/var/www/html/pages/note.txt`) e lo restituisce.\n\nÈ un pattern normalissimo, presente in migliaia di applicazioni: pagine dinamiche, download di allegati, viewer di documenti. **Non è vulnerabile di per sé**: diventa pericoloso quando l'input dell'utente può alterare la parte «cartella» del percorso, non solo la parte «nome file».\n\nApri due file diversi qui sotto per prendere confidenza col meccanismo prima di provare ad attaccare il nostro target.",
      hint: "Cambia file=note.txt in file=faq.txt, poi in file=press.txt.",
      explanation:
        "Il server compone un percorso concatenando la sua base con il tuo input. Se non controlla che il risultato resti dentro la base, l'input decide dove va a leggere.",
      Simulation: Task01Basics,
    },
    {
      id: "02-dotdot",
      title: "Salire di cartella con ../",
      goal: "Il primo path traversal",
      brief:
        "Aggiungi ../ prima del nome del file per uscire dalla cartella /pages e raggiungere index.html della webroot.",
      details:
        "Nel filesystem, `..` significa **«la cartella genitore»**. È un meccanismo standard di ogni sistema operativo: quando il resolver incontra `..`, torna indietro di un livello.\n\nMeccanismo dell'attacco:\n\n- Base del server: `/var/www/html/pages/`\n- Tu passi: `../index.html`\n- Percorso finale: `/var/www/html/index.html`\n\nSei uscito dalla cartella prevista senza fare nulla di magico. È il caso più semplice, ed è anche il più comune nei bug trovati in produzione.",
      hint: "?file=../index.html",
      explanation:
        "«..» è interpretato dal filesystem stesso: se il server non normalizza e verifica il percorso finale, non c'è modo di sapere in anticipo dove finirà la lettura.",
      Simulation: Task02DotDot,
    },
    {
      id: "03-etc-passwd",
      title: "Leggere /etc/passwd",
      goal: "Uscire fino alla radice del sistema",
      brief:
        "Concatena più ../ per risalire fino a / e leggere /etc/passwd, il file di sistema classico su Linux.",
      details:
        "Ogni `../` risale di un livello. Da `/var/www/html/pages` servono **quattro** `../` per arrivare a `/`.\n\nAlcuni dettagli utili:\n\n- Puoi anche esagerare con `../../../../../../../etc/passwd`: risalire oltre la radice **non produce errore**, la `/` è il limite.\n- `/etc/passwd` **non contiene password** (quelle sono in `/etc/shadow`, leggibile solo da root).\n- Elenca però utenti, uid, home directory e shell.\n\nIn un pentest è la prova che il traversal funziona: se leggi `/etc/passwd`, il server sta leggendo file arbitrari e il perimetro è saltato.",
      hint: "?file=../../../../etc/passwd",
      explanation:
        "Quando l'attaccante può leggere file di sistema, il perimetro applicativo è saltato: il prossimo passo è cercare chiavi, token e configurazioni per scalare l'attacco.",
      Simulation: Task03Etc,
    },
    {
      id: "04-windows",
      title: "Path traversal su Windows/IIS",
      goal: "Backslash, drive letter, win.ini",
      brief:
        "Su un server Windows i separatori sono \\ e i percorsi partono da C:\\. Leggi C:\\Windows\\win.ini.",
      details:
        "IIS su Windows serve i file da `C:\\inetpub\\wwwroot`. La logica è identica a Linux: **base + input dell'utente**. Cambiano solo alcuni dettagli:\n\n- Separatori: sia `\\` sia `/` vengono accettati.\n- Target di prova classici:\n  - `win.ini` (equivalente a `/etc/passwd` come marker storico)\n  - `boot.ini` sui sistemi vecchi\n  - `C:\\Windows\\System32\\drivers\\etc\\hosts` per la mappa di rete\n\nQuesto è anche il contesto in cui vive lo scenario successivo del modulo **Reverse Shell**: un server Windows/IIS che si fida troppo dell'input.",
      hint: "?file=../../../Windows/win.ini",
      explanation:
        "Il traversal è indipendente dal sistema operativo: cambiano i file di riferimento e i separatori, non il principio. Anche i drive letter (C:\\, D:\\) sono raggiungibili se il resolver del linguaggio li accetta come assoluti.",
      Simulation: Task04Windows,
    },
    {
      id: "05-encoding",
      title: "Bypass con URL-encoding",
      goal: "Aggirare un filtro approssimativo",
      brief:
        "Il server oggi filtra i \"..\" letterali. Codifica i caratteri in %2e%2e%2f per farli passare.",
      details:
        "La difesa naïve: «se nella stringa ci sono due punti attaccati, blocco». Funziona in modo molto limitato.\n\nIl problema è che la stringa che il **filtro** vede non è la stessa che il **file system** apre: prima del controllo, qualcosa (il framework web) decodifica i caratteri speciali dell'URL.\n\n- `%2e` diventa `.`\n- `%2f` diventa `/`\n\nSegui la richiesta passo passo:\n\n1. Tu scrivi: `?file=%2e%2e%2f` — nessun «..» visibile.\n2. Il filtro guarda la stringa codificata: non trova «..», lascia passare.\n3. Il decoder trasforma `%2e%2e%2f` in `../`.\n4. Il file system apre `../` — il traversal funziona lo stesso.\n\nRegola: **prima rendi canonica la stringa** (decodifica, normalizza), **poi** decidi se accettarla.",
      hint: "?file=%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      explanation:
        "L'ordine era sbagliato: il filtro guardava la stringa PRIMA che venisse decodificata, mentre il file system leggeva DOPO. La difesa vera è decodificare prima e controllare dopo, sulla forma finale del percorso.",
      Simulation: Task05UrlEncoding,
    },
    {
      id: "06-double-encoding",
      title: "Doppia codifica",
      goal: "Sfruttare due decoder in cascata",
      brief:
        "Il server ora decodifica una volta e poi filtra i \"..\". Codifica il payload due volte con %25.",
      details:
        "Dopo il fix, il filtro lavora bene: **prima** decodifica, **poi** cerca i «..». Con la singola codifica non passi più.\n\nMa la richiesta attraversa più componenti (proxy, framework, application server), e più di uno decodifica l'URL. Se il filtro sta **tra** due decodifiche, puoi codificare due volte.\n\nCome si scrive la doppia codifica: il simbolo `%` stesso si scrive `%25`. Quindi:\n\n- `.` → `%2e` → `%252e`\n- `/` → `%2f` → `%252f`\n\nSegui la richiesta passo passo:\n\n1. Tu scrivi: `?file=%252e%252e%252f`.\n2. Il primo decoder trasforma `%25` in `%`: diventa `%2e%2e%2f`.\n3. Il filtro controlla: non trova «..», lascia passare.\n4. Il secondo decoder trasforma `%2e%2e%2f` in `../`.\n5. Il file system apre `../` — traversal riuscito.\n\nMorale: **decodifica una sola volta, in un solo punto**, e controlla la forma finale del percorso.",
      hint: "?file=%252e%252e%252f%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd",
      explanation:
        "Doppia decodifica = due opportunità per iniettare caratteri speciali. La difesa non è più regex, è normalizzare il percorso e confrontare il risultato assoluto con la cartella consentita.",
      Simulation: Task06DoubleEncoding,
    },
    {
      id: "07-null-byte",
      title: "Bypass della whitelist di estensioni",
      goal: "Il trucco storico del null byte",
      brief:
        "Il server aggiunge .txt ai nomi dei file. Usa il carattere speciale %00 per fargli ignorare quello che viene dopo.",
      details:
        "La difesa: «ti faccio leggere solo file `.txt`. Se il nome non finisce con `.txt`, lo aggiungo io». Sembra solida.\n\nIl trucco storico (**null byte**):\n\n- Nelle vecchie versioni di PHP 5, Perl e ColdFusion, la parte che apre i file era scritta in **C**.\n- In C esiste il **null byte** (`\\0`, in URL `%00`) che significa: «qui finisce il testo, ignora il resto».\n\nSegui la richiesta passo passo:\n\n1. Tu scrivi: `?file=../../../etc/passwd%00`\n2. Il server controlla: la stringa finisce con `.txt`? No — ma tu allunghi il nome finto e passi il filtro.\n3. Il server aggiunge `.txt` → `passwd%00.txt`.\n4. All'apertura, `%00` dice «qui finisce il testo»: il nome diventa `passwd`.\n5. Il server legge `/etc/passwd`, senza `.txt`.\n\nNei linguaggi moderni (PHP 7+, Python, Java, Node) il null byte è bloccato a monte. Ma la lezione resta: quando due componenti interpretano la stessa stringa in modo diverso, si apre una falla.",
      hint: "?file=../../../../etc/passwd%00",
      explanation:
        "Il null byte è il carattere che dice «qui finisce il testo». La difesa vera non è aggiungere l'estensione e sperare: è controllare il percorso finale, dopo tutte le elaborazioni che subisce la stringa.",
      Simulation: Task07NullByte,
    },
    {
      id: "08-config",
      title: "Rubare le credenziali del database",
      goal: "Il vero jackpot di un traversal",
      brief:
        "Trova il file di configurazione dell'applicazione e leggi host, utente e password del database.",
      details:
        "Un attaccante non si accontenta di `/etc/passwd`: il vero obiettivo sono i **file di configurazione**, che contengono spesso credenziali in chiaro.\n\nCosa cercano:\n\n- `app.conf`, `.env`, `database.yml`, `web.config`\n- Cartelle tipiche: `/var/www/config`, `/etc/nomeapp`, `C:\\ProgramData\\NomeApp`\n\nCosa trovano dentro:\n\n- Host, utente e password del database\n- Chiavi API\n- Token cloud (AWS, GCP, Azure)\n\nCon queste credenziali l'attaccante si collega **direttamente** al database, bypassando tutta la logica applicativa (autorizzazioni, logging, rate limiting).\n\nDifesa migliore: **non tenere segreti in file leggibili dal processo web**. Meglio variabili d'ambiente, meglio ancora un secret manager (AWS Secrets Manager, HashiCorp Vault, Doppler).",
      hint: "Dalla cartella pages salgono due livelli e c'è la cartella config. ?file=../../config/app.conf",
      explanation:
        "Segreti in file di config leggibili dal processo web = un traversal si trasforma in compromissione totale. Sposta i segreti fuori dalla webroot e limita chi può leggerli con i permessi del filesystem.",
      Simulation: Task08Config,
    },
    {
      id: "09-api",
      title: "Path traversal in un'API JSON",
      goal: "Non solo URL: anche i body sono input",
      brief:
        "Un endpoint API riceve il nome del file dentro un JSON. Modifica quel campo per uscire dalla tua cartella e leggere una chiave SSH privata.",
      details:
        "Finora hai modificato l'URL. Ma un attaccante può cambiare **qualunque** dato che manda al server: body JSON, header, nome di un file caricato. Se quel dato finisce dentro l'apertura di un file, il problema è lo stesso.\n\nLo scenario del task:\n\n1. L'app salva i file di ogni utente in una sua cartella: `/var/www/html/uploads/user-42`.\n2. Tu mandi un JSON con il campo `filename`, es. `\"avatar.png\"`.\n3. Il server attacca il tuo `filename` alla tua cartella, senza controllare dove finisce.\n\nTi basta scrivere `../` abbastanza volte per tornare alla radice, poi il percorso del file che vuoi leggere (in questo caso una chiave SSH privata di un altro utente).\n\n**Come si evita:** il client non deve mai mandare un nome di file. Nel database ogni file ha un **id numerico**: il client manda solo quello, e il server calcola il percorso vero (che l'utente non vede né cambia).",
      hint: "Cambia filename in \"../../../../../home/acme/.ssh/id_rsa\".",
      explanation:
        "Trattare i file come identificatori opachi (id nel DB → path lato server) elimina la classe intera di bug. È un cambiamento di modello, non un patch.",
      Simulation: Task09Api,
    },
    {
      id: "10-quiz",
      title: "Quiz finale — 10 domande",
      goal: "Consolidare i concetti",
      brief:
        "Dieci domande per fissare i principi di path traversal e difesa. Rispondi correttamente a tutte per completare il modulo.",
      details:
        "Le domande ripercorrono il modulo:\n\n- Cos'è il traversal\n- Come si aggirano i filtri\n- Dove si nasconde oltre che negli URL\n- Quali difese sono davvero efficaci\n\nSe sbagli, torna al task corrispondente — si può riprovare senza problemi.",
      hint: "Pensa a: dove sta il decoder? Dove sta il filtro? Il segreto sta nel file o fuori?",
      explanation:
        "Tre regole d'oro: canonicalizza prima di validare, confina il processo (chroot, container, permessi), usa identificatori opachi invece dei nomi.",
      Simulation: Task10Quiz,
    },
  ],
};
