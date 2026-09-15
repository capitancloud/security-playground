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
        "Un'applicazione web deve poter distinguere miliardi di righe dentro un database: lo fa assegnando a ciascun oggetto un identificatore univoco. Quando apri una pagina di dettaglio, il server riceve quell'id, va a cercare la riga corrispondente e te la mostra.\n\nIn questo primo task non c'è ancora alcun attacco: ci alleniamo soltanto l'occhio. Guarda con attenzione dove appare il numero nella barra degli indirizzi, come cambia quando navighi, e come lo stesso id compare anche nel contenuto della pagina. Riconoscere questo pattern è il primo passo per capire tutti gli scenari successivi.\n\nSuggerimento pratico: nel mondo reale gli id li trovi non solo nella URL, ma anche in parametri di query (?id=42), nei cookie, nell'header Authorization, nei campi hidden dei form e nei body JSON delle chiamate API.",
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
        "Questo è il cuore della vulnerabilità IDOR (Insecure Direct Object Reference). Sei loggato come cliente, hai fatto il tuo ordine 1042, e l'applicazione — quando gli chiedi /orders/1042 — te lo mostra correttamente. Il difetto è nell'ipotesi implicita: l'app si fida del fatto che tu chieda solo il tuo ordine, senza mai verificarlo.\n\nProva a manipolare direttamente l'URL nella barra. Non serve nessuno strumento speciale: basta il tuo browser. Sostituisci 1042 con 1043, 1044, 1045 e osserva cosa succede. Se il server non fa il controllo di proprietà (cioè non chiede a se stesso «ma questo utente è davvero il proprietario dell'ordine 1043?») ti mostrerà dati che non dovresti vedere: nome, indirizzo, importo, numero di carta parziale.\n\nNel mondo reale un attaccante non si ferma a un id: itera tutti i valori con uno script — questa tecnica si chiama enumeration o ID fuzzing — e in pochi minuti scarica l'intero database ordini.",
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
        "Nel task precedente sapevi già che l'ordine 1043 esisteva. Qui invece devi trovare tu la fattura giusta: sai solo che il numero è vicino a 9040. Questa è esattamente la condizione in cui si trova un attaccante reale: parte da un id che conosce (il proprio) e prova quelli vicini finché non trova qualcosa di interessante.\n\nOsserva bene i dati sensibili che compaiono: intestatario, importo, IBAN. Ogni fattura visualizzata è una potenziale violazione di dati personali (in Europa: violazione GDPR sanzionabile fino al 4% del fatturato annuo). E per un attaccante bastano poche righe di codice per iterare da 9000 a 9999 e salvare tutto.\n\nMorale: usare id sequenziali su risorse sensibili è un errore di design. Anche se autorizzassi bene ogni chiamata, esporre id incrementali rivela metadati (quanti ordini fai, quanto cresce il servizio…). Meglio identificatori opachi.",
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
        "Un IDOR non serve solo a leggere dati altrui: può portare a privilege escalation, cioè guadagnare privilegi che non ti spettano. Quando gli id sono numerici e sequenziali, l'id 1 è quasi sempre il primo account creato durante l'installazione del sistema — quindi tipicamente l'amministratore o un utente di servizio.\n\nSei loggato come utente 42 (un utente normale). Prova a caricare il profilo 1. Se l'app non controlla, ti mostrerà dati riservati: ruolo admin, permessi, magari token o chiavi API. In un attacco reale, il passo successivo sarebbe usare quei dati per compromettere l'intero sistema.\n\nQuesto scenario è particolarmente pericoloso perché combina due errori: mancanza di autorizzazione + prevedibilità dell'id. Rimuovere uno solo dei due riduce già drasticamente il rischio.",
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
        "Molte applicazioni servono file (PDF, immagini, allegati) tramite endpoint del tipo /download?doc=42. Sono uno dei bersagli più comuni di IDOR perché spesso lo sviluppatore pensa «tanto il link glielo mando io per email, nessuno indovinerà l'id». È un ragionamento sbagliato: security through obscurity non è sicurezza.\n\nQui hai un elenco di documenti pubblici a cui puoi accedere. Prova a cambiare l'id nella URL e a chiedere documenti che nell'elenco non compaiono. Alcuni sono marcati come «Riservato» — non dovresti poterli aprire, ma il server non verifica.\n\nNel mondo reale sono così che sono state esposte cartelle cliniche, contratti, foto private, buste paga. Molti casi noti (Facebook, Verizon, First American) sono partiti proprio da un id incrementale in un URL di download.",
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
        "Fin qui abbiamo giocato con la barra degli indirizzi. Ma un attaccante ha strumenti (DevTools del browser, Burp Suite, curl) per modificare qualunque parte della richiesta HTTP: header, cookie, body JSON, campi hidden dei form. Tutto ciò che parte dal client è manipolabile.\n\nIn questo task il form contiene un campo nascosto userId=42 (il tuo). Il server, ricevendo il POST, dovrebbe ignorarlo completamente e prendere l'id dell'utente dalla sessione autenticata. Se invece si fida del valore inviato, puoi cambiare la password di un altro utente semplicemente riscrivendo quel campo.\n\nRegola generale: «Never trust the client». Ogni dato che identifica CHI sta agendo deve venire dal token di sessione lato server, mai da un input dell'utente.",
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
        "«Usiamo UUID, siamo al sicuro». Non sempre. Un UUID (Universally Unique Identifier) è sicuro solo se generato con una fonte casuale crittograficamente forte. Esistono UUID di tipo 1 (basati su timestamp + MAC address) e implementazioni improprie in cui la parte finale è un semplice contatore.\n\nQui i voucher sembrano casuali (VCR-8F3A-...-0001) ma in realtà solo le ultime 4 cifre cambiano ed è un contatore. Se il tuo voucher finisce con 0001, il prossimo utente ha 0002, e così via. Un attaccante può iterare e riscattare voucher altrui.\n\nRegola: usa generatori dichiaratamente sicuri (crypto.randomUUID() in JavaScript, secrets.token_urlsafe() in Python, gen_random_uuid() in PostgreSQL) e — comunque — abbina sempre un controllo di autorizzazione. Un id non prevedibile è una difesa in profondità, non un sostituto dell'autorizzazione.",
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
        "Le applicazioni moderne sono spesso composte da un frontend (React, Vue…) che chiama un backend REST o GraphQL. Le API espongono direttamente le risorse: GET /api/users/42, PUT /api/orders/1042, DELETE /api/files/9. Non c'è più una «pagina» a mediare: le risorse sono raggiungibili puntando semplicemente al giusto URL con il metodo HTTP giusto.\n\nQuesto amplifica il rischio: un attaccante può iterare le API con uno script molto più velocemente che navigando pagine. Inoltre le API sono spesso protette solo da un token Bearer, e chi ha rubato il token può passare qualunque id.\n\nIn questo task interroghi tu la finta API. Cambia l'id nell'endpoint e osserva la risposta JSON: dati personali, ruolo, permessi. In un backend ben progettato, l'endpoint controlla auth.uid() === requestedId (o un permesso equivalente) prima di rispondere.",
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
        "Molti sviluppatori pensano: «se il pulsante è disabilitato o nascosto quando l'utente non è admin, allora l'azione è sicura». Falso. Tutto ciò che gira nel browser è ispezionabile e modificabile: HTML, CSS, JavaScript, valore dei campi, header delle richieste.\n\nIn questo task un bottone «Elimina utente» è disabilitato per te. Spuntando la casella «Simula DevTools», il pulsante torna cliccabile — è esattamente ciò che farebbe un attaccante rimuovendo l'attributo disabled dall'HTML. Se il server non ricontrolla, l'azione viene eseguita.\n\nRegola d'oro: i controlli lato client servono all'usabilità (mostrare/nascondere pulsanti, validare campi in tempo reale). L'autorizzazione va sempre replicata sul server, che è l'unico ambiente sotto il tuo controllo.",
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
        "Le domande sono volutamente semplici e mettono a fuoco i principi chiave: cos'è un IDOR, dove si annida, come si difende. Se sbagli, torna al task corrispondente e rileggi la spiegazione — non c'è penalità nel riprovare.\n\nAl termine avrai un quadro completo di cosa cercare in una code review o in un pentest: URL con id, campi hidden, chiamate API, controlli solo lato client, id sequenziali.",
      hint: "Pensa a: dove va fatto il controllo? Come genero gli id? Di chi devo fidarmi?",
      explanation:
        "Le tre regole d'oro: autorizzazione server-side, id non prevedibili, mai fidarsi del client.",
      Simulation: Task10Quiz,
    },
  ],
};
