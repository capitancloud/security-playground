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
        "Immagina di essere davanti a una porta chiusa: prima di forzarla vuoi sapere se è di legno o di metallo, se ha una serratura vecchia o nuova, se dietro c'è un cane. Nella sicurezza informatica facciamo la stessa cosa con uno strumento chiamato nmap. Lanciando `nmap -sV 10.10.24.17` chiediamo al server: «Ciao, quali porte hai aperte? E che programma risponde su ognuna?». La risposta ci dirà per esempio che sulla porta 80 (HTTP) c'è Microsoft-IIS/10.0 e che il sistema operativo è Windows Server 2019. Da questa singola riga capiamo tantissimo: il web server è IIS (di Microsoft), quindi possiamo usare pagine .aspx; il sistema è Windows, quindi il linguaggio giusto per gli script sarà PowerShell. Se invece avessimo trovato Apache su Linux, l'intera catena di attacco che vedremo nei prossimi task non funzionerebbe.",
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
        "Perché queste due cose insieme? Perché la catena della reverse shell si regge su tre anelli: (1) qualcuno mi lascia caricare un file, (2) posso raggiungerlo da un URL nel browser, (3) il server esegue quel file invece di limitarsi a mostrarlo. In questo task ci concentriamo sui primi due anelli, che si scoprono semplicemente navigando il sito e leggendo gli header HTTP (le informazioni tecniche che il server manda insieme a ogni pagina). Prova a visitare la home, poi cerca indirizzi comuni come `/upload` (la pagina dove si caricano i file) e `/uploads/` (la cartella dove finiscono). Gli header confermano anche versione di IIS e di ASP.NET, utili per capire cosa il server sa fare. Il terzo anello — «i file caricati vengono davvero eseguiti?» — lo verificheremo nel task 4.",
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
        "Una webshell è una pagina web che, invece di mostrarti un contenuto statico, ti permette di eseguire comandi sul server. Il meccanismo è disarmante: la pagina legge un parametro dall'URL (per esempio `?cmd=whoami`), passa quel testo al sistema operativo, cattura l'output e lo scrive nel corpo della risposta HTTP. È esattamente ciò che il tuo terminale fa in locale, ma trasformato in una pagina web accessibile da chiunque conosca l'URL. In ASP.NET bastano davvero poche righe: una direttiva `<%@ Page Language=\"C#\" %>` in cima al file, la lettura di `Request[\"cmd\"]`, l'avvio di `cmd.exe /c` e la scrittura del risultato con `Response.Write`. Non è ancora una reverse shell (per quella dovremo aspettare il task 6), ma è il mattone da cui parte tutto: chiunque riesca a caricare un file del genere in una cartella eseguita da IIS ha di fatto un terminale remoto sul server.",
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
        "In questa simulazione l'endpoint `/upload` accetta qualsiasi estensione — comprese le pagine `.aspx` — e le salva in `/uploads/`, che è una cartella dove IIS esegue gli script. È la vulnerabilità più elementare che esista, eppure oggi la si trova ancora spessissimo in produzione. Prova qualche comando di ricognizione base: `whoami` per sapere con che utente sta girando IIS, `hostname` per il nome della macchina, `ipconfig` per la configurazione di rete, `dir c:\\inetpub\\wwwroot\\uploads` per vedere i file nella cartella dove sei appena atterrato. Nota una cosa importante: ogni comando è una richiesta HTTP visibile nei log del server (in `access.log`). Un difensore attento vedrebbe subito qualcosa di strano. Ma per adesso l'attacco funziona.",
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
        "Lo strumento standard per questo mestiere si chiama netcat (`nc`), un piccolo coltellino svizzero della rete. Il comando che useremo è `nc -lvnp 4444`, dove ogni lettera ha un significato preciso: `l` = listen, resta in ascolto invece di connetterti a qualcuno; `v` = verbose, stampa a schermo tutto ciò che succede; `n` = niente risoluzione DNS, mostra solo indirizzi IP; `p 4444` = ascolta sulla porta 4444. La scelta della porta non è casuale: sotto la 1024 servono privilegi di root, quindi in genere si scelgono porte alte. Le più discrete sono 443, 8443, 53: sono porte che i firewall aziendali quasi sempre lasciano uscire, perché sono le stesse di HTTPS e DNS. Nei laboratori si usa per convenzione 4444 o 9001. La porta che scegli qui viene ricordata e usata automaticamente nei task successivi per costruire un payload coerente.",
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
        "Il payload combina due pezzi. Il primo pezzo è il file `.aspx`: appena IIS lo apre, invece di mostrare una pagina fa partire un processo `powershell.exe`. Il secondo pezzo è una riga di PowerShell — la classica «PowerShell reverse shell» — che apre un socket TCP verso `LHOST:LPORT` (il nostro IP e la nostra porta), collega l'input e l'output di PowerShell al socket e resta in attesa di comandi. Per evitare problemi con virgolette e caratteri speciali, quella riga viene codificata in base64 e passata a PowerShell con `-EncodedCommand`. Due parametri sono critici: `LHOST` è il tuo IP raggiungibile dal server (quello che il server userà per chiamarti), `LPORT` è la porta su cui il tuo listener è in ascolto — deve essere esattamente la stessa del task precedente, altrimenti il server chiama un numero che nessuno risponde.",
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
        "La sequenza esatta è questa. (1) Facciamo una richiesta POST a `/upload` inviando `shell.aspx` come contenuto. (2) IIS salva il file in `/uploads/shell.aspx`. (3) Apriamo nel browser `http://target/uploads/shell.aspx`. (4) IIS compila la pagina al volo ed esegue il suo codice, che chiama `System.Diagnostics.Process.Start(\"powershell.exe\", …)`. (5) PowerShell apre un `TCPClient(LHOST, LPORT)` e collega input/output al socket. (6) Il nostro `nc` mostra `connect from …` e ci ritroviamo davanti al prompt `PS C:\\…>` del server. Da questo momento in poi ogni comando che scriviamo nel nostro terminale viene eseguito sulla macchina remota, esattamente come se fossimo seduti davanti a essa.",
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
        "Questa fase si chiama post-exploitation ed è dove l'attacco smette di essere una curiosità tecnica e diventa un problema serio. L'attaccante trasforma «posso eseguire comandi» in «posso fare danni utili»: cerca credenziali salvate in `web.config` o `appsettings.json`, chiavi API in file di configurazione, password di database. Se il server è in un dominio Active Directory prova a enumerarlo per capire come muoversi verso altri sistemi. Cerca modi per passare dall'utente limitato di IIS (`iis apppool\\...`) a `SYSTEM`, sfruttando privilegi come `SeImpersonatePrivilege` (tecniche come Juicy Potato, Rogue Potato) o servizi mal configurati. Nel nostro task ci limitiamo a qualche comando di ricognizione: `whoami` per confermare l'identità, `hostname` per il nome della macchina, `Get-Content C:\\inetpub\\wwwroot\\web.config` per vedere se ci sono segreti in chiaro.",
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
        "Il modo migliore per fissare i concetti è ragionare al contrario: dato l'attacco appena visto, quali controlli avrebbero rotto la catena? Alcune voci sembrano ragionevoli ma non funzionano — rinominare i file caricati non impedisce a IIS di eseguirli, nascondere l'header `Server` non ferma nessuno che sappia mandare una richiesta, validare l'estensione solo lato browser si aggira in due secondi con un qualsiasi proxy. Altre sono meno visibili ma molto efficaci — filtrare il traffico in uscita (egress filtering) impedisce al server di chiamare il listener anche se il payload viene eseguito; far girare l'application pool con i privilegi minimi limita cosa può fare la shell una volta aperta; disabilitare gli handler nella cartella di upload trasforma i file eseguibili in file di testo innocui.",
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
        "Le domande non sono difficili: servono a verificare se i concetti sono davvero entrati. Se qualcosa non torna, torna al task corrispondente e rileggi la spiegazione con il contesto pratico che ora hai: rileggere dopo aver «visto» un concetto vale molto più che leggerlo due volte a freddo. Si può riprovare quante volte vuoi, senza penalità.",
      hint: "Ragiona su: chi parla per primo? con quali privilegi gira IIS? cosa vede il difensore nei log?",
      explanation:
        "Reverse shell su IIS è un caso da manuale di come una serie di piccole trascuratezze (upload permissivo, cartella eseguibile, application pool troppo privilegiato, nessun egress filter) si combinano in una compromissione grave. Nessuno dei singoli errori è catastrofico da solo; il problema nasce dalla loro somma.",
      Simulation: Task10Quiz,
    },
  ],
};
