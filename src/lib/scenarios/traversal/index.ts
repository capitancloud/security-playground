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
        "Prima di parlare di attacco, vediamo come funziona la lettura di un file lato server. È un meccanismo semplicissimo, ma è quello su cui poggia **tutta** la vulnerabilità di Directory Traversal.\n\nUn endpoint tipico è `/read?file=note.txt`. Quando il server lo riceve fa tre cose in sequenza:\n\n1. Parte da una **cartella base**, decisa da chi ha scritto il codice (es. `/var/www/html/pages`).\n2. Ci **appende** il nome che gli mandi (`note.txt`) usando qualcosa come `open(base + '/' + filename)`.\n3. Apre il file risultante (`/var/www/html/pages/note.txt`) e ne restituisce il contenuto nella risposta HTTP.\n\nÈ un pattern normalissimo, presente in **migliaia di applicazioni**:\n\n- Pagine dinamiche di help/documentazione (`?page=intro`)\n- Download di allegati (`?attachment=42`)\n- Viewer di documenti (`?file=contratto.pdf`)\n- Sistemi di template (`?template=welcome`)\n\n**Non è vulnerabile di per sé**: diventa pericoloso solo quando l'input dell'utente può alterare la parte «cartella» del percorso, non solo la parte «nome file». Se `filename` può contenere caratteri come `..` o `/`, la stringa che il server passa a `open()` può puntare **ovunque nel filesystem**.\n\nNel task, apri due file diversi (`note.txt`, `faq.txt`, `press.txt`) per prendere confidenza col meccanismo. Osserva:\n\n- Cosa cambia nell'URL\n- Come cambia il percorso finale che il server compone\n- Che il file letto è sempre dentro la stessa cartella\n\nNei prossimi task romperemo esattamente questa assunzione — che il file resti «dentro la cartella».",
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
        "Nel filesystem, `..` significa **«la cartella genitore»**. È un meccanismo standard di ogni sistema operativo (Linux, macOS, Windows, Unix in generale): quando il resolver del path incontra `..`, torna indietro di un livello. È lo stesso concetto del comando `cd ..` in un terminale.\n\nMeccanismo dell'attacco:\n\n- Base del server: `/var/www/html/pages/`\n- Tu passi: `../index.html`\n- Percorso finale: `/var/www/html/pages/../index.html`\n- Il sistema operativo lo **rende canonico**: `/var/www/html/index.html`\n- Il server apre e ti restituisce quel file, che sta **fuori** dalla cartella prevista.\n\nSei uscito dalla cartella prevista senza fare nulla di magico: hai solo sfruttato un simbolo che il filesystem interpreta da sempre allo stesso modo. È il caso più semplice possibile di Directory Traversal, ed è anche **il più comune** nei bug trovati in produzione — molte librerie ancora oggi non normalizzano il percorso prima di aprirlo.\n\nAlcuni dettagli importanti:\n\n- Puoi mettere `..` **più volte** in cascata: `../../` sale di due livelli, `../../../` di tre, e così via.\n- Puoi mescolare `..` a nomi di cartelle reali: `../images/../secret.txt` funziona uguale.\n- Il fatto che tu «esca» non produce nessun errore visibile: il server fa quello che gli hai chiesto, semplicemente perché nessuno gli ha detto di verificare *dove* stia leggendo.\n\nLa difesa non è filtrare i `..` (vedremo perché nei prossimi task): è **rendere canonico** il percorso e poi verificare che inizi ancora con la cartella base autorizzata.",
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
        "Ora spingiamo il traversal fino alla **radice del filesystem**. Ogni `../` risale di un livello: da `/var/www/html/pages` servono **quattro** `../` per arrivare a `/`, la root del sistema.\n\nAlcuni dettagli tecnici utili da conoscere:\n\n- Puoi anche **esagerare** con `../../../../../../../etc/passwd`: risalire oltre la radice **non produce errore**, `/` è il limite superiore e il resolver semplicemente si ferma lì. In un pentest reale è la tecnica standard: metti tanti `../` da coprire qualsiasi profondità possibile.\n- `/etc/passwd` **non contiene password** (dispetto del nome). Le password vere sono in `/etc/shadow`, leggibile solo da root e — se il processo web gira con privilegi limitati — non accessibile via traversal.\n- Cosa contiene invece `/etc/passwd`: elenco di **utenti del sistema**, con `uid`, `gid`, home directory, shell. Esempio: `root:x:0:0:root:/root:/bin/bash`.\n\nA cosa serve concretamente ad un attaccante:\n\n- **Prova di concetto**: leggere `/etc/passwd` dimostra oltre ogni dubbio che il traversal funziona. È il target di reference in ogni report di pentest.\n- **Ricognizione**: sapendo che utenti esistono, sai dove cercare le cose. `www-data` → cartella `/var/www`. `deploy` → probabilmente sviluppatore, home con codice sorgente. `postgres` → database sulla macchina.\n- **Prossimi passi**: `/root/.ssh/id_rsa`, `/home/*/.bash_history`, `/proc/self/environ` (variabili d'ambiente del processo, spesso con segreti).\n\nSe leggi `/etc/passwd`, il **perimetro applicativo è saltato**: il server sta leggendo file arbitrari sotto l'account con cui gira, e il prossimo passo è cercare chiavi, token e configurazioni per scalare l'attacco.",
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
        "Il Directory Traversal **non è una vulnerabilità di Linux**: colpisce ogni sistema operativo, perché il concetto di «cartella genitore» esiste ovunque. Su Windows cambiano solo alcuni dettagli di forma.\n\nContesto tipico: **IIS** (Internet Information Services) serve i file da `C:\\inetpub\\wwwroot`. La logica è identica a Linux — **base + input dell'utente** — con queste differenze:\n\n- **Separatori**: Windows storicamente usa `\\`, ma la maggior parte delle API di sistema accetta anche `/`. Nei payload di traversal spesso funzionano entrambi, a seconda di come il framework normalizza la stringa.\n- **Drive letter**: i percorsi partono da una lettera (`C:\\`, `D:\\`, `E:\\`) invece che da `/`. Se il resolver del linguaggio le accetta come assolute, un input tipo `C:\\Windows\\win.ini` può bypassare completamente la cartella base — non serve nemmeno risalire.\n- **File case-insensitive**: `Windows`, `windows`, `WINDOWS` sono lo stesso path. Utile per aggirare filtri che cercano solo la forma esatta.\n\nTarget di prova classici su Windows:\n\n- `C:\\Windows\\win.ini` — equivalente storico di `/etc/passwd` come marker. Esiste sempre, è leggibile da tutti, ideale come proof of concept.\n- `C:\\boot.ini` — sui sistemi vecchi (pre-Vista) rivela la configurazione del boot loader.\n- `C:\\Windows\\System32\\drivers\\etc\\hosts` — mappa DNS locale, spesso rivela nomi di server interni.\n- `C:\\inetpub\\logs\\LogFiles\\...` — log di IIS, che possono contenere dati sensibili di altri utenti.\n- `C:\\inetpub\\wwwroot\\web.config` — configurazione dell'applicazione, spesso con connection string in chiaro.\n\nQuesto è anche il contesto in cui vive lo scenario successivo del modulo **Reverse Shell**: un server Windows/IIS che si fida troppo dell'input. Se un traversal ti permette di leggere `web.config`, hai le credenziali del database. Se ti permette anche di scrivere, sei un passo dalla reverse shell.",
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
        "A questo punto lo sviluppatore si è accorto del problema e ha messo una difesa: **«se nella stringa ci sono due punti attaccati (`..`), blocco la richiesta»**. Sembra ragionevole, ma funziona in modo molto limitato — ed è un errore ricorrente.\n\nIl problema è che la stringa che il **filtro** vede non è la stessa che il **filesystem** apre: nel mezzo c'è un **decoder** che trasforma i caratteri speciali dell'URL nella loro forma reale.\n\n- `%2e` diventa `.`\n- `%2f` diventa `/`\n- `%20` diventa spazio\n\nSe il filtro guarda la stringa **prima** del decoder, e il filesystem la vede **dopo**, l'attaccante può codificare tutto ciò che il filtro cerca e passare invisibile.\n\nSegui la richiesta passo passo:\n\n1. Tu scrivi: `?file=%2e%2e%2f` — nel testo grezzo dell'URL **non c'è nessun `..`**.\n2. Il filtro guarda la stringa codificata: cerca `..`, non lo trova, lascia passare.\n3. Il framework decodifica: `%2e%2e%2f` → `../`.\n4. Il filesystem apre `../` — il traversal funziona lo stesso.\n\nÈ una vulnerabilità di **ordine delle operazioni**: giusti singoli passaggi, sbagliato l'ordine. La lezione vale in molti altri contesti (SQL injection, XSS, command injection): sanitizzare la forma sbagliata non serve a nulla.\n\nVarianti che si trovano nei payload reali:\n\n- Uppercase: `%2E%2E%2F` (alcuni filtri fanno match solo su minuscolo)\n- Mix codificato/letterale: `..%2f`, `%2e./`\n- Unicode overlong (vecchie versioni di IIS): `%c0%ae` per `.`\n\nRegola: **prima rendi canonica la stringa** (decodifica completa, normalizza separatori, risolvi i `..`), **poi** decidi se accettarla. E soprattutto, non decidere basandoti sulla stringa: decidi basandoti sul **percorso finale assoluto** che il filesystem restituisce.",
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
        "Dopo il fix del task precedente, il filtro ora lavora bene: **prima** decodifica una volta, **poi** cerca i `..`. Con la singola codifica non passi più. Se `%2e%2e%2f` viene decodificato in `../` **prima** del controllo, il filtro lo blocca correttamente.\n\nMa nel mondo reale le richieste HTTP attraversano **molti componenti**: un load balancer, un reverse proxy (nginx, Apache), un framework web (Express, Django, Spring), un application server. **Più di uno di questi decodifica l'URL**. Se il filtro sta **tra** due decodifiche, puoi codificare due volte e aggirarlo.\n\nCome si scrive la doppia codifica: il simbolo `%` stesso si scrive `%25` in URL encoding. Quindi:\n\n- `.` → `%2e` → `%252e` (dove `%25` è `%` e `2e` resta letterale)\n- `/` → `%2f` → `%252f`\n\nSegui la richiesta passo passo:\n\n1. Tu scrivi: `?file=%252e%252e%252f`.\n2. Il **primo** decoder (es. il reverse proxy) trasforma `%25` in `%`: la stringa diventa `%2e%2e%2f`.\n3. Il filtro controlla: cerca `..` — non c'è, c'è solo `%2e%2e%2f`. Lascia passare.\n4. Il **secondo** decoder (es. il framework) trasforma `%2e%2e%2f` in `../`.\n5. Il filesystem apre `../` — **traversal riuscito**, difesa aggirata.\n\nQuesta tecnica ha reso storiche alcune CVE (CVE-2001-0333 su IIS, ripresa poi in Apache Tomcat, e in molte reincarnazioni recenti). Il pattern si ripete perché la causa è architetturale: pipeline di elaborazione lunga con più decoder.\n\nSi possono usare anche **tripla codifica** o **codifiche miste** (parte in encoding standard, parte in overlong UTF-8) quando ci sono più di due decoder in cascata.\n\nMorale, e questa vale come principio generale: **decodifica una sola volta, in un solo punto della pipeline**, e controlla la **forma finale del percorso** (quella che il filesystem effettivamente aprirà), non la stringa che ti è arrivata.",
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
        "Nuova difesa, più intelligente delle precedenti: **«ti faccio leggere solo file con estensione `.txt`. Se il nome che mi mandi non finisce con `.txt`, gliela aggiungo io»**. In pratica il server fa `filename + '.txt'` prima di aprire, così pensa di aver ristretto l'attacco a soli file di testo. Sembra solido.\n\nIl trucco storico che lo aggira si chiama **null byte injection**:\n\n- Nelle vecchie versioni di **PHP 5**, **Perl** e **ColdFusion**, la funzione che apriva effettivamente il file era scritta in **C**.\n- Nel linguaggio C esiste il concetto di **null byte** (`\\0`, in URL encoding `%00`), che significa: **«qui finisce la stringa, ignora tutto il resto»**.\n- Le due «viste» sulla stringa sono diverse: PHP la vede come `passwd\\0.txt` (una stringa lunga 12 caratteri), C la vede come `passwd` (perché si ferma al primo `\\0`).\n\nSegui la richiesta passo passo:\n\n1. Tu scrivi: `?file=../../../etc/passwd%00`.\n2. Il server aggiunge `.txt`: la stringa diventa `../../../etc/passwd\\0.txt`.\n3. Il server controlla: **finisce con `.txt`**? Sì (dal punto di vista di PHP che conta i caratteri).\n4. Il server passa la stringa a `fopen()` (o equivalente), scritto in C.\n5. C vede il `\\0`: interpreta il nome come `../../../etc/passwd`, ignora `.txt`.\n6. Viene letto `/etc/passwd`, senza `.txt`.\n\nSituazione oggi:\n\n- **PHP 5.4+, Python, Java, Node.js moderni** — bloccano il null byte a monte, di solito lanciando un'eccezione. Il trucco puro non funziona più.\n- Ma la **classe di vulnerabilità** — «due componenti interpretano la stessa stringa in modo diverso» — è viva e vegeta. Varianti moderne includono:\n  - **Path terminator diversi**: alcuni filesystem trattano `.` finali in modo speciale su Windows (`file.txt.` diventa `file.txt`).\n  - **Unicode normalization**: caratteri visualmente identici ma binariamente diversi che superano i controlli e poi vengono normalizzati dal filesystem.\n  - **Trailing slash**: `/etc/passwd/` vs `/etc/passwd` gestiti diversamente da diverse librerie.\n\nLa difesa vera non è mai «aggiungo l'estensione e spero»: è **controllare il percorso finale assoluto**, dopo tutte le elaborazioni che subisce la stringa, e confrontarlo con la cartella consentita.",
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
        "Un attaccante non si accontenta di `/etc/passwd`: quello è la prova che il bug funziona, ma non è il vero obiettivo. Il **jackpot** sono i **file di configurazione dell'applicazione**, che contengono spessissimo credenziali in chiaro.\n\nDove cercano gli attaccanti (e dove **non** dovrebbero stare mai i tuoi segreti):\n\n- File tipici: `app.conf`, `.env`, `database.yml`, `web.config`, `settings.py`, `application.properties`, `config.php`.\n- Cartelle tipiche: la stessa cartella dell'applicazione, `../config/`, `/etc/nomeapp/`, `C:\\ProgramData\\NomeApp\\`, `/opt/nomeapp/`.\n- File di backup dimenticati: `config.php.bak`, `database.yml.old`, `.env.save`.\n- Repository Git accidentalmente esposti: `.git/config`, `.git/HEAD` → poi ricostruzione dell'intero storico con strumenti come **git-dumper**.\n\nCosa trovano dentro:\n\n- **Host, utente e password del database** — pronti all'uso\n- **Chiavi API** verso servizi terzi (Stripe, SendGrid, Twilio)\n- **Token cloud** (AWS access key, GCP service account, Azure connection string) → controllo dell'infrastruttura, non solo di un server\n- **JWT secret** dell'applicazione → possono firmare token validi per qualunque utente\n- **Chiavi di crittografia** per cookie di sessione, dati at-rest\n\nCosa succede dopo:\n\nCon queste credenziali l'attaccante si collega **direttamente al database**, bypassando tutta la logica applicativa (autorizzazioni, logging, rate limiting). Da lì:\n\n- Dump completo di tutte le tabelle\n- Modifica di ruoli utente (`UPDATE users SET is_admin = true WHERE ...`)\n- Cancellazione delle tracce nei log\n- Inserimento di backdoor persistenti\n\nLa difesa migliore è **non tenere segreti in file leggibili dal processo web**:\n\n- **Variabili d'ambiente** (`process.env.DB_PASSWORD`) — non finiscono in file leggibili\n- **Secret manager** dedicati: AWS Secrets Manager, HashiCorp Vault, Doppler, Google Secret Manager\n- **File con permessi restrittivi** letti solo all'avvio (poi il processo lascia cadere i privilegi)\n- **Segreti diversi per ambiente** — se leaka la staging, la produzione resta protetta",
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
        "Finora hai modificato l'URL. Ma un attaccante può cambiare **qualunque** dato che manda al server, non solo la barra degli indirizzi: **body JSON, header, nome di un file caricato, campi di un form multipart**. Se quel dato finisce, in qualunque punto del codice, dentro l'apertura di un file, il problema è esattamente lo stesso.\n\nLo scenario del task, molto comune nelle app SaaS moderne:\n\n1. L'app organizza i file di ogni utente in una sua cartella dedicata: `/var/www/html/uploads/user-42`. È una scelta di design ragionevole, isola i dati.\n2. Quando l'app deve leggere un file di quell'utente, riceve un JSON con il campo `filename`, ad esempio `{ \"filename\": \"avatar.png\" }`.\n3. Il server compone il percorso: `/var/www/html/uploads/user-42/` + `avatar.png` → `/var/www/html/uploads/user-42/avatar.png`.\n4. Se non controlla che il percorso finale resti dentro `user-42`, ti basta mandare `filename: \"../../../../home/acme/.ssh/id_rsa\"` per uscire dalla tua cartella, salire fino a `/`, e scendere fino alla **chiave SSH privata** di un altro utente della macchina.\n\nCon quella chiave l'attaccante entra in SSH direttamente come quell'utente, senza password.\n\nAltri contesti in cui lo stesso pattern ricorre:\n\n- **Import/export**: `POST /import { \"path\": \"...\" }` → traversal per leggere file arbitrari\n- **Template engine**: `POST /render { \"template\": \"welcome.html\" }` → traversal + a volte anche esecuzione di codice\n- **Log viewer**: `POST /logs { \"file\": \"app.log\" }` → lettura di qualunque file di log del server\n- **File upload che genera un nome**: se il server rispetta il `Content-Disposition: filename=\"...\"` senza sanitizzarlo, un attaccante può **scrivere** un file dove vuole (traversal in scrittura, ancora più pericoloso)\n\n**Come si evita, alla radice:** il client non dovrebbe mai mandare un nome di file. Nel database ogni file ha un **id opaco** (numerico o UUID): il client manda solo quello, e il server calcola internamente il percorso vero. In questo modo:\n\n- L'utente non conosce nomi di file → non può proporre traversal\n- Il server sa esattamente dove sta ogni file → può verificare la proprietà con una query\n- Anche se qualcuno cambia l'id (IDOR), non può inventare percorsi arbitrari\n\nÈ un cambiamento di **modello dati**, non una patch: elimina l'intera classe di bug invece di tapparne le singole manifestazioni.",
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
        "Ultimo passo: dieci domande che ripercorrono l'intero modulo, dal semplice `../` fino ai bypass più sofisticati e alle difese vere.\n\nLe domande coprono quattro aree:\n\n- **Cos'è il traversal** — la meccanica di base: cartella base + input non controllato → percorso finale arbitrario.\n- **Come si aggirano i filtri** — URL encoding, doppia codifica, null byte, mix di tecniche. Ognuna sfrutta una diversa ipotesi sbagliata del difensore.\n- **Dove si nasconde oltre che negli URL** — body JSON, header, campi di form, nomi di file in upload. Ogni input che finisce in un'apertura di file può essere il vettore.\n- **Quali difese sono davvero efficaci** — canonicalizzare prima di validare, confinare il processo (chroot, container, permessi filesystem), usare identificatori opachi al posto dei nomi.\n\nCome affrontare il quiz:\n\n- Rispondi prima **senza rileggere le slide**: se il modulo ha funzionato, le risposte vengono naturali.\n- Se sbagli, torna al task corrispondente e rileggi la spiegazione: molte cose hanno più senso dopo aver visto il bug in azione.\n- Si completa solo con **10/10**, ma puoi riprovare quante volte vuoi.\n\nAl termine avrai il vocabolario e i pattern per riconoscere un Directory Traversal in una code review o in un pentest, e per proporre difese che funzionano davvero — non solo quelle che «sembrano» funzionare.",
      hint: "Pensa a: dove sta il decoder? Dove sta il filtro? Il segreto sta nel file o fuori?",
      explanation:
        "Tre regole d'oro: canonicalizza prima di validare, confina il processo (chroot, container, permessi), usa identificatori opachi invece dei nomi.",
      Simulation: Task10Quiz,
    },
  ],
};
