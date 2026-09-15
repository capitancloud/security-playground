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
        "Ogni riga del database ha un **identificatore univoco**. Quando apri una pagina, il server riceve quell'id, cerca la riga e te la mostra.\n\nIn questo primo task **non c'è nessun attacco**: alleniamo solo l'occhio a riconoscere il pattern.\n\nDove trovi gli id nel mondo reale:\n\n- Nella barra dell'URL: `/orders/1042`\n- Nei parametri di query: `?id=42`\n- Nei cookie e nell'header `Authorization`\n- Nei campi hidden dei form\n- Nei body JSON delle chiamate API",
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
        "Questo è il cuore della vulnerabilità **IDOR** (Insecure Direct Object Reference). L'app si fida del fatto che tu chieda solo il tuo ordine, senza mai verificarlo.\n\nCome si sfrutta:\n\n1. Sei loggato come cliente e vedi il tuo ordine `1042`.\n2. Nella barra dell'URL sostituisci `1042` con `1043`, `1044`, `1045`.\n3. Se il server non controlla la proprietà, ti mostra dati di altri: nome, indirizzo, importo, carta.\n\nNel mondo reale l'attaccante non si ferma a un id: usa uno script per iterare **tutti** i valori (tecnica chiamata *enumeration* o *ID fuzzing*) e in pochi minuti scarica l'intero database ordini.",
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
        "Qui sei nella condizione tipica di un attaccante reale: parti da un id che conosci (il tuo, vicino a `9040`) e provi quelli vicini finché non trovi qualcosa di interessante.\n\nCosa c'è in gioco in ogni fattura:\n\n- Intestatario e indirizzo\n- Importo\n- IBAN\n\nOgni fattura visualizzata è una **potenziale violazione di dati personali**. In Europa: violazione GDPR sanzionabile fino al 4% del fatturato annuo.\n\nMorale: usare id sequenziali su risorse sensibili è un errore di design. Anche con autorizzazione perfetta, esporre id incrementali rivela metadati (quanti ordini fai, quanto cresce il servizio). Meglio identificatori opachi.",
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
        "Un IDOR non serve solo a leggere dati altrui: può portare a **privilege escalation**, cioè guadagnare privilegi che non ti spettano.\n\nQuando gli id sono numerici e sequenziali, l'id `1` è quasi sempre il primo account creato durante l'installazione — tipicamente l'amministratore.\n\nCosa fai:\n\n1. Sei loggato come utente `42` (utente normale).\n2. Cambi `/profile/42` in `/profile/1`.\n3. Se l'app non controlla il ruolo, vedi dati riservati: permessi admin, token, chiavi API.\n\nQuesto scenario combina due errori: **mancanza di autorizzazione** + **prevedibilità dell'id**. Basta rimuoverne uno per ridurre drasticamente il rischio.",
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
        "Molte applicazioni servono file (PDF, immagini, allegati) tramite endpoint tipo `/download?doc=42`. Sono un bersaglio comune di IDOR perché lo sviluppatore pensa: «tanto il link glielo mando io per email, nessuno indovinerà l'id». È un ragionamento sbagliato: la *security through obscurity* non è sicurezza.\n\nCosa fai:\n\n- Vedi un elenco di documenti pubblici.\n- Cambi l'id nell'URL per chiedere documenti fuori elenco.\n- Alcuni sono marcati come «Riservato» — non dovresti aprirli, ma il server non verifica.\n\nCasi reali noti — Facebook, Verizon, First American — sono partiti tutti proprio da un id incrementale in un URL di download.",
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
        "Fino a qui abbiamo giocato con la barra degli indirizzi. Ma un attaccante può modificare **qualunque parte** di una richiesta HTTP con strumenti come DevTools, Burp Suite o curl:\n\n- Header e cookie\n- Body JSON\n- Campi hidden dei form\n\nIn questo task il form contiene un campo nascosto `userId=42` (il tuo). Il server dovrebbe ignorarlo e prendere l'id dalla sessione. Se invece si fida del valore inviato, puoi cambiare la password di un altro utente semplicemente riscrivendo quel campo.\n\n**Regola d'oro: «Never trust the client».** Ogni dato che identifica *chi* sta agendo deve venire dal token di sessione lato server, mai da un input dell'utente.",
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
        "«Usiamo UUID, siamo al sicuro». **Non sempre.**\n\nUn UUID (Universally Unique Identifier) è sicuro solo se generato con una fonte casuale crittograficamente forte. Esistono UUID di tipo 1 (basati su timestamp + MAC address) e implementazioni improprie in cui la parte finale è un contatore.\n\nIl caso in questo task:\n\n- I voucher sembrano casuali: `VCR-8F3A-...-0001`\n- In realtà solo le **ultime 4 cifre** cambiano, ed è un contatore.\n- Se il tuo voucher finisce con `0001`, il prossimo utente ha `0002`, e così via.\n\nRegola: usa generatori dichiaratamente sicuri (`crypto.randomUUID()`, `secrets.token_urlsafe()`, `gen_random_uuid()`) e comunque **abbina sempre un controllo di autorizzazione**. Un id non prevedibile è una difesa in profondità, non un sostituto.",
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
        "Le app moderne hanno un frontend (React, Vue…) che chiama un backend REST o GraphQL. Le API espongono direttamente le risorse:\n\n- `GET /api/users/42`\n- `PUT /api/orders/1042`\n- `DELETE /api/files/9`\n\nNon c'è più una «pagina» a mediare: puntando al giusto URL con il metodo HTTP giusto, si arriva subito alla risorsa. Questo **amplifica** il rischio, perché uno script itera le API molto più velocemente di quanto un umano navighi pagine.\n\nCosa fai nel task:\n\n1. Interroghi la finta API.\n2. Cambi l'id nell'endpoint.\n3. Osservi la risposta JSON: dati personali, ruolo, permessi.\n\nUn backend ben progettato controlla `auth.uid() === requestedId` (o un permesso equivalente) **prima** di rispondere.",
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
        "Molti pensano: «se il pulsante è disabilitato quando l'utente non è admin, l'azione è sicura». **Falso.**\n\nTutto ciò che gira nel browser è ispezionabile e modificabile:\n\n- HTML e CSS\n- JavaScript in esecuzione\n- Valore dei campi\n- Header delle richieste\n\nCosa fai nel task:\n\n1. Il bottone «Elimina utente» è disabilitato per te.\n2. Spunti «Simula DevTools» → il pulsante torna cliccabile.\n3. È lo stesso effetto di rimuovere l'attributo `disabled` dall'HTML.\n4. Se il server non ricontrolla, l'azione parte comunque.\n\n**Regola:** i controlli lato client servono all'usabilità (mostrare/nascondere pulsanti, validazione in tempo reale). L'autorizzazione va sempre replicata sul server.",
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
        "Le domande sono volutamente semplici e mettono a fuoco i principi chiave: cos'è un IDOR, dove si annida, come si difende.\n\nSe sbagli, torna al task corrispondente e rileggi la spiegazione — si può riprovare senza problemi.\n\nAl termine avrai un quadro completo di cosa cercare in una code review o in un pentest:\n\n- URL con id\n- Campi hidden nei form\n- Chiamate API\n- Controlli solo lato client\n- Id sequenziali",
      hint: "Pensa a: dove va fatto il controllo? Come genero gli id? Di chi devo fidarmi?",
      explanation:
        "Le tre regole d'oro: autorizzazione server-side, id non prevedibili, mai fidarsi del client.",
      Simulation: Task10Quiz,
    },
  ],
};
