# Ritningsverktyg v2.4.363 – jämför hela den markerade texten

v2.4.362 krävde att markerad text kunde tolkas som en kod. En rubrik som **Beslagskod: DBLB upp SD** avvisades eftersom värdet innehöll flera ord. Användaren fick därför olästa sidor trots att själva texten kunde läsas.

Nu får varje icke-tom text i markeringen vara med i grupperingen. Det finns ingen lista över godkända koder, ingen kravställd rubrik och inget krav på siffror. Hela texten används, med ord, bokstäver, tal, skiljetecken och flera rader. Den avlästa texten visas i respektive grupp.

## Arbetsgång

1. Öppna PDF-filen i **Ritningsverktyg** och visa en exempelsida.
2. Välj **Verktyg → Sortera dörrkort efter rubrik → Markera text att jämföra**.
3. Markera hela texten som ska jämföras, till exempel **Beslagskod: DBLB upp SD**. Samma relativa område läses på övriga kvarvarande sidor.
4. Tryck **Hitta samma rubriker**. Alla olika texter får egna grupper. Sju likadana texter blir en grupp med sju sidor.
5. Kontrollera gruppen. Ett exemplar är förvalt att behållas och övriga sex är markerade som extrasidor. Ändra valen vid behov och tryck **Ta bort valda extrasidor**.
6. Välj **Spara PDF**. Borttagningen gäller hela PDF-sidor och kan ångras i arbetskopian. Originalfilen finns kvar.

## Jämförelse och avläsning

Unicode normaliseras, radbrytningar och upprepade blanksteg blir ett blanksteg, och stora/små bokstäver jämförs likvärdigt. Ordens gränser och skiljetecken bevaras. **DBLB upp SD**, **DBLB upp ST** och **DBLBupp SD** är olika texter. **Beslagskod: GS23** och **Kod GS23** hålls isär när hela dessa rubriker markerats. Inga kända prefix tas bort eller lärs in som filter.

PDF-text läses först. I snabbläget används lokal OCR om markeringen saknar läsbar PDF-text; textläget startar ingen bildläsning. OCR läser nu ett textblock så även flerradiga fält kan läsas. Även icke-tom OCR-text med låg confidence grupperas; en synlig uppgift om osäker bildläsning hjälper användaren att granska texten. Tom text och läsfel lämnas olästa och väljs inte för borttagning.

Sidvis läsning, avbrytning av väntande OCR, markerade bildutsnitt, skyddad sida per grupp, ångra/gör om och förlustfri PDF-export behålls. Grupperingsfunktionen läser fortfarande PDF-filen i webbläsaren; ingen 500 MB-fil eller fysisk iPad har verifierats här. SmartMatch, Kontrollflöde och behörighetsregler ändras inte.

## Verifierat 2026-10-16

- `node tests/drawing-card-groups.cjs` passerar med fria textvärden, Unicode, interpunktion, flerradiga värden och sju **Beslagskod: DBLB upp SD**. Prefix-/exempelinställningar begränsar inte texten. Sju identiska OCR-texter med confidence 40 grupperas också; tom OCR förblir oläst. Geometri, rotation, sidboxar, sekventiell läsning, fel och avbrott verifieras fortsatt.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/drawing-card-groups-browser.cjs` passerar i dator-, iPhone- och iPad-vy. Ett genererat underlag har sju likadana DBLB-rubriker, inklusive radbrytning, olika skiftläge och extra blanksteg, samt andra liknande och fritt formulerade rubriker. Endast de sex valda extrasidorna tas bort. Åtta kvarvarande sidor exporteras med identiska ursprungliga innehållsströmmar.
- Efter ändringen av confidence-hantering och OCR-textblock passerar datorfallen igen, inklusive synlig uppgift om osäker bildläsning, fastnad OCR som avbryts inom två sekunder, efterföljande textsökning, ångra/gör om och PDF-export.
- `DRAWING_GROUP_DEVICE=desktop DRAWING_GROUP_REAL_OCR=1 CHROMIUM_PATH=/usr/bin/chromium node tests/drawing-card-groups-browser.cjs` passerar med verklig lokal Tesseract och det nya textblocksläget. Bildläsningen använder fortsatt bara markerade utsnitt.

Kundens aktuella sjusidiga PDF fanns inte uppladdad i detta arbetspass; regressionen återger rubriktexten och antalet sidor som användaren beskrev.
