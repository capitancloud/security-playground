import type { Scenario } from "../types";
import Task01Anatomy from "./tasks/Task01Anatomy";
import Task02Suspect from "./tasks/Task02Suspect";
import Task03Base64 from "./tasks/Task03Base64";
import Task04Concat from "./tasks/Task04Concat";
import Task05CharCode from "./tasks/Task05CharCode";
import Task06Xor from "./tasks/Task06Xor";
import Task07AiAnalysis from "./tasks/Task07AiAnalysis";
import Task08Behavior from "./tasks/Task08Behavior";
import Task09Inverse from "./tasks/Task09Inverse";
import Task10Quiz from "./tasks/Task10Quiz";
import { revengSlides } from "./slides";

export const reverseEngineeringScenario: Scenario = {
  id: "reverse-engineering",
  slug: "reverse-engineering",
  title: "Reverse Engineering (base)",
  subtitle: "Smonta uno script PowerShell malevolo e scrivi lo script che lo annulla",
  intro:
    "Il reverse engineering non è magia nera: è metodo. In questo modulo prendiamo un update.ps1 apparentemente innocuo trovato sul PC di un utente e lo smontiamo pezzo per pezzo. Impareremo a riconoscere le basi di PowerShell, a decodificare Base64 con -EncodedCommand, a superare tre livelli di offuscamento (concatenazione, char-code, XOR), a farci aiutare dall'AI con i prompt giusti, e infine a scrivere lo script di remediation che annulla gli effetti del malware. Tutto simulato dentro il browser: nessun codice viene realmente eseguito.",
  slides: revengSlides,
  difficulty: "Base",
  status: "available",
  tasks: [
    {
      id: "01-anatomia-powershell",
      title: "Anatomia di uno script PowerShell",
      goal: "Riconoscere commenti, variabili e cmdlet",
      brief:
        "Prima di attaccare un problema di reverse, bisogna saper leggere il linguaggio. Guardiamo lo script PowerShell più innocuo possibile: 'ciao mondo con la data di oggi'.",
      details:
        "**PowerShell** è il linguaggio nativo di amministrazione di Windows: ogni sistema Windows moderno lo porta con sé, ed è per questo che gli attaccanti lo amano — non serve installare nulla, lo strumento c'è già sulla macchina della vittima. Prima di analizzare uno script sospetto, dobbiamo saper leggere uno pulito. Le tre cose da riconoscere a colpo d'occhio:\n\n- **Comandi (cmdlet)** — hanno la forma `Verbo-Nome`: `Get-Date` (prendi la data), `Write-Host` (scrivi a schermo), `Set-ItemProperty` (modifica una proprietà). Il verbo ti dice cosa fa, il nome ti dice su cosa lo fa: questa convenzione rende PowerShell molto leggibile.\n- **Variabili** — iniziano sempre con `$`: `$now`, `$user`, `$path`. Sono contenitori di valori, come nella maggior parte dei linguaggi.\n- **Commenti** — iniziano con `#`: `# questo è un commento`. L'interprete li ignora; servono solo a chi legge lo script.\n\nNel task lo script fa tre semplicissime cose in sequenza: mette la data di oggi dentro una variabile, costruisce un messaggio, e lo scrive a schermo. Leggilo riga per riga e collega ogni riga a una delle tre categorie. Non serve eseguire nulla: ti basta **leggere**.\n\nPerché partiamo da qui? Perché nel prossimo task vedrai uno script che finge di essere un aggiornamento di Windows: per capire perché è falso, devi prima sapere com'è fatto uno script vero.",
      hint: "Cerca la forma Verbo-Nome nei nomi dei comandi.",
      explanation:
        "La convenzione Verbo-Nome è imposta da PowerShell stesso: rende ogni cmdlet indovinabile e ogni script leggibile — anche quando l'autore fa di tutto per non farsi capire.",
      Simulation: Task01Anatomy,
    },
    {
      id: "02-file-sospetto",
      title: "Il file sospetto",
      goal: "Individuare gli indicatori d'allarme in un launcher PowerShell",
      brief:
        "Un utente ci porta update.ps1 trovato nei Download. Il file sembra un aggiornamento, ma qualcosa non torna: guardalo e individua il segnale d'allarme.",
      details:
        "Siamo nella fase che gli analisti chiamano **triage**: non serve capire tutto lo script, serve decidere se merita un'analisi a fondo. Un buon triage si fa in pochi minuti, guardando gli elementi più rivelatori.\n\nIndicatori tipici di uno script malevolo:\n\n- `-EncodedCommand` seguito da un blob Base64 lungo — l'attaccante nasconde il comando vero dentro una codifica illeggibile. Un aggiornamento legittimo raramente ha bisogno di 400+ caratteri senza senso.\n- `-WindowStyle Hidden` — nasconde la finestra. Un aggiornamento vero non deve nascondersi: l'utente deve poterlo vedere lavorare.\n- `-ExecutionPolicy Bypass` — aggira la policy di sicurezza di PowerShell, impostata proprio per proteggere l'utente da script non firmati.\n- Chiamate a **IP grezzi** (come `http://185.x.x.x`) invece che a un dominio con nome — i server di comando e controllo spesso non hanno un dominio.\n- Uso di `Invoke-Expression` o `Net.WebClient` — eseguire stringhe arbitrarie e scaricare file da internet sono le due azioni preferite del malware.\n\nOgnuno di questi, preso da solo, ha usi legittimi: uno sviluppatore può usare `-EncodedCommand` per evitare problemi di apici, uno script di deploy può scaricare file. **La combinazione** (Encoded + Hidden + Bypass) è invece un pattern che l'industria considera quasi sempre malevolo — al punto che regole Sigma pubbliche allertano su questa combinazione esatta.\n\nNel task devi solo trovare l'indicatore che spicca in update.ps1. Clicca sull'elemento giusto: sta imparando a guardare come guarda un analista.",
      hint: "Un launcher legittimo raramente ha bisogno di 400+ caratteri di Base64.",
      explanation:
        "Ognuno di questi indicatori, preso da solo, ha usi legittimi. Combinati insieme (Encoded + Hidden + Bypass) sono un pattern che l'industria considera quasi sempre malevolo — al punto che regole Sigma pubbliche allertano su questa combinazione esatta.",
      Simulation: Task02Suspect,
    },
    {
      id: "03-base64",
      title: "Decodifica Base64 (-EncodedCommand)",
      goal: "Ricavare il vero payload dal blob Base64",
      brief:
        "Il blob dopo -EncodedCommand è Base64 di una stringa Unicode. Decodificalo e leggi cosa fa davvero lo script.",
      details:
        "Prima cosa da chiarire: **Base64 non è crittografia**. È solo un modo diverso di scrivere gli stessi dati — come scrivere una parola al contrario. Chiunque può tornare indietro, senza chiavi né segreti. Esiste per trasportare dati binari o testi con caratteri speciali attraverso canali che accettano solo lettere e numeri semplici.\n\nPowerShell usa `-EncodedCommand` proprio per questo: accettare comandi da riga di comando senza problemi di apici e caratteri speciali. Dettagli importanti:\n\n- La codifica attesa è **Base64 di una stringa UTF-16 Little Endian** (non ASCII): PowerShell lavora internamente in Unicode, quindi due byte per ogni carattere.\n- Se decodifichi il blob come se fosse ASCII, vedrai testo «strappato», con caratteri nulli in mezzo alle lettere — è normale, e ti conferma solo che stai guardando davvero `-EncodedCommand`.\n- Il comando reale è quasi sempre in **chiaro dopo la decodifica**: qui l'attaccante non ha cifrato nulla, ha solo codificato. Rimuovi la codifica e leggi.\n\nPer questo decodificare Base64 è **la prima operazione** in qualsiasi triage di uno script PowerShell malevolo: rimuove il velo minimo e rivela di solito il 90% dell'intento. Nel task incolli (o clicchi) il blob, premi decodifica e leggi con i tuoi occhi cosa fa lo script — per la prima volta il malware smette di essere una scatola nera.",
      hint: "In PowerShell: [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($b))",
      explanation:
        "Decodificare Base64 è la prima operazione in qualsiasi triage di uno script PowerShell malevolo: rimuove il velo minimo e rivela di solito 90% dell'intento.",
      Simulation: Task03Base64,
    },
    {
      id: "04-concatenazione",
      title: "Offuscamento — concatenazione di stringhe",
      goal: "Ricomporre il nome di cmdlet spezzato in più stringhe",
      brief:
        "Non tutti i malware usano Base64. Alcuni spezzano il nome dei cmdlet in tanti pezzi per eludere le firme testuali.",
      details:
        "Il primo livello di offuscamento è anche il più semplice da capire: spezzare una stringa in tanti pezzi e incollarla al momento dell'esecuzione. PowerShell, infatti, risolve una variabile che contiene `'Invoke-Expression'` esattamente come il nome scritto per intero — per l'interprete sono la stessa identica cosa.\n\nEsempio tipico:\n\n- L'attaccante scrive: `('In' + 'vo' + 'ke-Ex' + 'pre' + 'ssion')`\n- PowerShell somma i pezzi e la risolve come `Invoke-Expression`\n- Un antivirus che cerca la stringa letterale `Invoke-Expression` nel file **non trova nulla**: nel testo c'è solo `In`, `vo`, `ke-Ex`, `pre`, `ssion`\n\nQuesta tecnica si chiama eludere le **firme statiche**: i sistemi di sicurezza spesso cercano stringhe note dentro i file, e se la stringa è spezzata la ricerca fallisce. Per l'occhio umano, invece, è quasi trasparente: leggi i pezzi e sommali a mente, come rimettere insieme una parola tagliata con le forbici.\n\nE perché `Invoke-Expression` è così critico? Perché è il comando che **esegue una stringa come se fosse codice**: è la porta d'ingresso che permette a tutto il resto — un URL scaricato, un payload decodificato — di trasformarsi in azione sulla macchina. Ogni volta che lo incontri in uno script sospetto, quella è la riga da capire per prima.\n\nLa difesa è la stessa arma dell'attaccante: **normalizza lo script** (rimuovi concatenazioni, spazi, alias) prima di cercare pattern. Molti EDR moderni lo fanno automaticamente prima della detection.",
      hint: "Somma le stringhe a mente: In + vo + ke-Ex + pre + ssion.",
      explanation:
        "La difesa è la stessa dell'attaccante: normalizza lo script (rimuovi concatenazioni, spazi, alias) prima di cercare pattern. Molti EDR moderni lo fanno automaticamente prima della detection.",
      Simulation: Task04Concat,
    },
    {
      id: "05-char-code",
      title: "Offuscamento — array di char code",
      goal: "Ricostruire stringhe da array di byte ASCII",
      brief:
        "Un gradino più su: al posto di concatenare pezzi di stringa, l'attaccante scrive i codici ASCII dei caratteri. È illeggibile a colpo d'occhio, ma matematicamente banale.",
      details:
        "Secondo livello: al posto di pezzi di stringa, solo numeri. Ogni carattere ha un codice numerico nella **tabella ASCII**: la lettera `I` è il numero 73, la `n` è 110, la `v` è 118, e così via. È una corrispondenza fissa e pubblica da decenni — nessun segreto, solo una tabella di conversione.\n\nIn PowerShell:\n\n- `[char[]](73,110,118,...)` trasforma la lista di numeri in un array di caratteri\n- `-join ''` incolla tutti i caratteri in una stringa unica\n\nEsempio concreto: `73 → 'I'`, `110 → 'n'`, `118 → 'v'`, `111 → 'o'`, `107 → 'k'`, `101 → 'e'`... = `Invoke`. Ricomposta il resto nello stesso modo nel task: clicca ogni numero e guarda la lettera apparire, oppure usa la tabella che la simulazione ti mette a disposizione.\n\nPerché un attaccante preferisce i numeri alle stringhe spezzate? Perché una firma che cerca `Invoke` come **stringa** non trova nulla: nel file non c'è alcuna lettera, solo cifre. È illeggibile a colpo d'occhio, ma banale da decodificare: bastano un paio di clic in JavaScript, Python o CyberChef — e in questo task, direttamente nel browser.\n\nQuesta tecnica è amata anche dalle famiglie APT: l'output finale è lo stesso `Invoke-Expression`, ma le firme statiche cercano **stringhe**, non aritmetica.",
      hint: "73 = 'I', 110 = 'n'. Segui la tabella ASCII.",
      explanation:
        "Questa tecnica è amata anche dalle famiglie APT: l'output finale è lo stesso Invoke-Expression, ma le firme statiche cercano stringhe, non aritmetica.",
      Simulation: Task05CharCode,
    },
    {
      id: "06-xor",
      title: "Offuscamento — XOR con chiave singola",
      goal: "Trovare la chiave che decifra il payload",
      brief:
        "L'attaccante ha cifrato l'URL di comando-controllo con uno XOR a byte singolo. Tocca a te trovare la chiave giusta.",
      details:
        "Terzo livello: XOR. Immagina di prendere ogni lettera del messaggio e di «mescolarla» con un numero segreto, che si chiama **chiave**. Il risultato è una fila di simboli senza senso, che sembra rumore casuale.\n\nPerché è debole? Perché la mescolanza si può annullare: se applichi di nuovo la stessa chiave al testo mescolato, il messaggio torna in chiaro, esattamente com'era prima. E in questo caso la chiave è **un solo numero** che va da 1 a 255: le possibilità sono poche, quindi si possono provare tutte, una alla volta, finché non appare il testo leggibile. Bastano circa **127 tentativi** in media per trovarla — e un computer li fa in un batter d'occhio.\n\nC'è anche una scorciatoia ancora più furba: se conosci un pezzo del testo in chiaro, ne bastano **zero**. In questo task sai già che il messaggio nascosto è un URL di comando e controllo, quindi inizia sicuramente con `http://`: la chiave che rende visibile quel pezzo è quella giusta. Questa tecnica si chiama **attacco con testo noto** ed è uno standard dell'analisi.\n\nNel task lo farai con le tue mani: muovi lo slider e guarda il testo apparire appena arrivi al numero giusto. Nonostante la debolezza, questa tecnica si vede ancora in molti sample reali, proprio perché è sufficiente a ingannare le firme statiche.\n\nStrumenti come **CyberChef** eseguono un brute-force di tutte le chiavi in un istante. La chiave che produce il testo **più leggibile** (entropia più bassa, più simile a inglese o a un URL) è quella giusta.",
      hint: "Sposta lo slider finché il testo diventa un URL leggibile.",
      explanation:
        "Nel mondo reale strumenti come CyberChef eseguono un brute-force di tutte le chiavi in un istante. La chiave che produce il testo più 'entropico-basso' (più simile a inglese/URL) è quella giusta.",
      Simulation: Task06Xor,
    },
    {
      id: "07-analisi-ai",
      title: "Analisi con AI: fare la domanda giusta",
      goal: "Ottenere dall'AI un'analisi utile e strutturata",
      brief:
        "L'AI accelera il reverse engineering, ma solo se le poni una domanda mirata. Scegli il prompt che ti darebbe un'analisi davvero utile.",
      details:
        "A questo punto hai decodificato e ricostruito il payload: è il momento di far leggere il codice all'AI. L'AI è eccellente in questo compito — legge velocemente, conosce migliaia di pattern di malware, non si stanca mai. Ma la qualità della risposta dipende quasi interamente dalla **qualità della domanda**.\n\nUn **prompt di analisi malware efficace** chiede tre cose esplicite:\n\n1. Cosa fa lo script **passo per passo** — la sequenza di azioni, non un riassunto vago: cosa tocca, cosa scarica, cosa esegue, dove si nasconde.\n2. Quali **IoC** (Indicators of Compromise) lascia — le tracce misurabili che si possono cercare su altre macchine: chiavi di registro, file creati, indirizzi IP e dominii contattati, hash dei file.\n3. Quali **contromisure** applicare — come rimuovere la persistenza, cosa bloccare, cosa verificare dopo la pulizia.\n\nDomande vaghe come «questo script è pericoloso?» portano a risposte vaghe: sì, è pericoloso, e stop. Domande precise portano a un elenco strutturato che puoi usare davvero in un incidente.\n\nUn secondo vantaggio del prompt buono: chiedendo l'output **strutturato** (elenchi puntati, categorie), la risposta è facilmente verificabile riga per riga — e la verifica è il passo successivo.\n\nL'AI qui non sostituisce l'analista: gli fa da collega junior instancabile. La **responsabilità della verifica resta tua** — soprattutto sugli IoC, che devono essere validati contro il payload reale.",
      hint: "Il buon prompt nomina esplicitamente comportamento, IoC e contromisure.",
      explanation:
        "L'AI qui non sostituisce l'analista: gli fa da collega junior instancabile. La responsabilità della verifica resta tua — soprattutto sugli IoC, che devono essere validati contro il payload reale.",
      Simulation: Task07AiAnalysis,
    },
    {
      id: "08-comportamento",
      title: "Cosa fa davvero lo script?",
      goal: "Selezionare solo i comportamenti presenti nel payload",
      brief:
        "Ora che hai decodificato e analizzato, mettiamo alla prova la tua comprensione: quali comportamenti sono effettivamente nello script, e quali sono solo supposizioni?",
      details:
        "La disciplina del reverse engineering è ferrea, e questo task la mette in pratica: davanti a un elenco di comportamenti, devi selezionare **solo quelli dimostrabili nel codice**.\n\nLe regole:\n\n- Si riporta **ciò che il codice fa**, non ciò che «potrebbe» fare. Se il payload scarica un file, puoi dire che scarica; non puoi dire che cifra i documenti dell'utente, anche se «i malware spesso lo fanno».\n- Ogni riga di un incident report deve poter essere puntata a un **artefatto osservabile**: una riga specifica del payload, un file, una chiave di registro, un indirizzo IP. Se non puoi indicare l'artefatto, quella riga non va nel report.\n- Aggiungere comportamenti non dimostrati porta a IoC sbagliati — blocchi inutili, false allerte — e a report che perdono credibilità proprio quando servono di più.\n\nUn trucco pratico per il task: rileggi il payload decodificato del task 3 (lo puoi riaprire) e, per ogni voce dell'elenco, chiediti «in quale riga del codice vedo questa azione?». Se trovi la riga, è un fatto. Se non la trovi, è una supposizione — anche se plausibile.\n\nDistinguere **fatto** da **supposizione** è la differenza tra un report tecnico e un pettegolezzo.",
      hint: "Rileggi il payload decodificato del task 3 e attieniti a quello.",
      explanation:
        "Distinguere fatto da supposizione è la differenza tra un report tecnico e un pettegolezzo. Ogni riga di un incident report deve poter essere puntata a un artefatto osservabile.",
      Simulation: Task08Behavior,
    },
    {
      id: "09-script-inverso",
      title: "Scrivi lo script inverso (remediation)",
      goal: "Comporre un .ps1 che annulla la persistenza",
      brief:
        "Il capolavoro finale: scrivi tu lo script che, eseguito sull'host compromesso, elimina la chiave di registro e ripulisce %TEMP%.",
      details:
        "Arrivati qui conosci lo script malevolo riga per riga: tocca il capolavoro finale, scrivere lo script che **annulla** i suoi effetti. È la fase che nei processi aziendali si chiama **remediation** (bonifica), ed è il momento in cui l'analisi si trasforma in azione.\n\nUno **script di remediation** buono ha tre caratteristiche:\n\n- **Idempotente** — puoi lanciarlo N volte senza effetti collaterali: se la chiave di registro non c'è più, il secondo giro non deve creare errori né danni. Questo è fondamentale in ambienti con centinaia di macchine, dove lo script gira in orari diversi e più volte.\n- **Silenzioso** in caso di «niente da fare» — usa `-ErrorAction SilentlyContinue` sui cmdlet di rimozione: un elemento già assente non è un problema, e non deve bloccare lo script né riempire di errori i log.\n- **Chirurgico** — tocca solo ciò che il malware ha creato, nient'altro. Rimuovi la chiave di registro esatta e il file esatto in %TEMP%: cancellare «a mano larga» rischia di romere componenti di sistema legittimi.\n\nI cmdlet chiave: `Remove-ItemProperty` per eliminare il valore di persistenza nel registro (la voce Run che rilanciava lo script a ogni avvio) e `Remove-Item` per cancellare il dropper in %TEMP%.\n\nIn un incident reale, questo `.ps1` viene distribuito via **GPO / Intune / MDM** a tutti gli host colpiti. Averlo pronto in fretta è la differenza tra **20 minuti** di outage e **due settimane** di contenimento manuale.",
      hint: "Remove-ItemProperty per il valore del registro, Remove-Item per il file in %TEMP%.",
      explanation:
        "In un incident reale, questo .ps1 viene distribuito via GPO / Intune / MDM a tutti gli host colpiti. Averlo pronto in fretta è la differenza tra 20 minuti di outage e due settimane di contenimento manuale.",
      Simulation: Task09Inverse,
    },
    {
      id: "10-quiz",
      title: "Quiz finale",
      goal: "Consolidare i concetti chiave del modulo",
      brief:
        "Dieci domande per fissare il metodo di reverse engineering che hai appena praticato.",
      details:
        "Ultimo passo del modulo: dieci domande che ripercorrono tutto il cammino, dallo script pulito alla bonifica. Nessuna domanda richiede memorizzazione fine: se hai fatto i task con attenzione, le risposte le hai già viste con i tuoi occhi.\n\nLe domande ripercorrono l'intero modulo:\n\n- **Anatomia di PowerShell** — la forma `Verbo-Nome`, variabili e commenti: il vocabolario minimo per leggere qualsiasi script.\n- **Tecniche di offuscamento** — Base64 con `-EncodedCommand`, concatenazione di stringhe, array di char code, XOR con chiave singola: riconoscerle e sapere perché non bastano a nascondere il codice.\n- **Uso dell'AI** — cosa chiedere (comportamento, IoC, contromisure) e perché la verifica resta responsabilità tua.\n- **IoC e remediation** — distinguere fatto da supposizione, e come deve essere fatto uno script di bonifica: idempotente, silenzioso, chirurgico.\n\nPuoi ripetere il quiz quante volte vuoi: si completa solo con **10/10**. Se sbagli una domanda, la spiegazione ti riporta al task in cui hai incontrato quel concetto — rileggilo e riprova.",
      hint: "Ogni risposta corretta la trovi in uno dei task precedenti.",
      explanation: "Domande finali su PowerShell, offuscamento, IoC e remediation.",
      Simulation: Task10Quiz,
    },
  ],
};
