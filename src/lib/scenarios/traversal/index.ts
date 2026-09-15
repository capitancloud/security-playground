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
        "Un endpoint tipico è /read?file=note.txt. Il server prende la sua cartella (per esempio /var/www/html/pages) e ci appende «note.txt», ottenendo /var/www/html/pages/note.txt. Poi apre quel file e te ne restituisce il contenuto.\n\nQuesto è un pattern normalissimo, presente in migliaia di applicazioni: pagine dinamiche, download di allegati, viewer di documenti. Non è vulnerabile di per sé — diventa pericoloso quando l'input dell'utente può alterare la parte «cartella» del percorso, non solo la parte «nome file».\n\nApri due file diversi qui sotto per prendere confidenza col meccanismo prima di provare ad attaccare il nostro target",
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
        "Nel filesystem, «..» significa «la cartella genitore». È un meccanismo standard di ogni sistema operativo: quando il resolver incontra .., torna indietro di un livello.\n\nSe il server compone /var/www/html/pages/ + il tuo input, e tu passi ../index.html, il risultato finale è /var/www/html/index.html — sei uscito dalla cartella prevista senza fare nulla di magico.\n\nQuesto è il caso più semplice ed è anche il più comune nei bug che vengono trovati in produzione: molti sviluppatori si dimenticano proprio di questa possibilità.",
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
        "Ogni ../ risale di un livello. Da /var/www/html/pages servono quattro ../ per arrivare a /, dopodiché puoi navigare in qualsiasi cartella. Puoi anche esagerare (../../../../../../../../etc/passwd): risalire oltre la radice non produce errore, la radice è il limite.\n\n/etc/passwd non contiene password (quelle sono in /etc/shadow, leggibile solo da root), ma elenca utenti, uid, home directory e shell. In un pentest è la prova che il traversal funziona e che il server sta leggendo file arbitrari.",
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
        "IIS su Windows serve i file da C:\\inetpub\\wwwroot. La logica è identica: base + input dell'utente. Ma il sistema accetta sia \\ sia / come separatore, e i target «di prova» sono altri: win.ini (equivalente a /etc/passwd come marker storico), boot.ini nei sistemi vecchi, C:\\Windows\\System32\\drivers\\etc\\hosts per vedere la mappa di rete.\n\nQuesto è anche il contesto in cui vive anche lo scenario successivo del modulo Reverse Shell: un server Windows/IIS che si fida troppo dell'input.",
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
        "Immagina cosa fa lo sviluppatore per difendersi: guarda la stringa che arriva e controlla se contiene «..». Se c'è, blocca la richiesta. Sembra ragionevole.\n\nMa c'è un dettaglio che invalida tutto: la stringa che il filtro vede NON è la stessa che il file system apre. Prima del controllo, qualcosa (il framework web) decodifica i caratteri speciali dell'URL: %2e torna a essere . e %2f torna a essere /.\n\nSegui la richiesta passo passo:\n\n1. Tu scrivi: ?file=%2e%2e%2f — non c'è nessun «..» visibile.\n2. Il filtro guarda la stringa codificata: non trova «..», quindi lascia passare.\n3. Il decoder trasforma %2e%2e%2f in ../\n4. Il file system apre ../ — e il traversal funziona lo stesso.\n\nIl problema è l'ordine: il filtro controlla PRIMA della decodifica, ma il file legge DOPO. Chi decodifica per ultimo decide cosa arriva al file system.\n\nDa qui una regola importante per chi costruisce applicazioni: non controllare mai una stringa «così com'è». Prima la rendi canonica — la decodi, la normalizzi, risolvi i simboli speciali — e poi decidi se accettarla.",
      hint: "?file=%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      explanation:
        "L'ordine era sbagliato: il filtro guardava la stringa PRIMA che venisse decodificata, mentre il file system leggeva DOPO. Hai scritto %2e%2e%2f: il filtro non vedeva nessun «..» e passava, ma il decoder lo trasformava in ../ e il file veniva aperto lo stesso. La difesa vera è decodificare prima e controllare dopo, sulla forma finale del percorso.",
      Simulation: Task05UrlEncoding,
    },
    {
      id: "06-double-encoding",
      title: "Doppia codifica",
      goal: "Sfruttare due decoder in cascata",
      brief:
        "Il server ora decodifica una volta e poi filtra i \"..\". Codifica il payload due volte con %25.",
      details:
        "Dopo l'ultimo fix, il filtro ora lavora bene: prima decodifica la stringa, poi cerca i «..» letterali e li blocca. Con la singola codifica non puoi più entrare.\n\nIl punto debole è un altro: prima del filtro, la richiesta passa per più componenti (proxy, framework, application server), e più di uno decodifica l'URL. Se il filtro lavora tra una decodifica e l'altra, puoi codificare due volte il payload: il filtro guarda la stringa dopo il primo giro e la trova pulita, mentre il secondo decoder, che arriva dopo, ricostruisce i «..» quando ormai nessuno controlla più.\n\nCome si scrive una doppia codifica? Ricorda che il simbolo % stesso si scrive %25. Quindi il punto codificato %2e diventa %252e, e lo slash %2f diventa %252f.\n\nSegui la richiesta passo passo:\n\n1. Tu scrivi: ?file=%252e%252e%252f — al filtro sembra solo testo senza senso.\n2. Il primo decoder trasforma %25 in %: la stringa diventa %2e%2e%2f. Ancora nessun «..» visibile.\n3. Il filtro controlla: non trova «..», quindi lascia passare.\n4. Il secondo decoder trasforma %2e%2e%2f in ../\n5. Il file system apre ../ — e il traversal funziona di nuovo.\n\nMorale: la difesa è decodificare una volta sola, in un solo punto, e controllare la forma finale del percorso. Ogni decoder in più è una nuova occasione per sbagliare.",
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
        "Il server dice: «ti faccio leggere solo file .txt. Se il nome non finisce con .txt, lo aggiungo io». Sembra una difesa solida.\n\nC'è però un trucco storico. Nelle vecchie versioni di PHP 5, Perl e ColdFusion, la parte del programma che apre i file era scritta in linguaggio C. In C esiste un carattere speciale, il null byte (si scrive \\0), che significa «qui finisce il testo»: tutto ciò che viene dopo viene ignorato.\n\nSegui la richiesta passo passo:\n\n1. Tu scrivi: ?file=../../../etc/passwd%00\n2. Il server controlla: la stringa finisce con .txt, quindi la lascia passare.\n3. Il server aggiunge .txt: il nome diventa passwd%00.txt.\n4. Quando il file viene aperto, il null byte (%00) dice «qui finisce il testo»: il nome diventa solo passwd.\n5. Il server legge /etc/passwd, senza .txt.\n\nAttenzione: nei linguaggi moderni (PHP 7+, Python, Java, Node) questo trucco non funziona più, perché bloccano il null byte a monte. Ma la lezione resta valida: quando due componenti interpretano la stessa stringa in modo diverso, si apre una falla. E questo capita ancora oggi.",
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
        "Un attaccante non si accontenta di /etc/passwd: il vero obiettivo è compromettere l'applicazione. I file di configurazione (app.conf, .env, database.yml, web.config) contengono spesso credenziali in chiaro: DB, chiavi API, token cloud.\n\nLa cartella tipica è /var/www/config, /etc/nomeapp, C:\\ProgramData\\NomeApp. Con host, utente e password del DB, l'attaccante si collega direttamente al database bypassando tutta la logica applicativa (autorizzazioni, logging, rate limiting) e può esportare o modificare l'intero contenuto.\n\nPer questo la difesa migliore non è solo bloccare il traversal: è non tenere segreti in file leggibili dall'utente che esegue il web server. Meglio variabili d'ambiente, meglio ancora un secret manager (AWS Secrets Manager, HashiCorp Vault, Doppler).",
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
        "Un endpoint POST accetta un JSON con { filename }. Modifica il campo per uscire dalla tua cartella e leggere una chiave SSH privata.",
      details:
        "Il path traversal non abita solo negli URL. Ogni dato che l'utente può controllare — body JSON, header HTTP, nome di un file caricato, valore di un cookie — se finisce in una chiamata al filesystem è a rischio. Le API sono un bersaglio ideale perché spesso non hanno una UI che «filtra» quello che l'utente digita.\n\nIn questo scenario ogni utente ha una cartella (/var/www/html/uploads/user-42). L'endpoint compone quella cartella con il filename ricevuto nel body. Se non normalizza, puoi uscire dalla tua cartella e leggere qualunque file che il processo web ha il permesso di aprire — comprese le chiavi SSH di altri utenti se i permessi non sono ristretti.\n\nSoluzione robusta a livello di design: non passare mai nomi di file dal client. Assegna un id nel database (files.id), e sul server lookup l'id e ottieni il percorso reale — che l'utente non vede né tocca.",
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
        "Le domande ripercorrono il modulo: cos'è il traversal, come si aggirano i filtri, dove si nasconde oltre che negli URL, e le difese davvero efficaci. Se sbagli, torna al task corrispondente — non c'è penalità nel riprovare.",
      hint: "Pensa a: dove sta il decoder? Dove sta il filtro? Il segreto sta nel file o fuori?",
      explanation:
        "Tre regole d'oro: canonicalizza prima di validare, confina il processo (chroot, container, permessi), usa identificatori opachi invece dei nomi.",
      Simulation: Task10Quiz,
    },
  ],
};
