# SmartMatch TEST v36.87 – tomma metadatafält under första ID-rutan

Snidaren-PDF:en innehåller 15 dörrkort på sidorna 11–25. I v36.86 identifierades endast 7; GS3, GS5, GS8, GS9, GS10, GS13, GS14 och GS15 missades eftersom tomma metadatafält försköt den textbaserade tabellidentifieringen nedåt.

Ny identifiering använder följden av tryckta metadatarubriker (Littera, Antal, Hängning etc.) och deras koordinater för att hitta den direkt föregående vänstra ID-cellen. Högercellens kod ersätter aldrig ett otydligt vänster-ID. Befintlig tvåkolumnsidentifiering och ritningsmatchning behålls.

Verifierat mot den faktiska uppladdade 25-sidiga PDF:en med exakt appens PDF.js 3.11.174 och samma getTextContent-konvertering: 7 → 15 av 15 korrekta ID:n. Identitetsutfallet för samtliga 10 ritningssidor oförändrat. Det är verifiering av textavläsning/ID-indexering, inte ett fullständigt webbläsartest av ritningspositioner, sparning eller UI.

Regressionstest: node tests/smartmatch-first-cell-v36-87.cjs. Testfixture innehåller bara de 15 kortens ID- och metadatarader; original-PDF och projekthuvud lagras inte i repot. Tidigare vänster/höger-, trekolumns-, tvetydighets- och fragmenttester passerar. Syntax: node --check project-workspace-smartmatch-v36-87.js.

Nya versionsmärkta JS/HTML/CSS, identisk fast TEST-entry, separata lokala nycklar. v36.86 bevaras. Kontrollflöde och native iOS/TestFlight orörda.
