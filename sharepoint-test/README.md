# Tillsyno – SharePoint-pilot för SmartMatch / Avläsning

**Aktuell kod: SharePoint-test 0.7.** Se [APP_TEST.md](APP_TEST.md) för Great och undermappar, 200 MiB filgräns, sparande i samma öppnade fil, separat kopieval, kompakt gränssnitt och verklig verifieringsstatus. Texten nedan är den ursprungliga pilotplanen; dess dåvarande publiceringsstatus och gränser är historiska.

## Vald modul – förtydligat av användaren 2026-10-20

Användaren vill koppla SharePoint **först till det kodskyddade Avläsningstestet**, med de två ingångarna **Förbered ritning** och **Öppna PDF**.

Verifierat i aktuell källkod:
- Startsidan `index.html` länkar från **Avläsning** till `smartmatch-read-test-v9-74.html?v=9.74`.
- `smartmatch-read-test-v9-74.html` har rubriken **SmartMatch – Avläsning TEST 9.74**, kodrutan `smReadCodeGate` och de två valda ingångarna.
- **Förbered ritning:** `rtChooseFiles`, med filfältet `rtMultiFiles` för flera PDF-filer.
- **Öppna PDF:** `pwOpenProjectEmpty`, för färdig projekt-PDF.

Detta ersätter den tidigare preliminära inriktningen mot `project-workspace.html`. Den vanliga Projektflöde-sidan, SmartMatch 1.3/SLR, det äldre v36.106-testet, Kontrollflödet och iOS/TestFlight ska **inte** ändras av denna pilot.

Behåll avläsningslogik, sparade kopplingar, kontroller och befintlig Tillsyno-inloggning/kodkontroll. SharePoint ska vara en ytterligare filkälla och sparplats, inte en ny matchningsmotor. Lokal filöppning ska finnas kvar.

## Utgångsläge
- GitHub: `dyli2009-cmd/tillsyno`. Arbetsgren: `test/sharepoint-projektflode-20261020`.
- `main` och användarens fungerande app ska lämnas oförändrade under förberedelsen.
- Användaren har skapat en SharePoint-webbplats Tillsyno, en projektmapp och laddat upp en PDF som går att öppna i SharePoint. Den exakta webbplats- och mappadressen är inte verifierad via API.
- SharePoint är dokumentlager. Samtidiga kontrollpunktsändringar från flera montörer får inte synkas genom att flera personer skriver över samma PDF.

## Avsett första test
1. Anslut Microsoft-testkontot i en isolerad testversion av Avläsning.
2. Under **Förbered ritning**, välj test-PDF:er från SharePoint och använd Avläsnings befintliga förberedelseflöde. Undersök dess faktiska importgränssnitt innan inkoppling; utgå inte från den äldre Projektflödesfunktionens `analyze(file)`.
3. Spara den förberedda projekt-PDF:en som **en ny kopia** i testmappen; behåll originalet.
4. Under **Öppna PDF**, hämta den sparade projekt-PDF:en från SharePoint och använd dess sparade avläsning/kopplingar.
5. Kontrollera hämtning, export, återöppning, nekad behörighet och nätfel innan testet beskrivs som fungerande.

## Microsoft-registrering och implementation som återstår
1. Registrera **Tillsyno SharePoint Test** i Microsoft Entra ID, först för endast den egna testorganisationen. Konfigurera SPA med exakt test-redirect-URI och MSAL Browser authorization code + PKCE. Ingen client secret i frontend eller publikt GitHub.
2. Konfigurera endast nödvändiga delegerade Microsoft Graph-behörigheter. Behåll användarens SharePoint-behörigheter och Tillsynos befintliga åtkomstkontroller.
3. Bygg separat test-UI och koppla till Avläsnings faktiska filimport/export. Ingen ändring av avläsnings-, dörrkorts- eller GS-matchningsregler.
4. Verifiera webbläsarhämtning, CORS, filnamnskonflikter, storleksgränser och skydd mot överskrivning mot Microsofts dokumentation och riktiga testfiler.
5. Testa återöppning på annan enhet innan någon publicering eller samtidig redigering utlovas.
6. Senare företagsanslutningar och flera samtidiga användare kräver separat säkerhetsdesign och testning. De ingår inte i första filkopplingstestet.

## Befintlig grundkod på pilotgrenen
`sharepoint-test/graph-client.js` är en fristående, preliminär REST-adapter. Den behöver en godkänd `getAccessToken`-funktion från Microsoft-inloggningen. Den innehåller anrop för webbplatser, bibliotek/mappar, PDF-hämtning och uppladdning. Dess beteende och skydd mot filöverskrivning är **inte verifierade mot SharePoint**.

**Adapterkoden är ännu inte ansluten till Avläsnings knappar och är inte testad mot användarens Microsoft-konto.** Uppdateringen av detta dokument ändrar endast vald inriktning, inte appens funktion eller publicering.

## Säkerhet
- Inga access tokens, lösenord, klienthemligheter, PDF-filer, ritningar eller kunduppgifter i GitHub.
- HTTPS, PKCE, minsta nödvändiga behörigheter och separat testmiljö.
- Håll testkonfiguration skild från den fungerande appen och iOS.
- Befintlig SharePoint-åtkomst i webbläsaren innebär inte att Tillsyno automatiskt har åtkomst; faktisk Microsoft-inloggning och Graph-koppling krävs.
- Starta med läsning och spara som ny testkopia. Ersätt inte original.
