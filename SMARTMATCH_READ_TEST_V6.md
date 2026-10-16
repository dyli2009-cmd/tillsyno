# SmartMatch – Avläsning TEST 6

Fast testsida: `smartmatch-read-test.html`. Versionssida: `smartmatch-read-test-v6.html`. Intern version `36.140-READ-TEST`. TEST 5 och tidigare versionsfiler är bevarade. Ordinarie SmartMatch, Kontrollflöde och native iOS ingår inte i ändringen.

## Granska en gång och öppna projekt-PDF:en direkt

TEST 5 sparade redan kort, läsområden, granskade ritningspositioner och Klar-markeringar i projekt-PDF:en. Vid vanlig filöppning visades ändå granskningsguiden igen.

I TEST 6 öppnar **Öppna ny PDF** en sparad projekt-PDF direkt med sina tidigare kopplingar och arbetsresultat. Ingen ny kortläsning, stämpelsökning eller granskningsdialog startas. Ritningen behöver fortfarande läsas in och visas.

**Öppna ritning och dörrkort från flera PDF:er** öppnar uttryckligen granskningsguiden, även om bara en redan kopplad projekt-PDF väljs. **Läsområden** och **Ställ in avläsning** kan också användas för att granska ett öppet projekt. En ny sökning startas först när användaren begär det. Pågående arbetsstatus används när det aktuella projektets läsinställningar öppnas.

## Så gör du

1. Granska och godkänn kopplingarna första gången ett nytt underlag läses in.
2. Öppna **Spara** och välj **Spara PDF**. Den exporterade projekt-PDF:en innehåller kopplingar, kortområden, granskade val och arbetsstatus.
3. Nästa gång: välj **Öppna ny PDF** och öppna den sparade projekt-PDF:en. Den går direkt till arbetsprojektet, även i en annan webbläsare utan lokal historik.
4. För att granska eller ändra kopplingarna: använd flerfilsöppningen eller **Läsområden**. Avbryt lämnar det befintliga projektet orört; godkänd granskning bevarar dess senaste arbetsstatus.

**Spara lokalt** är en kopia på den aktuella enheten. För att kopplingarna ska följa med själva filen behöver du välja **Spara PDF** och sedan öppna den exporterade filen. Den tidigare originalfilen i Filer/Dropbox skrivs inte automatiskt över.

## Hur återöppningen kontrolleras

Projektdata läses från samma PDF-katalogfält och i samma ordning som huvudläsaren: `TillsynoSmartMatchV36Data` före `TillsynoSmartMatchV30Data`. Vid vanlig filimport har PDF:ens tillstånd företräde framför en gammal lokal kopia. Den lokala läskopian uppdateras också, så en efterföljande omladdning inte återtar den äldre kopian.

Nya godkännanden sparas som `matching.review = {version: 1, approved: true}`. Giltiga äldre TEST 3–5-projekt utan denna markör får också öppnas direkt: deras matchningsdata skrevs först efter det då obligatoriska godkännandet. Ett uttryckligt underkänt eller okänt godkännande behandlas inte som äldre format.

Sidnummer, unika kortbeteckningar/identiteter, arbetsrader, kortområden, träffval och koordinater kontrolleras. De sparade PDF-rektanglarna jämförs med normaliserade placeringar via sidans viewport, utan textextraktion eller rendering av sidan. Saknad eller ogiltig sparad läsdata öppnar guiden. Lokalt lagrade kopplingar till en vanlig original-PDF räcker inte för att hoppa över förstagångsgranskningen.

Positionernas identiteter, originalkoordinater, arbetsrader och Klar-nycklar återanvänds för att bevara varje fysisk dörrs arbete. Snabbsökningen från TEST 5 och stödet för flera kort på samma sida återanvänds oförändrade. TEST 6 har egna lagringsnycklar och egen sessionsdatabas.

## Verifierat 2026-10-16

- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-direct-open-v6.cjs` passerar i dator- och iPhone-storlek. Testet granskar ett genererat underlag, avmarkerar en träff, sparar arbete, exporterar riktig projekt-PDF och öppnar den i nya webbläsarkontexter. Ingen granskningsdialog eller sökning får starta vid direktöppning. Kortutsnitt, träffval, positions-ID, arbetsresultat, import med gammal lokal kopia och efterföljande omladdning kontrolleras.
- Samma test verifierar frivillig granskning via Läsområden och flerfilsöppning med en enda fil. Både Avbryt och nytt godkännande bevarar aktuell arbetsstatus. Äldre projekt utan godkännandemarkör öppnas direkt; underkänd/okänd markör och ogiltig ritningssida öppnar guiden med okryssat godkännande. Nya original-PDF:er kräver granskning även när kopplingar finns lokalt.
- `SMARTMATCH_READ_VERSION=v6 SMARTMATCH_DEVICE=desktop CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-regions-browser-v4.cjs` passerar med genererat underlag (fyra kort/fem kopplingar) och den tidigare uppladdade kontrollfilen (tio kort/tio granskade kopplingar). Varje korts utsnitt och arbetsinnehåll, separat status, export, direkt återöppning, legendens bortval och skydd mot äldre lokal data kontrolleras. Den uppladdade filen anges lokalt via `REAL_MULTI_CARD_PDF`; kundfilen ingår inte i repot.

Inga nya externa bibliotek eller tjänster har lagts till. Kopplingarna är projektdata i PDF-filen. Fysisk Safari/iOS och ny TestFlight-build har inte verifierats i denna webbändring.
