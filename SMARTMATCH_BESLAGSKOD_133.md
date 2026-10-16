# SmartMatch 1.3 / Tillsyno v2.4.361

Den nya profilen identifierar det liggande dörrkortets översta vänstra tabellruta och läser hela rubriken `Beslagskod: WC` eller motsvarande beteckning. Just den rutan är en bild i det verifierade kortet. Därför räcker inte vanlig PDF-text för detta format.

## Beteende

- Profilen kräver kortets kända sidproportioner och fyra befintliga tabellrubriker på sina förväntade platser. Endast första rutan används som källa till beteckningen.
- Befintlig läsning av första cell och kända tabellformat körs först. Den nya profilen används bara när dessa inte redan har identifierat kortet. Matchning, normalisering, klassificering, ritningspositioner och övriga regler har kvar sin tidigare kod.
- Text i rutan används direkt när den finns. Annars bildläses endast den lilla rutan med lokala Tesseract-filer. En fullständig Beslagskod-rubrik, en ensam giltig kod och minst 75 procents OCR-konfidens krävs.
- Dokumentnumret GS-001 i sidfoten, GS i ansvarskolumner och Rumstyp i specifikationen används inte som kortets beteckning av den nya profilen.
- Bildläsningen skickar inga bilder till externa tjänster. Appens offlinecache omfattar både SmartMatch-sidan och dess lokala bildläsningsfiler. Offline fungerar när dessa filer har hämtats.
- Läsningen frigör sin worker efter indexeringen. En misslyckad avläsning kan provas igen.
- Synlig version är SmartMatch 1.3, intern byggversion 36.133-SLR-TEST. Startsida och offlinecache har version 2.4.361.

## Verifiering 2026-10-16

`node tests/smartmatch-beslagskod-v36-133.cjs` verifierar strikt rubrikläsning, 15 tidigare kort och att hela den tidigare huvudfilen är identisk utanför den tillagda indexeringskopplingen och versionskonstanten.

En lokal sökväg till det nya kortets PDF kan anges som första argument för webbläsartestet. Playwright kan hämtas från `CODEX_PRIMARY_RUNTIME_NODE_MODULES`; ange Chromium med `CHROMIUM_PATH` och valfria startargument med `SMARTMATCH_BROWSER_ARGS`. Testunderlag och skärmbilder läggs inte i repot.

Följande passerade i Chromium-vyerna 1366×900, 390×844 och 1024×1366; de två mindre vyerna har touch aktiverat:

- Verkligt kort med bildrubriken WC identifieras, både separat och tillsammans med en ritning.
- En bildvariant med GS10 identifieras korrekt trots att den ursprungliga texten Rumstyp WC och dokumentnumret GS-001 finns kvar.
- Båda beteckningarna kopplas till rätt position på ritningen. Ett ensamt kort skapar inga påhittade ritningspositioner.
- Ett nytt PDF-flöde kan läsas utan nät efter att offlinecachen har förberetts.
- Tidigare kortformat för WC, 140C och GS2 matchar sina ritningspositioner utan att den nya profilen anropas.
- Inga externa nätanrop eller JavaScript-fel uppstår i flödet.

Även `node tests/smartmatch-table-layouts-v36-95.cjs`, JavaScript-syntax och `git diff --check` passerade. Skärmstorlekar och syntetisk touch ersätter inte användarens efterföljande prov på fysiska iPhone- och iPad-enheter.

Tesseract.js och dess modellfiler är låsta till de versioner och källor som anges i `vendor/tesseract/NOTICE.md`.
