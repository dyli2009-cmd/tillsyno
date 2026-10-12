# SmartMatch SLR TEST v36.115 – rätt automatik vid dörrbyte

Användaren rapporterade att en annan dörrautomatik visade föregående dörrs beteckning och ifyllda riskval/datum/signatur. En ny fysisk dörr ska ha egen identitet och tomma kontrollsvar; kopiering mellan liknande dörrar ska tas senare.

## Orsak och rättning
SLR-open bytte aktiv automatik och dokumentlistan, men rensade inte den tidigare PDF-editorns DOM. Tidigare fält och signatur kunde därför ligga kvar visuellt.

- Editorn rensas, pågående äldre rendering ogiltigförklaras och eventuell gammal signaturdialog stängs vid öppning.
- Om ett dokument redan redigerades öppnas det på nytt med den valda automatikens egna värden.
- Dörrnummer/beteckning hämtas alltid från vald automatik: objektnummer, maskintyp och sista märkningsnummer. Rå sourceText är reserv när strukturerade delar saknas. Äldre lagrade textvärden får inte överstyra denna identitet.
- Beteckningen uppdateras i rubrik, original-PDF-fält och exporterad PDF och är skrivskyddad i SLR-formuläret.
- Riskval, datum och signatur tillhör fortsatt den enskilda automatikens interna ID. Ny dörr har inga sådana svar; återöppning av en tidigare arbetad dörr behåller dess egna sparade svar.
- Ingen kopieringslogik mellan liknande dörrar tillagd. Kalender, manuella avmarkerbara kryss, +/− och tvåfingerszoom bevarade.

## Kontroll
Syntax passerade. Faktiska open/editDoc-funktioner körda med DOM-/PDF.js-testdubblar och riktig PDF-lib-export: A → B → A passerade. B fick 200154-28-24-11 trots avsiktligt gammal sourceText och lagrat beteckningsfält. B visade tomma kryss, datum och signatur; exporten hade B:s ID och inga risk-/datumvärden. A:s egna tidigare val, datum och signatur fanns kvar efter återgång. Detta är en funktionskontroll, inte visuell Safari-verifiering på användarens enhet.

Endast separat SLR-test ändrat. Fast adress smartmatch-slr-test.html, version 36.115-SLR-TEST.
