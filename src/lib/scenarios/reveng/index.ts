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
        "**PowerShell** è il linguaggio nativo di amministrazione di Windows. Le tre cose che devi riconoscere a colpo d'occhio:\n\n- **Comandi (cmdlet)** — hanno la forma `Verbo-Nome`: `Get-Date`, `Write-Host`, `Set-ItemProperty`\n- **Variabili** — iniziano con `$`: `$now`, `$user`\n- **Commenti** — iniziano con `#`: `# questo è un commento`\n\nSono queste tre cose che ti servono per non essere in balia dello script sospetto del prossimo task.",
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
        "Nel triage iniziale non serve capire tutto: serve decidere se lo script va analizzato a fondo.\n\nIndicatori tipici di uno script malevolo:\n\n- `-EncodedCommand` con un blob Base64 lungo\n- `-WindowStyle Hidden` per nascondere la finestra\n- `-ExecutionPolicy Bypass` per aggirare le policy\n- Chiamate a IP grezzi (senza dominio)\n- Uso di `Invoke-Expression` o `Net.WebClient`\n\nOgnuno di questi, preso da solo, ha usi legittimi. **La combinazione** (Encoded + Hidden + Bypass) è un pattern che l'industria considera quasi sempre malevolo — al punto che regole Sigma pubbliche allertano su questa combinazione esatta.",
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
        "PowerShell usa `-EncodedCommand` per accettare comandi da riga di comando senza problemi di escaping.\n\nDettagli importanti:\n\n- La codifica attesa è **Base64 di una stringa UTF-16 Little Endian** (non ASCII).\n- Se decodifichi come ASCII vedrai testo «strappato» — normale, conferma che stai guardando `-EncodedCommand`.\n- Il comando reale è quasi sempre in chiaro **dopo** la decodifica.\n\nDecodificare Base64 è **la prima operazione** in qualsiasi triage di uno script PowerShell malevolo: rimuove il velo minimo e rivela di solito il 90% dell'intento.",
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
        "PowerShell risolve una variabile che contiene `'Invoke-Expression'` esattamente come il nome scritto per intero.\n\nEsempio tipico:\n\n- L'attaccante scrive: `('In' + 'vo' + 'ke-Ex' + 'pre' + 'ssion')`\n- PowerShell la risolve come `Invoke-Expression`\n- Un antivirus che cerca la stringa letterale `Invoke-Expression` **non trova nulla**\n\nLa difesa è la stessa arma dell'attaccante: **normalizza lo script** (rimuovi concatenazioni, spazi, alias) prima di cercare pattern. Molti EDR moderni lo fanno automaticamente prima della detection.",
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
        "In PowerShell:\n\n- `[char[]](73,110,...)` trasforma una lista di numeri in un array di caratteri\n- `-join ''` li unisce in una stringa unica\n\nEsempio: `73 → 'I'`, `110 → 'n'`, `118 → 'v'`... = `Invoke`.\n\nÈ illeggibile a colpo d'occhio, ma banale da decodificare: bastano un paio di clic in JavaScript, Python o CyberChef.\n\nQuesta tecnica è amata anche dalle famiglie APT: l'output finale è lo stesso `Invoke-Expression`, ma le firme statiche cercano **stringhe**, non aritmetica.",
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
        "**XOR con chiave singola** è pigro:\n\n- Bastano circa **127 tentativi** per decifrarlo (una chiave per ogni valore possibile).\n- Se conosci un pezzo del testo in chiaro, ne bastano **zero**: in questo caso l'URL inizia sicuramente con `http://`.\n\nNonostante questo, si vede ancora in molti sample reali.\n\nStrumenti come **CyberChef** eseguono un brute-force di tutte le chiavi in un istante. La chiave che produce il testo **più leggibile** (entropia più bassa, più simile a inglese o a un URL) è quella giusta.",
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
        "Un **prompt di analisi malware efficace** chiede tre cose esplicite:\n\n1. Cosa fa lo script **passo per passo**\n2. Quali **IoC** (Indicators of Compromise) lascia — registro, file, rete\n3. Quali **contromisure** applicare\n\nDomande vaghe come «è pericoloso?» portano a risposte vaghe.\n\nL'AI qui non sostituisce l'analista: gli fa da collega junior instancabile. La **responsabilità della verifica resta tua** — soprattutto sugli IoC, che devono essere validati contro il payload reale.",
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
        "La disciplina del reverse engineering è ferrea:\n\n- Si riporta **ciò che il codice fa**, non ciò che «potrebbe» fare.\n- Ogni riga di un incident report deve poter essere puntata a un **artefatto osservabile**.\n- Aggiungere comportamenti non dimostrati porta a IoC sbagliati e a report che perdono credibilità.\n\nDistinguere **fatto** da **supposizione** è la differenza tra un report tecnico e un pettegolezzo.",
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
        "Uno **script di remediation** buono ha tre caratteristiche:\n\n- **Idempotente** — puoi lanciarlo N volte senza effetti collaterali\n- **Silenzioso** in caso di «niente da fare» — usa `-ErrorAction SilentlyContinue`\n- **Chirurgico** — tocca solo ciò che il malware ha creato, nient'altro\n\nIn un incident reale, questo `.ps1` viene distribuito via **GPO / Intune / MDM** a tutti gli host colpiti. Averlo pronto in fretta è la differenza tra **20 minuti** di outage e **due settimane** di contenimento manuale.",
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
        "Le domande ripercorrono l'intero modulo:\n\n- Anatomia di PowerShell\n- Tecniche di offuscamento (Base64, concat, char-code, XOR)\n- Uso dell'AI\n- IoC e remediation\n\nPuoi ripetere il quiz quante volte vuoi: si completa solo con **10/10**.",
      hint: "Ogni risposta corretta la trovi in uno dei task precedenti.",
      explanation: "Domande finali su PowerShell, offuscamento, IoC e remediation.",
      Simulation: Task10Quiz,
    },
  ],
};
