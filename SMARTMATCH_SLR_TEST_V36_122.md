# Tillsyno SmartMatch SLR TEST v36.122 – gemensamma SLR-mallar och glasprofiler

## Ny överenskommen arbetsmodell, 2026-10-13
Användaren vill minska projekt-PDF:ers storlek (senaste kundprojekt 141 MB) samtidigt som hela projektet, alla dörrars SLR-arbete och ritningar följer med till dator/iPad via samma fil. Projekt-PDF är arbetsfil; separata kunddokument skapas på begäran.

## Genomförda funktioner
1. **Delade mallar:** en enda mall per SLR-kategori i projekt-PDF:s EmbeddedFiles. Ingen statisk SLR-dokument-PDF per dörrautomatik läggs in i arbetsfilen – inte ens för ifyllda kategorier. Appen bygger dokument vid öppning, Visa PDF eller kundexport utifrån mall + projektdata.
2. **Gemensamma kryssprofiler:** Med glas / Utan glas per dörr-ID. Valet ligger i SLR-mappens topp. Alla tilldelade dörrar läser samma profilens kryss och radioval utan att kopiera kryssen till varje dörr.
3. **Skapa profil:** fyll i kryssen på en dörr och välj *Spara denna dörrs kryss som standard*. Endast kryss/radioval i PDF:s formfält sparas i aktuell profil, inte datum, textfält, maskin-ID, GS, signatur eller slutgodkännande. Minst ett valt alternativ krävs. Denna standards ändring blir synlig på andra dörrar som använder samma profil, men deras egna överstyrningar bevaras.
4. **Ändra bara denna dörr:** fälteditorns knapp heter detta; ändrade kryss läggs bara som *dörrspecifik överstyrning*, utan att skriva över global profil. Knappen *Återställ denna dörrs kryss* tar endast bort individuella checkbox/radio-överstyrningar och behåller text, datum, signatur, identitet. Äldre projekt startar utan profiler och med oförändrade svar tills teknikern väljer en.
5. **Gemensam signaturbild:** signatur-PNG förvaras en gång i projektets signatureLibrary. Varje undertecknat dokument har egen referens till denna bild. Knappen *Använd sparad signatur* kräver att teknikern aktivt bekräftar varje dokument; automatisk massignering sker inte. Äldre duplicerade inline PNG-signaturer konverteras utan innehållsförlust.
6. **Kund-PDF separat från arbetsprojekt:** *Spara kund-PDF för denna dörr* bygger ett PDF-paket vid behov från mallar/profilsvar, aktuella dörrdata och eventuella genererade produktlistor. Kunden får inte appens redigerbara projektmetadata. De genererade kundsidornas extra tyngd läggs inte in i arbetsprojektfilen.
7. **Projektmanifest schema 6** pekar endast på delade mallar och valfria genererade produktlistor. Versionsdokument 36.121 finns kvar, liksom äldre schema 4/5-filer för återöppning. SLR.TEST-projektets JSON payload schema 2: answers, names, profiles, doorProfiles, signatureLibrary.

## Testresultat (syntetiskt med verklig pdf-lib och exporterarkod)
- 50 automatiker, 1 SLR-mall, varav två med samma glasprofil och den ena med unik överstyrning; specifikt datum på annan dörr kopieras inte.
- Spara arbets-PDF tre gånger: 4 135, 4 144 och 4 145 byte i just testfixturen. Endast en mall, noll per-dörr SLR-PDF-bilagor, kundens redan inbäddade bilaga bibehålls.
- Verkliga `buildPortableProjectPdf` och `verifyPortableProjectPdf` plus modulens `saveTo/verify` passerade alla tre exporterna.
- Återöppning av sparad PDF återställer profil, dörröverskrivning, separata datum och deduplicerad signatur.
- Återställning av dörröverskrivna kryss bevarar datum; komplett PDF-dokument kan genereras separat ur SLR-mallen.
- PDF-formulärs radio-val verifierade; datum/text kopierades inte till profil.
- Äldre `slrTestData.schema=1` och dubbel inline-signatur återlästa och migrerade till delad bild med två dokumentreferenser.
- Syntaxkontroll av huvudmodul, DA och nya SLR-modulen.

## Säkerhets- och omfångsgränser
- Inga generella godkännanden kopieras; varje utförd kontroll måste kontrolleras/bekräftas på plats.
- Kundexport per dörr är separata färdiga dokument; en samlad projektövergripande kund-PDF är ännu inte byggd.
- Inga förändringar av låsta GS/dörrkort-regler, Kontrollflöde eller ordinarie SmartMatch; ingen iOS/TestFlight-publicering.
- Filen som var 141 MB har inte analyserats eller kompakterats i testmiljön; verklig storleksminskning och full Safari/iPad-funktion återstår att verifiera med riktig projekt-PDF.
- SLR TEST v36.121 bevaras som återgång.
