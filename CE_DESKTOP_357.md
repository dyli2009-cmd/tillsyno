# Tillsyno v2.4.357 – CE-arbetsyta på dator

Beställt 15 oktober 2026 för Kontrollflöde → Dörrautomatik / Lås → CE-märkning → projektarbetsytan, exempelvis Namnlöst CE-projekt.

- Projekt och Dokument & export ligger i projektets övre rad på dator. En enda Ny dörr-knapp ligger vid dörrlistan.
- Dörrlistan och vald dörrs CE-dokument visas samtidigt. Direkt dörrval och Föregående/Nästa använder samma befintliga CE-data och dokumentlogik.
- Dra delaren för att justera bredd. Delaren kan också styras med vänster/höger, Home och End.
- Menyn Vy byter sida på dörrlistan, ändrar textstorlek och frigör/fäster dokumentfönstret. Ett frigjort fönster flyttas med rubriken och ändrar storlek med nedre högra handtaget. Återställ datorvyn återställer utseendeinställningarna.
- Datorläget kräver minst 1100 px, hover och precis pekare. Telefon-/surfplatteval och iOS-enheter undantas. Vid smalare fönster återställs originalnoderna och den vanliga CE-dialogen; öppna exportval behålls.
- Samma enkla plusikon används på dator, iPhone och iPad. Mobilens/surfplattans övriga layout bevaras.
- Datum, datumformat, datumstil, underskriftens förhandsvisning och underskriftsdialogens omgivning följer valt tema. PNG-signaturen, datumvärdena och PDF-innehållet ändras inte när temat växlas. Skrivytan är vit för att motsvara dokumentpapperet.

Ändringen ligger i separata CE-filer. Övriga moduler får endast gemensam versions-/cachemärkning. Kontrollflödet förblir låst utanför denna uttryckligt beställda fristående CE-ändring.

## Verifiering

Kör med Playwright och Chromium via NODE_PATH respektive CHROMIUM_PATH enligt befintlig testmiljö:

- `node tests/ce-desktop-workspace-v357.cjs`: verkligt skapande/byte av dörr, separata dokumentuppgifter, delare med mus/tangentbord, sidbyte, textstorlek, flytta/ändra storlek/fäst, återställ, växling till/från surfplattebredd, projekthistorik, sju teman och export. Tolv icke-datorfall kontrollerar telefon, iPad, bred touch, manuellt enhetsval och mindre datorfönster i ljust/mörkt tema. CE_BASELINE_ROOT kan ange föregående källversion för pixeljämförelse utanför den beställda ikonändringen och varierande status-/versionsfält.
- `node tests/ce-signature-theme-v357.cjs`: 21 tema-/enhetskombinationer, verkligt ritad/sparad underskrift, fält-/bakgrundsfärger och oförändrade signaturbytes/datumval när temat växlas.
- `node tests/ce-file-export-v312.cjs`: 30 riktiga PDF-filer i ZIP, dörrspecifika värden, urval, numrering, signatur-/dokumentvalidering, återställning vid skärmbyte samt offline-export/återladdning.

Chromium-tester ersätter inte kontroll på fysisk iPhone eller iPad. TestFlight-distribution kontrolleras separat från webbpubliceringen.
