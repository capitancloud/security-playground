# Riscrittura slide 6 — "Codificare i caratteri: %2e%2e%2f" (Directory Traversal)

La slide attuale mescola troppe idee in poche frasi ("difesa ingenua", "camuffare", "il filtro guardava troppo presto"). La riscrivo in italiano semplice, spiegando passo per passo cosa succede tra filtro e sistema operativo.

## Testo proposto per la slide

- **Kicker**: invariato — `Task 05 · Primo bypass`
- **Titolo**: invariato — `Codificare i caratteri: %2e%2e%2f`
- **Body** (nuovo):
  > Alcuni server si difendono così: «se nel nome del file c'è `../`, blocco la richiesta». Sembra furbo, ma c'è un problema: nella URL i caratteri si possono scrivere in forma codificata. Il punto `.` diventa `%2e` e la barra `/` diventa `%2f`. Quindi `../` si può scrivere come `%2e%2e%2f`: per il filtro è una stringa innocua, ma quando il server la decodifica e apre il file, torna ad essere `../`.
- **Note** (nuovo callout):
  > Il filtro controlla la stringa prima di decodificarla, il sistema operativo la legge dopo. Regola generale: prima decodifica, poi controlla.
- **Bullets** (nuovi):
  - `%2e` = `.` e `%2f` = `/` → `../` diventa `%2e%2e%2f`
  - Il filtro vede una stringa innocua, il file system riceve `../`
  - Difesa corretta: decodifica e normalizza PRIMA di controllare
- **Accento e icona**: invariati (`danger`, `Repeat`)

## Dettagli tecnici

- Unico file modificato: `src/lib/scenarios/traversal/slides.ts` (slide con kicker "Task 05 · Primo bypass").
- Nessuna modifica a layout, route o altre slide.
