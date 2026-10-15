# CE TEST 58 – Projektvyn, automatisk historik och borttagningsfråga

- Aktivt CE-projekt autosparas fortsatt i IndexedDB till `active` efter ca 250 ms.
- Historiken får automatiskt en enda uppdaterbar post **per projekt**, efter 15 sekunders inaktivitet, vid återöppning och när projektet stängs/byts. Inga nya historikversioner per tangenttryck eller varje byte. Gamla manuella versioner bevaras.
- Ny diskret **X över Projektuppgifter** stänger vyn säkert och går tillbaka till projektväljaren utan att radera projektet. Där finns Fortsätt, Öppna projekt-PDF, Nytt projekt och Sparade projekt.
- Projektmenyn är städad: Spara PDF, Skicka projekt, Öppna PDF och Sparade projekt. "Spara lokalt", "Stäng projekt" och "Nytt projekt" är borttagna från den menyn.
- Vid **Ta bort** i Sparade projekt visas fråga i själva raden med två knappar Ta bort / Avbryt, inte webbläsarens `window.confirm`. Om aktivt automatiskt sparat projekt tas bort med ett uttryckligt ja tas även den lokala aktiva kopian bort.
- Lokal DB, mallar, PDF-export, dörrlogik och gamla historikposter behålls.

QA: JS-syntax, element-ID:n, knappar, versionsreferenser, service worker. Prova användarflödet med ett testsparat projekt på iPad innan skarpa projekt.
