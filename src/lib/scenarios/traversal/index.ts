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
        "Un endpoint tipico è /read?file=note.txt. Il server prende la sua cartella (per esempio /var/www/html/pages) e ci appende «note.txt», ottenendo /var/www/html/pages/note.txt. Poi apre quel file e te ne restituisce il contenuto.\n\nQuesto è un pattern normalissimo, presente in migliaia di applicazioni: pagine dinamiche, download di allegati, viewer di documenti. Non è vulnerabile di per sé — diventa pericoloso quando l'input dell'utente può alterare la parte «cartella» del percorso, non solo la parte «nome file».\n\nApri due file diversi qui sotto per prendere confidenza col meccanismo prima di provare ad attaccare io nostro target",
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
        "IIS su Windows serve i file da C:\\inetpub\\wwwroot. La logica è identica: base + input dell'utente. Ma il sistema accetta sia \\ sia / come separatore, e i target «di prova» sono altri: win.ini (equivalente a /etc/passwd come marker storico), boot.ini nei sistemi vecchi, C:\\Windows\\System32\\drivers\\etc\\hosts per vedere la mappa di rete.\n\nQuesto è il contesto in cui vive anche lo scenario successivo del modulo Reverse Shell: un server Windows/IIS che si fida troppo dell'input.",
      hint: "?file=../../../Windows/win.ini",
      explanation:
        "Il traversal è indipendente dal sistema operativo: cambiano i file di riferimento e i separatori, non il principio. Anche i drive letter (C:\\, D:\\) sono raggiungibili se il resolver del linguaggio li accetta come assoluti.",
      Simulation: Task04Windows,
    },
    {
      id: "05-encoding",
      title: "Bypass con URL-encoding",
      goal: "Aggirare un filtro naïve",
      brief:
        "Il server oggi filtra i \"..\" letterali. Codifica i caratteri in %2e%2e%2f per farli passare.",
      details:
        "La prima difesa che uno sviluppatore prova quasi sempre è: «se nella stringa ci sono due punti attaccati, blocco». Funziona per cinque minuti. Il browser (o chiunque componga la richiesta HTTP) può codificare qualunque carattere: %2e è ., %2f è /. Quando la stringa arriva al server, il filtro non vede più «..», ma il decoder che sta dietro sì.\n\nQuesto è un esempio di una regola più generale: non validare mai una stringa nella sua forma di superficie. Prima canonicalizza (decodifica, normalizza, risolvi i simboli speciali), poi decidi se accettarla.",
      hint: "?file=%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      explanation:
        "Filtro e decoder erano in ordine sbagliato: il filtro guardava PRIMA della decodifica, il file system leggeva DOPO. Chi decodifica per ultimo vince.",
      Simulation: Task05UrlEncoding,
    },
    {
      id: "06-double-encoding",
      title: "Doppia codifica",
      goal: "Sfruttare due decoder in cascata",
      brief:
        "Il server ora decodifica una volta e poi filtra i \"..\". Codifica il payload due volte con %25.",
      details:
        "Molte applicazioni passano tra più componenti: reverse proxy, framework web, application server, libreria di file. Ognuno tende a decodificare l'URL. Se lo sviluppatore mette il filtro nel mezzo — dopo una decodifica ma prima dell'altra — un attaccante può codificare due volte il payload.\n\n%25 è il carattere %. Quindi %252e diventa %2e dopo il primo giro, e . dopo il secondo. Il filtro vede una stringa apparentemente pulita, mentre il file system riceve alla fine i ../ veri.\n\nMorale: canonicalizzazione una volta sola, in un solo posto, e poi controlla. Ogni decoder aggiunto è una nuova occasione per sbagliare.",
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
        "Il server appende .txt al nome del file. Usa il null byte %00 per fargli ignorare quello che segue.",
      details:
        "Una difesa comune è: «servo solo file .txt, se non finisce con .txt lo aggiungo io». Sembra ragionevole, ma in molti runtime del passato (PHP 5, ColdFusion, Perl) le API del file system erano scritte in C e trattavano \\0 come fine stringa. Risultato: il server vedeva «passwd\\0.txt» e passava alla lettura una stringa che veniva troncata a «passwd».\n\nLe versioni moderne di PHP, Python, Java, Node bloccano i null byte nelle chiamate filesystem, quindi il trucco specifico non funziona più quasi mai. Ma il pattern — un layer aggiunge, un altro tronca — si ripresenta continuamente in forme nuove (query string parsing diverso tra proxy e app, encoding Unicode ambigui, path separator diversi tra librerie).",
      hint: "?file=../../../../etc/passwd%00",
      explanation:
        "Due layer che interpretano la stessa stringa in modo diverso = una feritoia. Il null byte è il caso storico; la lezione è generale.",
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
