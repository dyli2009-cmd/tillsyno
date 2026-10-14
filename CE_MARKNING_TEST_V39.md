# CE TEST 39 – kopiera hel dörr med underskrifter och allt

## Ny funktion
- Varje dörr i CE-listan har en kompakt ⧉ Kopiera dörr-knapp, placerad bredvid redigera och ta bort.
- Formuläret öppnas med samma objektnummer, glasval, modell, fabrikat och placering som originalet, men föreslår nästa lediga dörrnummer för vald maskintyp. Alla värden kan ändras före skapande.
- Inget maskintypval/popup öppnas automatiskt.
- Kryss och egna ifyllnader kopieras till separat dörrdata; ändringar på kopian påverkar aldrig originalet.
- Användarens senaste förtydligande: kopiera ALLT inklusive både egna underskrifter per fält, signaturreferenser, kontrollpunkternas datum, dokumentstatus, genomgångna mappar, Klart-status, CE-skyltens bild, produktlista/PDF och dörrens särskilda verifieringsdata.
- Automatiknummer, maskinkod/modell/fabrikat och placering kommer från nya dörrens formulär; gamla identitetsfält återanvänds inte.
- Om originalets produktlista är manuellt genererad med produktrader skapas produktlistans PDF på nytt för den nya dörrens nummer och placering, men med samma produktrader.
- Kopian märks 'Kopia av [källans nummer] · kontrollera' i dörrlistan, för tydlig spårbarhet innan delning.
- Tidigare kopierade Klart-status och godkännande visas exakt enligt originalet på användarens uttryckliga begäran. Användaren påminns i UI att kontrollera nya dörrens CE-uppgifter innan utskick.

## Tester
- Provat två olika glasval och maskinkoder – formuläret föreslog nya separata nummer utan att öppna picker.
- Simulerad modul-kopiering med Riskanalys, Egenkontroll, Produktlista, projektunderskrift-referens, punktunderskrifter, CE-foto, status och Klart godkänt.
- Verifierat separata objektreferenser och att ändring i kopians kryss och produkttabell inte påverkar originalet.
- Testat att appgenererad produktlista byggs med nya dörrnumret.
- JavaScript-syntax och alla versionslänkar genomgångna.
- Praktiskt test av lokal/offline användning på iPhone/iPad och verklig PDF-export återstår.