import type { Scenario } from "../types";
import { idorSlides } from "./slides";
import Task01Observe from "./tasks/Task01Observe";
import Task02ChangeId from "./tasks/Task02ChangeId";
import Task03Invoice from "./tasks/Task03Invoice";
import Task04Admin from "./tasks/Task04Admin";
import Task05Download from "./tasks/Task05Download";
import Task06PostBody from "./tasks/Task06PostBody";
import Task07Uuid from "./tasks/Task07Uuid";
import Task08Api from "./tasks/Task08Api";
import Task09ClientBypass from "./tasks/Task09ClientBypass";
import Task10Quiz from "./tasks/Task10Quiz";

export const idorScenario: Scenario = {
  id: "idor",
  slug: "idor",
  title: "Vulnerabilità IDOR",
  subtitle: "Insecure Direct Object Reference",
  intro:
    "Quando un'applicazione espone un identificatore di risorsa (un numero, un UUID, un nome) e non verifica se hai il diritto di accedervi, chiunque conosca l'id può leggere o modificare dati altrui. Impareremo a riconoscere il pattern in URL, form e API.",
  difficulty: "Base",
  status: "available",
  slides: idorSlides,
  tasks: [
    {
      id: "01-osserva",
      title: "Osserva l'ID nell'URL",
      goal: "Capire cos'è un identificatore di risorsa",
      brief:
        "Ogni oggetto (ordine, fattura, profilo) ha un id. Nel browser lo vedi come parametro nella barra dell'URL. Impariamo a leggerlo.",
      details:
        "Prima di parlare di attacchi, dobbiamo capire un concetto banale ma fondamentale: **ogni cosa che un'applicazione ti mostra ha un identificatore**. Un ordine, una fattura, un profilo, un messaggio, un allegato: sono tutti «oggetti» che il server tiene dentro un database, e ognuno ha una **chiave** che serve a ritrovarlo.\n\nQuando apri una pagina, succede questo:\n\n1. Il browser manda una richiesta con un id (es. `/orders/1042`).\n2. Il server prende l'id, cerca nel database la riga corrispondente.\n3. Ti restituisce il contenuto di quella riga.\n\nIn questo primo task **non c'è nessun attacco**: alleniamo solo l'occhio a riconoscere il pattern. Cliccando avanti e indietro tra un ordine e l'altro, guarda cosa cambia nell'URL. È sempre e solo un numero.\n\nDove trovi gli id nel mondo reale — è utile abituarsi subito, perché nei task successivi li cercheremo in tutti questi posti:\n\n- **Nella barra dell'URL**: `/orders/1042`, `/users/42/profile`\n- **Nei parametri di query**: `?doc=87`, `?invoice=9040`\n- **Nei cookie e nell'header `Authorization`** (di solito legati alla sessione, non alla risorsa)\n- **Nei campi hidden dei form**: `<input type=\"hidden\" name=\"userId\" value=\"42\">`\n- **Nei body JSON delle chiamate API**: `{ \"targetUser\": 42, \"action\": \"delete\" }`\n\nGli id non sono il problema. Il problema, come vedremo, è **fidarsi ciecamente** dell'id che arriva dal client senza verificare chi lo sta usando.",
      hint: "Clicca 'Ordine successivo' e guarda il numero nell'URL cambiare.",
      explanation:
        "Gli id identificano risorse. Sono la chiave con cui il server ritrova un oggetto nel database. Nulla di sbagliato in sé — il problema nasce se il server non verifica chi li sta usando.",
      Simulation: Task01Observe,
    },
    {
      id: "02-cambia-id",
      title: "Cambia l'ID e leggi un altro ordine",
      goal: "Il tuo primo IDOR",
      brief:
        "Il tuo id ordine è 1042. Prova a modificarlo nell'URL e caricare l'ordine di un altro cliente.",
      details:
        "Questo è **il cuore della vulnerabilità IDOR** (Insecure Direct Object Reference). Lo scenario è banale: l'app ti mostra il tuo ordine `1042` e si fida del fatto che tu chieda solo quello. In nessun punto verifica che l'ordine richiesto appartenga davvero a te.\n\nCome si sfrutta, passo per passo:\n\n1. Sei loggato regolarmente come cliente e stai guardando il tuo ordine `1042`.\n2. Nella barra dell'URL sostituisci `1042` con `1043`. Premi Invio.\n3. Il server riceve la richiesta autenticata (il tuo cookie è valido) e, senza fare altri controlli, ti mostra l'ordine `1043`, che è di un altro cliente.\n4. Ripeti con `1044`, `1045`… ogni numero è una carta d'identità di qualcuno.\n\nCosa vedi in quegli ordini che non dovresti vedere:\n\n- Nome e cognome del cliente\n- Indirizzo di spedizione\n- Importo pagato\n- A volte l'ultima cifra della carta o il metodo di pagamento\n\nNel mondo reale l'attaccante **non si ferma a un id**. Usa uno script (poche righe di Python o `curl` in un `for` di bash) per iterare **tutti i numeri** — tecnica chiamata *ID enumeration* o *ID fuzzing*. In pochi minuti scarica l'intero database ordini: migliaia di righe con dati personali di clienti veri. È così che sono nate molte delle grandi data breach degli ultimi anni.\n\nLa vulnerabilità non richiede strumenti sofisticati: **basta la barra degli indirizzi del browser**. E questo è, allo stesso tempo, quello che la rende così pericolosa e così comune.",
      hint: "Sostituisci 1042 con 1043, 1044 o 1045 e premi Carica.",
      explanation:
        "Nessun controllo di proprietà: qualunque cliente può leggere l'ordine di chiunque altro. La difesa corretta è verificare sul server, per ogni richiesta, che l'utente autenticato sia effettivamente il proprietario della risorsa richiesta.",
      Simulation: Task02ChangeId,
    },
    {
      id: "03-fattura",
      title: "Trova la fattura di un altro utente",
      goal: "Ricerca manuale per id",
      brief:
        "Trova la fattura intestata a Marco Bianchi modificando il numero nell'URL /invoice/<id>.",
      details:
        "Qui sei nella condizione tipica di un attaccante reale: **parti da un id che conosci** (il tuo, vicino a `9040`) e provi quelli vicini finché non trovi qualcosa di interessante. Non serve indovinare un id qualsiasi tra miliardi: gli id incrementali te lo dicono in che intervallo cercare.\n\nQuesto approccio ha un nome tecnico: **ID neighbour enumeration**. Sai che il tuo id è nell'intorno di 9040 → provi da 9030 a 9050 → in 20 tentativi hai un campione di venti fatture, tutte di clienti veri.\n\nCosa c'è in gioco in **ogni singola fattura**:\n\n- **Intestatario e indirizzo** — dati personali soggetti a GDPR\n- **Importo e dettaglio dei servizi**\n- **IBAN e coordinate di pagamento**\n- **Partita IVA o codice fiscale**\n\nOgni fattura visualizzata è una **potenziale violazione di dati personali**. In Europa parliamo di violazione GDPR sanzionabile fino al **4% del fatturato annuo** o **20 milioni di euro**, il maggiore dei due. Fuori dall'Europa esistono regolamenti equivalenti (CCPA in California, LGPD in Brasile).\n\nMorale, e questo è un punto di design: **usare id sequenziali su risorse sensibili è un errore**. Anche con un'autorizzazione perfetta, esporre id incrementali rivela metadati che non dovresti dare a nessuno:\n\n- Quante fatture emetti al mese (guardando la differenza tra due id nel tempo)\n- Quanto sta crescendo il servizio\n- Se il numero è basso, quanto è giovane l'azienda\n\nMeglio usare identificatori **opachi** (UUID casuali, hash) che non rivelano nulla del contesto — ne parleremo nel task 07.",
      hint: "I numeri validi sono vicini a 9040. Prova 9038, 9039, 9041, 9042.",
      explanation:
        "Un attaccante può iterare tutti gli id (fuzzing) per costruire un intero database. La combinazione «id prevedibili + nessuna autorizzazione» è una delle top-10 OWASP.",
      Simulation: Task03Invoice,
    },
    {
      id: "04-admin",
      title: "Escalation ad admin",
      goal: "Sfruttare id prevedibili",
      brief:
        "Nella maggior parte dei sistemi, id=1 è l'account creato per primo — spesso l'amministratore.",
      details:
        "Un IDOR non serve solo a leggere dati altrui: può portare direttamente a **privilege escalation**, cioè guadagnare privilegi che non ti spettano. Ed è qui che la vulnerabilità si trasforma da fastidiosa a catastrofica.\n\nQuando gli id sono numerici e sequenziali, l'id `1` è quasi sempre il primo account creato durante l'installazione — tipicamente l'**amministratore di default**. Poi `2` è spesso un secondo admin o un utente di test. Da `3` in poi cominciano gli utenti reali.\n\nCosa fai in questo task:\n\n1. Sei loggato come utente `42`, un utente normale, senza privilegi speciali.\n2. Nella barra dell'URL cambi `/profile/42` in `/profile/1`.\n3. Se l'app non controlla il ruolo di chi sta chiedendo (e non solo che sia loggato), ti mostra il profilo di admin: dati riservati, permessi, a volte perfino token API o chiavi di integrazione salvate in chiaro.\n\nDa qui l'attacco continua: se puoi anche **modificare** quel profilo (non solo leggerlo), puoi cambiare la password dell'admin, l'email di recupero, disattivare la 2FA. In minuti l'attaccante è dentro con i massimi privilegi.\n\nQuesto scenario combina **due errori distinti** che moltiplicano il rischio:\n\n- **Mancanza di autorizzazione basata sul ruolo** — l'app verifica solo che tu sia loggato, non che tu sia autorizzato a vedere *quella* risorsa.\n- **Prevedibilità dell'id** — sequenza numerica → id 1 = admin, sempre.\n\nBasta rimuoverne uno per ridurre drasticamente il rischio. Rimuoverli entrambi (autorizzazione seria + id opachi) è la difesa completa.",
      hint: "Cambia /profile/42 in /profile/1.",
      explanation:
        "Sequenza + mancanza di autorizzazione = privilege escalation. Preferisci UUID casuali e verifica sempre i ruoli lato server prima di rispondere.",
      Simulation: Task04Admin,
    },
    {
      id: "05-download",
      title: "Scarica un file riservato",
      goal: "IDOR su download",
      brief:
        "Un endpoint per il download accetta l'id del file. Prova a scaricare un documento Riservato.",
      details:
        "Molte applicazioni servono file (PDF, immagini, allegati, contratti) tramite endpoint tipo `/download?doc=42`. Sono un **bersaglio classico** di IDOR perché lo sviluppatore si dice: «tanto il link glielo mando io per email, nessuno indovinerà l'id». È un ragionamento sbagliato e ha un nome: **security through obscurity** — che, come principio di sicurezza, non funziona.\n\nCosa fai nel task, passo per passo:\n\n1. Vedi un elenco di documenti pubblici, ognuno con il suo id.\n2. Cambi l'id nell'URL per chiedere documenti che **non sono in elenco**.\n3. Alcuni sono marcati come «Riservato»: contratti, buste paga, documenti d'identità caricati come allegato.\n4. Non dovresti poterli aprire, ma il server non verifica: te li serve tranquillamente.\n\nCasi reali importanti — **Facebook**, **Verizon**, **First American Financial** — sono partiti tutti proprio da un id incrementale in un URL di download. Il caso First American, in particolare, ha esposto **885 milioni** di documenti finanziari e assicurativi: nomi, indirizzi, numeri di previdenza sociale, dettagli di mutui. La vulnerabilità? Un URL con id sequenziale e nessun controllo di autorizzazione.\n\nCome dovrebbe essere fatto un endpoint di download sicuro:\n\n- L'utente autenticato chiede il documento (con qualunque id, anche prevedibile).\n- Il server verifica: **questo utente è tra i destinatari autorizzati di questo documento?**\n- Se sì, serve il file. Se no, restituisce **404** (non 403: non confermare nemmeno che il documento esiste, per non alimentare l'enumeration).\n\nLa regola è semplice: **ogni endpoint che serve contenuti deve verificare, per ogni richiesta, se l'utente corrente ha diritto a quel contenuto**. Non basta che il link non sia pubblicato: bisogna che il server dica di no.",
      hint: "Prova doc=87 o doc=88.",
      explanation:
        "Ogni endpoint che serve contenuti deve verificare, per ogni richiesta, se l'utente corrente ha diritto a quel contenuto. Non basta che il link non sia pubblicato: bisogna che il server dica di no.",
      Simulation: Task05Download,
    },
    {
      id: "06-body",
      title: "IDOR nel body di una richiesta",
      goal: "Non solo URL",
      brief:
        "I form hanno campi nascosti. Cambia lo userId inviato e modifica un account che non è il tuo.",
      details:
        "Fino a qui abbiamo giocato con la barra degli indirizzi, ma questo è solo il pezzo più visibile. Un attaccante può modificare **qualunque parte di una richiesta HTTP** con strumenti banali:\n\n- **DevTools del browser** (gratis, già installato in Chrome, Firefox, Edge)\n- **Burp Suite** o **OWASP ZAP** (proxy che intercettano e modificano ogni richiesta)\n- **`curl`** dalla riga di comando\n\nCosa può cambiare:\n\n- Header e cookie\n- Body JSON o form-urlencoded\n- Campi hidden dei form (`<input type=\"hidden\">`)\n- Metodo HTTP (GET → POST, POST → PUT)\n\nIn questo task il form di «cambia password» contiene un campo nascosto `userId=42` (il tuo). L'idea del programmatore era: «il browser me lo rimanda uguale, quindi so a chi cambiare la password». Ragionamento sbagliato: **il client è sempre in mano all'utente**, e l'utente può metterci quello che vuole.\n\nSostituisci `userId=42` con `userId=1` (o `7`, o qualunque altro id valido) e la password che stai impostando diventa quella di un altro account. Se il server non ricontrolla e non prende l'id **dalla sessione autenticata**, l'attacco funziona.\n\n**Regola d'oro: «Never trust the client».** Ogni dato che identifica *chi* sta agendo deve venire dal token di sessione lato server (`req.user.id`, `auth.uid()`, la claim `sub` del JWT), mai da un input dell'utente. I dati inviati dal client servono a dire *cosa* fare, mai a dire *chi* lo sta facendo.\n\nUn buon indicatore quando fai code review: se in una funzione vedi qualcosa tipo `updateUser(input.userId, input.newPassword)`, chiediti sempre — quel `input.userId` è verificato contro la sessione? Se non lo è, hai trovato un IDOR.",
      hint: "Metti 1 (admin) o 7 nel campo userId e salva.",
      explanation:
        "Il server dovrebbe ignorare lo userId inviato dal client e usare quello estratto dalla sessione autenticata (req.user.id, auth.uid()…).",
      Simulation: Task06PostBody,
    },
    {
      id: "07-uuid",
      title: "UUID prevedibili",
      goal: "Quando l'id sembra sicuro ma non lo è",
      brief:
        "Sequenze di codici lunghi possono comunque essere indovinabili. Prova a riscattare un voucher di un altro utente.",
      details:
        "«Usiamo UUID, siamo al sicuro». **Non sempre.** È una delle affermazioni più pericolose che si sentono nelle code review, perché suona convincente e blocca il ragionamento.\n\nUn **UUID** (Universally Unique Identifier) è una stringa di 32 caratteri esadecimali (128 bit): 340 undecilioni di combinazioni. Sulla carta è impossibile da indovinare. Nella pratica, dipende **completamente** da come è stato generato:\n\n- **UUID v4** — casuale, generato da una fonte crittograficamente forte: sicuro, non prevedibile.\n- **UUID v1** — basato su timestamp + MAC address della macchina che lo genera: se conosci l'ora e il MAC, indovini il prossimo.\n- **Implementazioni fatte a mano** — a volte concatenano un prefisso «finto UUID» con un contatore reale: sembrano casuali, non lo sono.\n\nIl caso del task:\n\n- I voucher hanno forma `VCR-8F3A-...-0001` — sembrano casuali\n- In realtà **solo le ultime 4 cifre cambiano**, ed è un contatore incrementale\n- Il tuo voucher finisce con `0001` → il prossimo utente ha `0002`, poi `0003`\n\nCon un piccolo script `curl` in un `for`, l'attaccante prova tutti i voucher da `0001` a `9999` in pochi minuti e li riscatta tutti.\n\nRegola in due parti — **entrambe** necessarie:\n\n- Usa generatori **dichiaratamente sicuri**: `crypto.randomUUID()` in Node, `secrets.token_urlsafe()` in Python, `gen_random_uuid()` in PostgreSQL, `uuid.uuid4()` con cautela (verifica l'implementazione).\n- **Abbina sempre un controllo di autorizzazione** lato server. Un id non prevedibile è una difesa **in profondità**, non un sostituto del controllo di proprietà.\n\nUn UUID casuale che protegge un endpoint senza altre difese è come una porta blindata su una parete di cartongesso: sembra sicuro finché qualcuno non prova a passare dal muro.",
      hint: "Il tuo id finisce con 0001. Prova 0002 o 0003.",
      explanation:
        "Usa generatori crittograficamente sicuri e mantieni comunque il controllo di autorizzazione lato server. Le due difese sommate valgono più della somma delle parti.",
      Simulation: Task07Uuid,
    },
    {
      id: "08-api",
      title: "IDOR in API REST",
      goal: "Stessi principi, contesto diverso",
      brief:
        "Le API REST espongono id nell'URL. Le regole di autorizzazione valgono identiche.",
      details:
        "Le app moderne hanno un frontend (React, Vue, Angular, un'app mobile) che chiama un backend **REST** o **GraphQL**. Le API espongono direttamente le risorse, spesso con nomi molto trasparenti:\n\n- `GET /api/users/42`\n- `PUT /api/orders/1042`\n- `DELETE /api/files/9`\n- `POST /api/messages/{id}/reply`\n\nNon c'è più una «pagina» a mediare: **puntando al giusto URL con il metodo HTTP giusto, si arriva subito alla risorsa**. Questo scenario **amplifica il rischio** rispetto alle applicazioni tradizionali per tre motivi:\n\n1. **Nessuna UI a nascondere le opzioni.** In un'app tradizionale non vedi il pulsante «elimina utente» se non sei admin. In un'API, il metodo `DELETE` esiste comunque — devi solo provarlo.\n2. **Automazione facile.** Uno script itera le API molto più velocemente di quanto un umano navighi pagine. Migliaia di richieste al secondo con `curl`, `requests`, `axios`.\n3. **Documentazione pubblica.** OpenAPI/Swagger espongono l'intera mappa degli endpoint. Comodo per gli sviluppatori legittimi, comodissimo per l'attaccante.\n\nCosa fai nel task:\n\n1. Interroghi la finta API con la tua identità (`GET /api/users/42`).\n2. Cambi l'id nell'endpoint (`/api/users/1`, `/api/users/7`).\n3. Osservi la risposta JSON: dati personali, ruolo, permessi, a volte l'hash della password o il refresh token.\n\nUn backend ben progettato controlla `auth.uid() === requestedId` (o un permesso equivalente basato sui ruoli) **prima** di rispondere. Le difese moderne più robuste sono:\n\n- **RBAC** (Role-Based Access Control) — permessi legati a ruoli\n- **ABAC** (Attribute-Based Access Control) — permessi legati ad attributi (dipartimento, tenant, orario)\n- **RLS** (Row-Level Security) dei database moderni (Postgres, Supabase) — la regola vive dentro il database e vale per **ogni** query, indipendentemente da quale endpoint la lancia\n\nRLS in particolare è potente perché **fallisce chiuso**: se dimentichi la policy, la query non restituisce nulla, invece di restituire tutto.",
      hint: "Modifica /api/users/42 in /api/users/1 o /api/users/7 e invia.",
      explanation:
        "Nelle API il rischio è amplificato: nessuna UI a mediare, tutte le risorse sono direttamente indirizzabili. Servono policy di autorizzazione dichiarative (RBAC, ABAC, RLS di database).",
      Simulation: Task08Api,
    },
    {
      id: "09-client-bypass",
      title: "Bypassare un controllo lato client",
      goal: "Il browser non è una difesa",
      brief:
        "Un bottone \"disabled\" impedisce solo il click nel tuo browser. Con DevTools puoi rimuoverlo.",
      details:
        "Molti sviluppatori pensano: «se il pulsante è disabilitato quando l'utente non è admin, l'azione è sicura». **Falso, in ogni linguaggio e in ogni framework.**\n\nIl motivo è che **tutto ciò che gira nel browser è sotto il pieno controllo dell'utente**:\n\n- **HTML e CSS** — modificabili dal vivo con DevTools (`F12` → tab Elements)\n- **JavaScript in esecuzione** — puoi mettere breakpoint, cambiare variabili, riscrivere funzioni\n- **Valore dei campi** — inclusi quelli `disabled`, `readonly`, `hidden`\n- **Header delle richieste** — modificabili con un proxy come Burp\n- **Storage locale** (localStorage, cookie, IndexedDB) — tutto ispezionabile e riscrivibile\n\nCosa fai nel task, passo per passo:\n\n1. Il bottone «Elimina utente» è disabilitato per te perché non sei admin.\n2. Spunti la casella «Simula DevTools» → il pulsante torna cliccabile.\n3. È esattamente lo stesso effetto che otterresti aprendo DevTools sul sito reale, cliccando sul bottone nell'inspector e cancellando l'attributo `disabled` dall'HTML — un'operazione che richiede letteralmente 3 secondi.\n4. Se il server non ricontrolla il ruolo prima di eseguire l'azione, l'utente elencato viene davvero cancellato dal database.\n\nEsempi reali di questo pattern:\n\n- App bancarie con «trasferimento massimo giornaliero: 1000€» validato solo lato client → attaccante trasferisce 100.000€\n- SaaS con feature premium nascoste dietro `if (user.plan === 'pro')` → chi cambia la variabile ottiene la feature gratis\n- Wizard di registrazione con validazioni solo in JavaScript → l'utente salta il flusso e crea account inconsistenti\n\n**Regola:** i controlli lato client servono **solo all'usabilità** — mostrare/nascondere pulsanti, dare feedback in tempo reale, evitare richieste inutili al server. **L'autorizzazione va sempre replicata sul server**, dove l'attaccante non ha accesso al codice in esecuzione.\n\nUn buon principio guida è: «se rimuovo tutto il JavaScript dal frontend, la sicurezza dell'app deve restare identica». Se non è così, hai un problema.",
      hint: "Spunta il bypass DevTools, cambia lo username in anna.rossi e clicca Elimina.",
      explanation:
        "Ogni controllo di autorizzazione va replicato sul server. Il client è cosmetica: utile per l'UX, inutile per la sicurezza.",
      Simulation: Task09ClientBypass,
    },
    {
      id: "10-quiz",
      title: "Quiz finale — 10 domande",
      goal: "Consolidare i concetti",
      brief:
        "Dieci domande per fissare i concetti visti. Rispondi correttamente a tutte per completare il modulo.",
      details:
        "Ultimo passo del modulo: dieci domande che ripercorrono il cammino fatto, dall'osservazione di un id nell'URL fino al bypass dei controlli lato client. Le domande sono **volutamente semplici** e mettono a fuoco i principi chiave: cos'è un IDOR, dove si annida, come si difende.\n\nCome affrontare il quiz:\n\n- Rispondi prima **senza rileggere** — se un concetto è entrato davvero, la risposta viene naturale.\n- Se sbagli, torna al task corrispondente: la spiegazione ha molto più senso dopo aver visto il pattern in azione.\n- Puoi ripetere il quiz quante volte vuoi: si completa solo con **10/10**, quindi ogni errore è un'occasione per fissare meglio un concetto.\n\nAl termine avrai un quadro completo di **cosa cercare** quando fai code review o pentest su un'applicazione:\n\n- **URL con id** — sequenziali o presunti opachi\n- **Campi hidden nei form** — soprattutto `userId`, `accountId`, `tenantId`\n- **Chiamate API** — specialmente `PUT`/`DELETE` che accettano l'id come parametro\n- **Controlli solo lato client** — pulsanti `disabled`, feature nascoste in JavaScript\n- **Id sequenziali** — su qualunque risorsa personale o riservata\n\nQueste cinque famiglie di segnali coprono la stragrande maggioranza degli IDOR trovati in produzione. Se dopo il quiz le riconosci a colpo d'occhio, hai raggiunto l'obiettivo del modulo.",
      hint: "Pensa a: dove va fatto il controllo? Come genero gli id? Di chi devo fidarmi?",
      explanation:
        "Le tre regole d'oro: autorizzazione server-side, id non prevedibili, mai fidarsi del client.",
      Simulation: Task10Quiz,
    },
  ],
};
