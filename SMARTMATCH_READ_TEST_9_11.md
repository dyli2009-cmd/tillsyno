# SmartMatch – Avläsning TEST 9.11

Fast adress: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v9-11.html`. Intern version: `36.154-READ-TEST`. Tillsyno-version: `v2.4.378`.

## Exportfelet

Användaren rapporterade: ”Projektdata saknas eller kunde inte läsas i exporterad PDF”. Filen kunde förberedas men exportkontrollen kunde inte läsa tillbaka projektinformationen, så sparrutan öppnades inte.

Felet kan återskapas med stor inbäddad projekt-JSON, exempelvis många avlästa tabeller och OCR-ord. PDFLibs `decodeText` använder ett alltför stort funktionsanrop; den tidigare reservläsarens upprepade UTF-16-regexgrupp kan också få stacköverskridning. Då returnerade metadataläsaren ingen projektdata trots att den fanns i PDF:en. Detta är en storleksfråga för den inbäddade informationen, inte ett bevis för att en viss MB-gräns för hela PDF:en har passerats.

TEST 9.11 läser UTF-16-texten i begränsade block med linjär teckenkontroll. Den gemensamma nya läsaren används vid öppning och vid exportkontroll. Indirekta PDF-referenser, stora/små hextecken, UTF-16BE/LE, svenska bokstäver och surrogatpar bevaras. Giltig nyare projektdata med uttryckligt `readTestData:null` får fortfarande inte ersättas av äldre data. Trasig och ofullständig information godkänns inte.

Den färdiga filen överlämnas också som begränsade Blob-delar, så att en stor export inte förs över till webbläsarens fillager som ett enda jättestort typat arrayelement. Detta löste en avbruten nedladdning i det syntetiska 251 MB-provet. Nedladdningens tillfälliga adress behålls längre än tidigare två sekunder.

## Så sparar du

1. Om arbetet fortfarande är öppet i föregående version: välj **Spara lokalt** först. Det är en säkerhetskopia på samma enhet.
2. Öppna TEST 9.11 och välj ditt lokala projekt eller en redan sparad projekt-PDF. Lokal 9.10-historik kan kopieras till den nya versionen utan att källan ändras.
3. Välj **Spara → Spara PDF**. Dialogen visar aktuellt arbetssteg, procent och förfluten tid medan exporten förbereds och kontrolleras.
4. Vid **100 % – PDF klar att spara**, tryck **Spara PDF** och välj plats. Den första 100-procentsvisningen betyder att PDF:en är kontrollerad och tillgänglig för sparning.
5. Vid direkt sparning på dator visar ett separat förlopp hur filen skrivs och läses tillbaka. **PDF sparad och kontrollerad – 100 %** visas när den skrivningen är klar. Vid vanlig nedladdning eller iPad-delning kan appen inte verifiera operativsystemets sparning; kontrollera då Hämtade filer eller välj Spara i Filer.

Procenten bygger på färdiga arbetssteg, sidor och positioner. Den räknas inte upp av en timer. PDF-tolkning och serialisering rapporterar inte förlopp inom själva anropet; procenten kan därför stå stilla vid ett beskrivet steg. Tid visas utan påhittad återstående tid. Direkt filskrivning sker i begränsade block där plattformen stöder det, med separat blockvis kontroll från disk.

Stängd dialog, nytt projekt eller ny exportrevision gör gamla statusrapporter ogiltiga. En gammal export får inte skriva över ett annat projekts filbytes, status eller sparmarkering. Ingen sparruta öppnas innan en giltig PDF finns och har verifierats. Misslyckad skrivning avbryts; 0-byte- och ofullständiga filer godkänns inte.

## Verifiering

- `node tests/smartmatch-read-metadata-v9-11.cjs`: riktig PDFLib-sparning och återläsning av 3 105 113 JSON-tecken. Den tidigare läsaren misslyckas, medan den nya behåller svenska OCR-texter, emoji, bockning och tid. Även indirekt referens, UTF-16LE, surrogat vid blockgräns, bokstavlig PDF-sträng, felaktig hex, avklippt text, reservnyckel och nyare uttryckligt null provas.
- `node tests/smartmatch-read-large-export-browser-v9-11.cjs`: genererad PDF med verklig refererad rasterbild, 79 sidor, 74 kopplingar, två väntande kort och 3 060 000 OCR-tecken. Provar hela förberedelsen, monoton arbetsstegsprocent, spärrad sparknapp före verifiering, export, kvarvarande bild/metadata och återöppning i ren webbläsare utan OCR/matchning. Direkt blockskrivning, läsning tillbaka, avbrott vid diskfel och stängd dialogs status ingår på dator.
- `node tests/smartmatch-read-project-browser-v9-11.cjs`: tio tidigare portabla projekt-/ägarskapsprov och aktuell 9.10→9.11-lokal återställning. Källhistoriken lämnas oförändrad.
- `node tests/smartmatch-read-save-v9-11.cjs`: tidigare verkliga sparfunktioner provas mot 9.11, inklusive tom fil, misslyckad skrivning, delvis felaktig läsning tillbaka och projektbyte under tre sparvägar.
- `node tests/smartmatch-read-partial-state-v9-11.cjs` samt `SMARTMATCH_DEVICE=desktop node tests/smartmatch-read-work-browser-v9-11.cjs`: partiella projekt, sparade val, GS-produktgrupper, riktad produktomläsning, bockning och tider.

Resultat: 24,2 MB-provet passerar på dator och iPad i Chromium-emulering. Även `SMARTMATCH_DEVICE=desktop LARGE_PDF_MB=251 node tests/smartmatch-read-large-export-browser-v9-11.cjs` passerar med en fysisk genererad PDF på 251,2 MB: export, nedladdning, bild-/textbevarande, återöppning i ren webbläsare, blockskrivning med läsning tillbaka och avbrutet diskfel. Den tidigare metadataläsaren misslyckas på samma projektinformation. Den rapporterade kundfilen har inte bifogats i den här felsökningen; teststorlekar är inga generella minnes-/hastighetsgarantier. Ingen fysisk iOS eller ny TestFlight-build ingår.

## Avgränsning

Endast separata Avläsning TEST-seriens aktiva version ändras funktionellt. 9.10 och äldre snapshots, ordinarie SmartMatch, beta 10, GS-montageregeln, DA/SLR-regler, Ritningsverktygets funktioner, Kontrollflöde och auth behålls. Globala versions-/cachereferenser uppdateras enligt versionsregeln.
