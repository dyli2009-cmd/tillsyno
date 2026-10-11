# SmartMatch TEST v36.73 – separat egenkontroll, gul fokusmarkering och justerbar pil

2026-10-11. Endast fristående SmartMatch TEST-webb. Ordinarie Kontrollflöde och native iOS/TestFlight orörda.

Varje fysisk automatik har en egen intern ID-nyckel och egna checkobjekt. Dubbel ID-kollision vid PDF-återläsning/ny DA får eget unikt internt suffix baserat på sida/koordinat; tryckt märkningsnummer ändras inte. Den äldre identifieringsvägen får inte längre kopiera checklistan från en annan fysiskt åtskild automatik med samma tryckta ID. Endast exakt intern identitet eller identiskt ID på samma sida och nära samma fysiska position återanvänder tidigare kontroll.

Tryck på vald DA gör bara dess egen checklista aktiv. Ett kontrollresultat eller Godkänn alla får inte ändra en annan DA. Checklistan serialiseras separat till projekt-PDF. Tidigare eventuellt redan felaktigt dubblerad historisk status raderas inte; berörda gamla poster behöver kontrolleras manuellt.

Gul ram visas runt den aktuellt valda automatiken; ett tryck på ritningen utanför en DA/aktivt pilhandtag tar bort fokus. Justera pil är åter i sidomenyn för varje DA och via knappen vid val av DA på ritningen. När GS saknas måste man koppla GS först. Ett pilhandtag på GS-kanten kan dras utan att ändra automatiska matchningsregler eller checklistan.

Tekniska kontroller: JS-syntax, entydiga HTML-ID och versionsreferenser, syntetiskt test med 3 fysiska automatiker varav två samma interna ID och gemensamt inkommande checkobjekt. Ändring i första påverkade inte andra. Fysisk iPhone/iPad och användarens riktiga PDF ej provad. v36.72 kvar för återgång.
