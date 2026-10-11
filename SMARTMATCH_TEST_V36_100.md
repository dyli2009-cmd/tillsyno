# SmartMatch TEST v36.100 – Snidaren: fysisk DA-symbol avgör rätt GS2/GS4

Datum 2026-10-11. Område: **Verktyg → Koppla dörrautomatik**. Ny felrapport med den uppladdade ursprungs-PDF:en `Snidaren   3.pdf`, 25 sidor.

## Verifierat direkt mot PDF
På **PDF-sida 3 / Plan 0** står `200154-28-24-1` vid den övre dörren, vars fysiska GS är **GS4**. `200154-28-24-2` står precis nedanför, vid den nedre dörrens **GS2**. **GS2-kortet på PDF-sida 12 och GS4-kortet på PDF-sida 14 anger båda `Dörrautomatik ED100`.** Därför kan maskintyp eller ID-rangordning inte särskilja dessa två.

Det är fel att enbart jämföra mittpunkten för den långa automatiktexten med mittpunkterna på GS-stämplarna: `...-2` ligger nästan mitt mellan den övre GS4-stämpeln och den nedre GS2-stämpeln. På samma ritning finns dock ett separat, läsbart `DA`-tecken bredvid varje fysisk dörrautomatik. Dessa DA-tecken löser tvetydigheten.

Geometriskt kontrollunderlag ur PDF-sida 3, okorrigerade PDF-koordinater:
- `...-1`: märkningsrektangel ungefär `[2164,3079,2179,3180]`, närmaste tillhörande DA vid `[2236,3126]`; rätt GS4 omkring `[2239,3124]`.
- `...-2`: märkningsrektangel ungefär `[2305,3115,2320,3216]`, tillhörande DA vid `[2369,3120]`; rätt GS2 omkring `[2388,3133]`.
- PDF-ritningen innehåller fler förekomster av GS2. Det är **närmaste fysiska GS2-stämpel vid samma nedre dörr** som är rätt mål.

## Ny regel
1. Vid matchning av en märkning på ritningen: läs sida som tidigare och tillämpa dörrkortskontrollen, inklusive ED100/ED200/ED250-undantaget från v36.99.
2. Läs de separata texttecknen `DA` på samma ritningssida. Fördela **högst en DA-symbol per unik fysisk automatikmärkning**, en gång per fysiskt objekt, genom att rangordna tillåtna korta avstånd mellan text och DA-symbol. Två närliggande märkningar får alltså inte stjäla samma DA-symbol.
3. När en DA-symbol har kunnat förknippas med märkningen, välj **närmaste korrekta GS med dörrautomatik på dörrkortet utifrån DA-symbolen**, inte textrektangelns centrum.
4. När DA-symbol saknas eller ligger alltför långt bort: använd den tidigare avståndsberäkningen från textens mitt som reserv. Visa manuell koppling om säker automatisk matchning saknas. Det krävs inte att DA-tecknet finns i alla PDF-format.
5. Varje fysisk automatik har fortsatt högst en ritad pil. Tidigare **obekräftade automatiska** GS4-kopplingar omvärderas vid återöppning av PDF:en efter att både dörrkort och DA-symboler lästs. **Manuellt bekräftade kopplingar och frånkopplingar ändras inte**, och checklistor, anmärkningar och SLR tas inte bort.
6. Återanvänd den redan cachade PDF-texten; ingen extra rendering/OCR eller ändring av PDF-projektformatet behövs.

## Kod/test
- `smartmatch-da-v36-100-module.js` (DA-symbolsida-cache, en-till-en-symbolfördelning, fysisk förankring av GS-avstånd).
- `project-workspace-smartmatch-v36-100.{html,js,css}` samt fast testfil `project-workspace-smartmatch-test.html`.
- `tests/smartmatch-snidaren-gs2-v36-100.cjs` testar med mätta koordinater från Snidaren utan att original-PDF lagts in i det publika GitHub-repot.

**Verifieringsstatus:** Den faktiska v36.100-modulen har kompilerats och körts i isolerad JavaScript-testmiljö mot koordinaterna från den uppladdade PDF:en. Elva assertioner passerade: `...-1→GS4`, `...-2→GS2`, flyttad textruta, omräkning av gammal automatisk GS4-länk, synliga enskilda pilar, sparade kontroller/SLR, fallback vid saknade DA-tecken och manuell bekräftelse. GitHub-testfilen är tillagd men inte körd i GitHub Actions, och den verkliga browser-PDF.js-implementationens visuella utfall på iPad/iPhone måste fortsatt verifieras.

Ingen iOS-/TestFlight-uppdatering, ingen ändring av grundscanner, dörrkortens titel/ID-källa, utvalda protokoll eller projektets checks.
