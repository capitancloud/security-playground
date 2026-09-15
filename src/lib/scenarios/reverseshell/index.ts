import type { Scenario } from "../types";
import Task01Recon from "./tasks/Task01Recon";
import Task02Fingerprint from "./tasks/Task02Fingerprint";
import Task03Webshell from "./tasks/Task03Webshell";
import Task04WebshellLive from "./tasks/Task04WebshellLive";
import Task05Listener from "./tasks/Task05Listener";
import Task06Payload from "./tasks/Task06Payload";
import Task07Trigger from "./tasks/Task07Trigger";
import Task08Interact from "./tasks/Task08Interact";
import Task09Defense from "./tasks/Task09Defense";
import Task10Quiz from "./tasks/Task10Quiz";
import { reverseShellSlides } from "./slides";

export const reverseShellScenario: Scenario = {
  id: "reverse-shell",
  slug: "reverse-shell",
  title: "Reverse Shell su IIS",
  subtitle: "Da un upload dimenticato a una shell interattiva su Windows Server",
  intro:
    "Un web server Microsoft IIS con un endpoint di upload mal configurato è uno dei percorsi più classici verso una compromissione totale. In questo modulo si ripercorre l'intera catena: ricognizione, scoperta dell'upload, webshell ASPX, allestimento del listener, generazione del payload PowerShell, trigger e shell interattiva. Ogni passaggio è simulato dentro il browser — nessun vero server, nessun vero attacco — ma i flussi, i comandi e gli errori sono quelli reali.",
  slides: reverseShellSlides,
  difficulty: "Intermedio",
  status: "available",
  tasks: [
    {
      id: "01-recon",
      title: "Ricognizione: cosa espone il target",
      goal: "Scoprire che tipo di server abbiamo davanti",
      brief:
        "Prima di attaccare qualsiasi cosa dobbiamo sapere con chi abbiamo a che fare: che sistema operativo gira sul server, quali porte sono aperte e quali servizi rispondono. Questo primo passo si chiama ricognizione e non è opzionale: senza queste informazioni non possiamo nemmeno scegliere il tipo di attacco.",
      details:
        "Immagina di essere davanti a una porta chiusa: prima di forzarla vuoi sapere di che materiale è, che serratura ha, se dietro c'è un cane.\n\nNella sicurezza informatica facciamo la stessa cosa con **nmap**. Il comando `nmap -sV 10.10.24.17` chiede al server: «quali porte hai aperte, e che programma risponde su ognuna?».\n\nDalla risposta capiamo tantissimo:\n\n- Porta 80 (HTTP) → **Microsoft-IIS/10.0**\n- Sistema operativo → **Windows Server 2019**\n\nDa queste due righe deriva tutta la strategia:\n\n- Web server IIS → possiamo caricare pagine `.aspx` che IIS eseguirà.\n- Windows → il linguaggio di scripting nativo è **PowerShell**.\n\nSe avessimo trovato Apache su Linux, l'intera catena dei prossimi task non funzionerebbe.",
      hint: "L'IP del target in palestra è 10.10.24.17.",
      explanation:
        "Il risultato di nmap ci dice due cose fondamentali: (1) il web server è Microsoft-IIS/10.0 → possiamo caricare pagine .aspx che IIS eseguirà, (2) il sistema operativo è Windows Server 2019 → il linguaggio di scripting nativo è PowerShell. Queste due informazioni guideranno ogni scelta successiva: che tipo di file caricare, che tipo di payload generare, quali comandi provare sul server.",
      Simulation: Task01Recon,
    },
    {
      id: "02-fingerprint",
      title: "Mappatura dell'app web",
      goal: "Trovare dove si caricano i file e dove finiscono",
      brief:
        "Ora che sappiamo che è un IIS su Windows, dobbiamo capire com'è fatto il sito. In particolare cerchiamo due cose molto specifiche: una pagina dove è possibile caricare un file, e una cartella pubblica dove quei file finiscono dopo il caricamento. Se troviamo entrambe, siamo a metà dell'opera.",
      details:
        "La catena della reverse shell si regge su **tre anelli**:\n\n1. Qualcuno mi lascia **caricare** un file.\n2. Posso **raggiungerlo** da un URL nel browser.\n3. Il server **esegue** quel file invece di mostrarlo.\n\nIn questo task ci concentriamo sui primi due anelli. Si scoprono semplicemente navigando il sito e leggendo gli header HTTP.\n\nCosa provi:\n\n- Visita la home per orientarti.\n- Prova indirizzi comuni: `/upload` (la pagina dove si caricano i file) e `/uploads/` (la cartella dove finiscono).\n- Leggi gli header HTTP: confermano versione di **IIS** e **ASP.NET**.\n\nIl terzo anello — «i file caricati vengono davvero eseguiti?» — lo verificheremo nel task 4.",
      hint: "Prova gli indirizzi /upload e /uploads/.",
      explanation:
        "Questa combinazione — un endpoint che accetta file + una cartella pubblica dove finiscono + esecuzione degli script in quella cartella — è la classe di vulnerabilità OWASP A04 «unrestricted file upload». Basta rompere uno solo dei tre anelli per neutralizzare l'intero attacco: per esempio salvare i file in una cartella dove IIS non esegue codice.",
      Simulation: Task02Fingerprint,
    },
    {
      id: "03-webshell",
      title: "Anatomia di una webshell ASPX",
      goal: "Capire come poche righe di codice diventano un canale di comando",
      brief:
        "Prima di scrivere qualsiasi payload, guardiamo com'è fatta la webshell più semplice possibile: un file .aspx di pochissime righe che riceve un comando dall'URL, lo esegue sul server e ci restituisce il risultato nella pagina.",
      details:
        "Una **webshell** è una pagina web che, invece di mostrarti un contenuto, ti fa eseguire comandi sul server. Il meccanismo è disarmante:\n\n1. La pagina legge un parametro dall'URL (es. `?cmd=whoami`).\n2. Passa quel testo al sistema operativo.\n3. Cattura l'output.\n4. Lo scrive nel corpo della risposta HTTP.\n\nÈ come un terminale locale, ma trasformato in una pagina web accessibile da chiunque conosca l'URL.\n\nIn ASP.NET bastano davvero poche righe:\n\n- Direttiva `<%@ Page Language=\"C#\" %>` in cima al file\n- Lettura di `Request[\"cmd\"]`\n- Avvio di `cmd.exe /c` con quel valore\n- Scrittura del risultato con `Response.Write`\n\nNon è ancora una reverse shell (arriverà nel task 6), ma è il mattone di partenza: chi carica un file del genere in una cartella eseguita da IIS ha di fatto un terminale remoto.",
      hint: "Concentrati su tre elementi: la direttiva di pagina, la lettura di ?cmd, la scrittura dell'output.",
      explanation:
        "In ASP.NET la sola presenza di `<%@ Page Language=\"C#\" %>` in un file `.aspx` è sufficiente perché IIS lo compili al volo e ne esegua il codice. È per questo che bastano davvero poche righe: non serve installare nulla, non serve compilare in anticipo, il server fa tutto da solo appena tu apri la pagina.",
      Simulation: Task03Webshell,
    },
    {
      id: "04-webshell-live",
      title: "Webshell in azione",
      goal: "Caricare cmd.aspx ed eseguire comandi dal browser",
      brief:
        "Adesso mettiamo in pratica ciò che abbiamo appena visto: carichiamo la webshell sul server, la apriamo nel browser e usiamo il suo form per lanciare qualche comando. Ogni comando che scriviamo diventa una singola richiesta HTTP; ogni risposta contiene ciò che il server ha stampato.",
      details:
        "In questa simulazione l'endpoint `/upload` accetta **qualsiasi estensione** — comprese le pagine `.aspx` — e le salva in `/uploads/`, che è una cartella dove IIS **esegue** gli script. È la vulnerabilità più elementare che esista, eppure si trova ancora spessissimo in produzione.\n\nComandi di ricognizione base da provare:\n\n- `whoami` — con che utente sta girando IIS\n- `hostname` — nome della macchina\n- `ipconfig` — configurazione di rete\n- `dir c:\\inetpub\\wwwroot\\uploads` — file nella cartella di atterraggio\n\nUn dettaglio importante: **ogni comando è una richiesta HTTP** visibile nei log del server (`access.log`). Un difensore attento vedrebbe subito qualcosa di strano. Ma per adesso l'attacco funziona.",
      hint: "Comandi utili: whoami, hostname, ipconfig, dir c:\\inetpub\\wwwroot\\uploads.",
      explanation:
        "L'output di `whoami` mostra qualcosa come `iis apppool\\defaultapppool`: non sei né Administrator né SYSTEM, sei l'utente limitato con cui gira IIS. Puoi comunque fare parecchio (leggere `web.config`, esplorare la webroot, guardare la configurazione), ma non hai un vero terminale interattivo. Per quello serve il salto di qualità dei prossimi task: la reverse shell.",
      Simulation: Task04WebshellLive,
    },
    {
      id: "05-listener",
      title: "Allestisci il listener",
      goal: "Aprire un programma in ascolto sul tuo computer",
      brief:
        "In una reverse shell è il server a chiamare noi, non noi a chiamare il server. Prima ancora di lanciare l'attacco dobbiamo quindi preparare qualcuno che ascolti sul nostro computer: un programma che resti in attesa e accetti la connessione che, tra poco, arriverà dal server compromesso.",
      details:
        "Lo strumento standard si chiama **netcat** (`nc`), definito come il coltellino svizzero della rete.\n\nIl comando che useremo è `nc -lvnp 4444`. Ogni lettera ha un significato preciso:\n\n- `l` — **listen**: resta in ascolto invece di connetterti\n- `v` — **verbose**: stampa a schermo tutto ciò che succede\n- `n` — **niente DNS**: mostra solo indirizzi IP\n- `p 4444` — **port**: ascolta sulla porta 4444\n\nLa scelta della porta non è casuale:\n\n- Sotto la **1024** servono privilegi di root, quindi si scelgono porte alte.\n- Le più **discrete** sono `443`, `8443`, `53`: sono le porte di HTTPS e DNS, che i firewall aziendali lasciano quasi sempre uscire.\n- Nei laboratori si usa per convenzione `4444` o `9001`.\n\nLa porta che scegli qui viene ricordata e usata automaticamente nei task successivi per costruire un payload coerente.",
      hint: "Prova 443, 8443, 4444, 9001 o 53. Sotto 1024 in questa palestra serve root.",
      explanation:
        "Il listener è la parte «attaccante» della reverse shell: senza di lui il payload sul server tenterebbe di connettersi nel vuoto e fallirebbe subito. È come un telefono acceso in attesa di una chiamata — se lo spegni, nessuno può parlarti.",
      Simulation: Task05Listener,
    },
    {
      id: "06-payload",
      title: "Genera il payload shell.aspx",
      goal: "Costruire il file che aprirà la connessione verso di noi",
      brief:
        "Ora componiamo il payload vero e proprio: un file `shell.aspx` che, quando il server lo eseguirà, farà partire PowerShell con un comando che apre una connessione TCP verso il nostro listener. In pratica stiamo scrivendo le istruzioni che il server eseguirà per chiamarci.",
      details:
        "Il payload combina **due pezzi**:\n\n- **Il file `.aspx`** — appena IIS lo apre, invece di mostrare una pagina fa partire un processo `powershell.exe`.\n- **Una riga di PowerShell** — la classica «PowerShell reverse shell» che:\n  1. apre un socket TCP verso `LHOST:LPORT` (il nostro IP e la nostra porta)\n  2. collega input e output di PowerShell al socket\n  3. resta in attesa di comandi\n\nPer evitare problemi con virgolette e caratteri speciali, quella riga viene codificata in **base64** e passata a PowerShell con `-EncodedCommand`.\n\nDue parametri sono critici:\n\n- **LHOST** — il tuo IP raggiungibile dal server\n- **LPORT** — la porta su cui il tuo listener è in ascolto (deve essere **esattamente** quella del task precedente, altrimenti chiami un numero a cui non risponde nessuno)",
      hint: "LPORT deve coincidere con la porta del listener aperto nel task 5.",
      explanation:
        "Il pattern LHOST/LPORT è universale in tutti i payload di reverse shell: LHOST è il tuo IP raggiungibile dalla vittima, LPORT la porta su cui stai ascoltando. Sbagliare anche solo uno dei due significa nessuna connessione: il server prova a chiamare, non risponde nessuno, la shell non si apre.",
      Simulation: Task06Payload,
    },
    {
      id: "07-trigger",
      title: "Carica e trigga il payload",
      goal: "Vedere la shell aprirsi nel listener",
      brief:
        "È il momento chiave dell'intero modulo. Carichiamo `shell.aspx` nella cartella `/uploads/`, poi apriamo il suo URL dal browser. IIS lo compila ed esegue, PowerShell parte, si connette al nostro listener: sul terminale vedremo comparire il prompt della macchina remota.",
      details:
        "La sequenza esatta:\n\n1. **POST** a `/upload` inviando `shell.aspx` come contenuto.\n2. IIS salva il file in `/uploads/shell.aspx`.\n3. Apriamo nel browser `http://target/uploads/shell.aspx`.\n4. IIS **compila** la pagina al volo ed **esegue** il suo codice, che chiama `System.Diagnostics.Process.Start(\"powershell.exe\", …)`.\n5. PowerShell apre un `TCPClient(LHOST, LPORT)` e collega input/output al socket.\n6. Il nostro `nc` mostra `connect from …` e ci ritroviamo davanti al prompt `PS C:\\…>` del server.\n\nDa questo momento in poi ogni comando che scriviamo nel nostro terminale viene eseguito **sulla macchina remota**, esattamente come se fossimo seduti davanti a essa.",
      hint: "Prima Carica, poi Trigger. Guarda il terminale a destra: la connessione entra da sola.",
      explanation:
        "Meccanicamente questa è già un'intera compromissione. La difesa più economica non è rilevare il file caricato, ma impedire che venga eseguito: basta impostare `accessPolicy=\"Read\"` sulla cartella `uploads/` e IIS smette di trattare gli `.aspx` come codice — li serve come semplici file di testo, e la catena si spezza.",
      Simulation: Task07Trigger,
    },
    {
      id: "08-interact",
      title: "Post-exploitation: dentro il server",
      goal: "Guardarsi intorno con la shell interattiva appena ottenuta",
      brief:
        "Ora abbiamo un prompt PowerShell sul server compromesso. La domanda è: cosa ce ne facciamo? Il primo passo è sempre guardarsi intorno con calma: chi siamo, su che macchina siamo finiti, quali utenti esistono, cosa contiene la configurazione dell'applicazione.",
      details:
        "Questa fase si chiama **post-exploitation** ed è dove l'attacco smette di essere una curiosità tecnica e diventa un problema serio. L'attaccante trasforma «posso eseguire comandi» in «posso fare danni utili»:\n\n- Cerca **credenziali** salvate in `web.config` o `appsettings.json`\n- Cerca **chiavi API** e password di database nei file di configurazione\n- Se il server è in **Active Directory**, prova a enumerarlo per muoversi verso altri sistemi\n- Cerca modi per passare da `iis apppool\\...` a **`SYSTEM`** (Juicy Potato, Rogue Potato, servizi mal configurati)\n\nNel nostro task ci limitiamo a qualche comando di ricognizione:\n\n- `whoami` — conferma dell'identità\n- `hostname` — nome della macchina\n- `Get-Content C:\\inetpub\\wwwroot\\web.config` — cerchiamo segreti in chiaro",
      hint: "Almeno: whoami, hostname, Get-Content C:\\inetpub\\wwwroot\\web.config.",
      explanation:
        "Il vero danno raramente sta nel web server in sé: sta nelle credenziali che quel web server conosce (database, servizi cloud, altri sistemi interni). Ecco perché non tenere segreti in file leggibili dal processo web — usando invece secret manager, variabili d'ambiente cifrate o vault — è una difesa più profonda di qualunque firewall applicativo.",
      Simulation: Task08Interact,
    },
    {
      id: "09-defense",
      title: "Contromisure: cosa funziona davvero",
      goal: "Distinguere le difese vere da quelle solo apparenti",
      brief:
        "Selezione multipla: fra tutte le contromisure elencate, quali avrebbero davvero fermato l'attacco che abbiamo appena eseguito (o ne avrebbero ridotto seriamente l'impatto)? Alcune sembrano difese ma non lo sono; altre sono meno intuitive ma davvero efficaci.",
      details:
        "Il modo migliore per fissare i concetti è ragionare al contrario: dato l'attacco appena visto, quali controlli avrebbero **rotto la catena**?\n\n**Difese solo apparenti** (sembrano ragionevoli, non funzionano):\n\n- Rinominare i file caricati → non impedisce a IIS di eseguirli\n- Nascondere l'header `Server` → chi manda una richiesta non se ne accorge\n- Validare l'estensione **solo lato browser** → si aggira in 2 secondi con un proxy\n\n**Difese davvero efficaci** (meno visibili, molto potenti):\n\n- **Egress filtering** — impedisce al server di chiamare il listener anche se il payload viene eseguito\n- **Application pool con privilegi minimi** — limita cosa può fare la shell una volta aperta\n- **Handler disabilitati** nella cartella `/uploads/` — trasforma gli eseguibili in file di testo innocui",
      hint: "Chiediti per ogni voce: «un attaccante con un terminale può aggirarla?».",
      explanation:
        "La sicurezza si misura sulla catena, non sui singoli anelli. Bastano quattro misure semplici — validazione seria dell'upload, handler disabilitati in `/uploads/`, application pool a privilegi minimi, egress filter sul traffico in uscita — per rendere la catena descritta praticamente impossibile da completare.",
      Simulation: Task09Defense,
    },
    {
      id: "10-quiz",
      title: "Quiz finale — 10 domande",
      goal: "Consolidare la catena e le difese viste finora",
      brief:
        "Dieci domande brevi che ripercorrono l'intero modulo: dalla definizione di reverse shell alla scelta della porta, dall'identità dell'application pool alle contromisure che funzionano davvero. Rispondi correttamente a tutte per completare lo scenario.",
      details:
        "Le domande non sono difficili: servono a verificare se i concetti sono davvero entrati.\n\nSe qualcosa non torna:\n\n- Torna al task corrispondente\n- Rileggi la spiegazione con il contesto pratico che ora hai\n- Rileggere dopo aver «visto» un concetto vale molto più che leggerlo due volte a freddo\n\nSi può riprovare quante volte vuoi, senza penalità.",
      hint: "Ragiona su: chi parla per primo? con quali privilegi gira IIS? cosa vede il difensore nei log?",
      explanation:
        "Reverse shell su IIS è un caso da manuale di come una serie di piccole trascuratezze (upload permissivo, cartella eseguibile, application pool troppo privilegiato, nessun egress filter) si combinano in una compromissione grave. Nessuno dei singoli errori è catastrofico da solo; il problema nasce dalla loro somma.",
      Simulation: Task10Quiz,
    },
  ],
};
