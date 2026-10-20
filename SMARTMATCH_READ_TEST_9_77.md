# Avläsning TEST 9.77 – mindre minnestopp vid projektkodning

Efter publicerad 9.76 rapporteras fortsatt omstart i Safari på både iPad och iPhone, nu efter cirka 57 procent. Det steget följs av kodningen av projektets JSON-information. PDFLibs `PDFHexString.fromText` bygger en stor talarray, en UTF-16-buffer och en stor hexsträng med upprepad sammanfogning. En stor PDF-bilaga med lite projektdata belastar inte samma kodväg som bilder, avlästa tabeller och annat stort projektinnehåll i JSON.

9.77 använder en separat standardkompatibel skrivare:
- JSON skapas en gång med befintlig `JSON.stringify`-semantik.
- UTF-16-kodningen görs med arbetsblock om 8192 tecken och avbrottskontroll efter högst 128 Ki tecken. Varken en talarray eller en UTF-16-buffer för hela innehållet byggs.
- Det färdiga resultatet är en vanlig direkt `PDFHexString` med exakt samma bytes som tidigare. Båda metadatafälten, deras schema och befintlig återläsningskontroll behålls. Äldre läsare får inga nya indirekta referenser.
- Tidigare metadata släpps i den privata exportkopian innan ersättaren kodas. Originalfilens bytes och lokalt sparat arbete ändras inte av detta.
- Procentstegen 58–62 visar faktisk bearbetning och tillåter avbrott innan nästa del börjar.

Den versionerade testsidan och aktuellt testalias använder intern build 36.220. Startsidan och service-worker-listan är uppdaterade för 9.77, medan tidigare versionerade filer finns kvar.

Verifiering:
- `node tests/smartmatch-project-writer-v9-77.cjs`: byteparitet med tidigare skrivare, svenska/Unicode/kontrolltecken, surrogatpar över blockgräns, flera MB projektdata, återöppning med flera MB i aktuell läsare samt formatkompatibilitet med äldre läsare för mindre projekt, avbrott utan delvis installerad metadata.
- Exportkö-, sidcache-, lokal sparning- och noteringstester för 9.77 använder den nya skrivaren. Full export och strikt verifiering samt bevarad originalfil efter simulerat fel ingår.
- `tests/smartmatch-ipad-export-memory-v9-77.cjs` har flera MB avläst projekttext utöver PDF-bilagan och kontrollerar exakt återläst innehåll, avbrott under metadatakodning och återförsök. Testet kan även köra iPhone-profil.

Alla riktade kodtester, syntax- och resurskontroller samt Popplers bildjämförelse passerar. Chromium-flödet passerar med 16 MiB PDF-bilaga och minst 4 MiB projektinformation i både iPad- och iPhone-profiler, samt med 100 MiB bilaga och samma stora projektinformation i iPad-profil. Exakt innehåll, UTF-8-storlek och SHA-256 bevaras efter återöppning. Detta är simulerade enhetsprofiler, inte fysisk Safari.

Kompletterande webbläsarkörningar:
`SMARTMATCH_TEST_DEVICE=iphone node tests/smartmatch-ipad-export-memory-v9-77.cjs`
`SMARTMATCH_TEST_SOURCE_MB=100 node tests/smartmatch-ipad-export-memory-v9-77.cjs`

Isolerad mätning i Node/V8 med 4 MiB syntetisk JSON, i separata processer: tidigare kod nådde 385 MiB RSS och 244 MiB JavaScript-heap; den nya nådde 127 MiB RSS och 54 MiB heap. Båda skapade samma 16777332 hextecken. Detta är en jämförelse i utvecklingsmiljön, inte en minnesmätning på fysisk Safari.

Kör mätningen separat:
`node --expose-gc tests/smartmatch-project-writer-v9-77.cjs --bench=vendor`
`node --expose-gc tests/smartmatch-project-writer-v9-77.cjs --bench=writer`

Slutlig begränsning: hela JSON-strängen, den färdiga hexsträngen, full PDF-bearbetning och verifiering finns fortfarande i webbläsaren. En stor originalfil eller ett tillräckligt stort projekt kan fortfarande överskrida enhetens minne. Den rapporterade Safari-omstarten är inte reproducerad med användarens egen fil. Fysisk iPad/iPhone och Dropbox/OneDrive behöver provas med samma projekt.
