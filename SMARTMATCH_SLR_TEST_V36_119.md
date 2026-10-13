# SmartMatch SLR TEST v36.119 – reparerad PDF-export

Rapporterat fel: "PDF-exporten stoppades: Unexpected token F ... FF007B... is not valid JSON" när användaren fyllde i SLR-dokument och sparade projekt-PDF.

## Åtgärd
- Exportens återläsningskontroll av både projektdata och SLR-bilagornas manifest har en säker JSON-avkodare som försöker originalets PDF-textavkodning och därefter korrekt avkodning av UTF-16 hexsträngar med FEFF/FFFE-BOM.
- Hexkodade data tolkas som text innan JSON.parse; ogiltig JSON accepteras inte tyst.
- Samma toleranta avkodning används vid återöppning av SLR-manifest.
- Endast isolerad SLR TEST ändrad. GS-matchning, checklistor, mallarnas innehåll, projekt-PDF:s sparstruktur och vanliga SmartMatch samt Kontrollflöde är orörda.
- Version 36.118 behålls som återgång. Fast adress smartmatch-slr-test.html pekar på 36.119.

## Kontroll
Testat med pdf-lib: verklig PDFHexString.fromText(JSON), PDF-sparning/återöppning, simulerad decoder som returnerar FEFF-hextext, decoder som saknas/kastar fel, vanliga JSON-strängar, avvisning av ogiltigt innehåll och SLR:s saveTo/verify både med normal och felaktigt hex-returnerande decoder. JavaScript-syntax verifierad. En verklig användarprojekt-PDF och full Safari/iPad-export har inte verifierats.
