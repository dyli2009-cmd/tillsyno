# SmartMatch TEST v36.56 – valfritt filnamn

2026-10-11. Sparrutorna för Projekt-PDF och batch Protokoll har ett Filnamn-fält, förvalt med befintligt filnamn. Användaren kan behålla eller ändra namnet före Spara fil/Skicka mejl. Det valda namnet används när File skapas, vilket bevarar direkt användargest för iOS-delning; ingen PDF-ombyggnad behövs efter namnändringen. .pdf läggs till exakt en gång. Svenska tecken och mellanslag bevaras; ogiltiga sökvägs-/filnamnstecken ersätts med bindestreck. Tomt fält återgår till standardnamnet. Protokollurvalets ombyggnad skriver inte över ett namn som användaren redan redigerat.

Verifierat JS-syntax, standard/egna/svenska filnamn, tomt namn, normaliserad .pdf och ogiltiga tecken. Fasta HTML identisk med versionerad HTML, unika DOM-ID:n och versionsreferenser kontrollerade. Fysisk iPhone/Dropbox-test återstår. Mobilstabilitetsändringen från v36.55 kvar. Endast SmartMatch TEST; äldre versioner bevarade.
