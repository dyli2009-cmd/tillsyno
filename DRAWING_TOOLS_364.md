# Ritningsverktyg v2.4.364 – analysera hela PDF

Beställt den 16 oktober 2026: samla analys, dubblettkontroll och storleksmätning i Ritningsverktyg. Avläsning TEST 9 och övriga arbetsflöden ändras inte.

## Arbetsgång

1. Öppna PDF-filen och välj **Verktyg → Analysera PDF → Analysera hela PDF**.
2. Läs rapporten över samtliga kvarvarande sidor: identiskt PDF-innehåll, inbäddade bilder, teckensnitt, bilagor, metadata och uppskattad oanvänd data.
3. Granska föreslagna dubblettsidor. Välj ett exemplar att behålla och kryssa uttryckligen i de sidor som ska tas bort. Inga sidor väljs automatiskt. **Ångra** och **Gör om** fungerar även här.
4. Välj **Rensa förlustfritt och mät**. Arbetskopian packas om, identiska bildobjekt återanvänds och objekt som inte längre nås från dokumentet tas bort. Verklig filstorlek visas före/efter.
5. Välj **Spara PDF** för att spara den verifierade arbetskopian. Originalfilen skrivs inte över automatiskt.

Tidigare rubrikgruppering finns under **Jämför markerad text**, med varning att samma rubrik kan finnas på olika kort. Kvalitetsval och tidigare exakt mätning finns under **Storlek och exportval**. De separata överlappande menyerna är ersatta av en gemensam analysmeny. Manuell rensning, döljning, beskärning, zoom och uppdelning behålls.

## Vad jämförs och bevaras?

Helsidesjämförelsen omfattar innehållsströmmar, resurser, effektiva sidmått/rotation och markeringarnas/stämplarnas uppgifter. Lika rubrik räcker aldrig för att föreslå en helsidesdubblett. Jämförelsen gäller exakt PDF-innehåll; visuellt lika sidor med olika kodning eller struktur kan därför förbli separata. Sidor som inte kan jämföras fullständigt föreslås inte som dubbletter.

Förlustfri rensning behåller sökbar och osynlig text, vektorer, stämplar och deras koordinater, formulär, lager, bilagor och projektdata. Dolda lager och markeringar redovisas, men tas inte bort automatiskt. Innehåll under en vit ruta eller utanför beskärningen kan fortfarande ha en funktion. Verktyget försöker inte gissa att sådant kan raderas.

Före och efter ompackningen jämförs normaliserade fingeravtryck för varje kvarvarande sida och dokumentets katalog/metadata. Vid skillnad godkänns ingen rensad fil. Original används om ren ompackning inte ger en mindre fil. Digitalt signerade filer kan analyseras; rensning och dubblettborttagning är spärrade. Analys/rensning kan avbrytas mellan PDF-stegen. Innehåll laddas inte upp till någon analysserver.

En ny analys krävs efter ändrat sidval eller andra ändringar av arbetskopian. Rensningsknappen använder alltid förlustfri kvalitet och blockerar borttagning av text, färger och kommentarer. De tidigare bildbaserade kvalitetsvalen finns kvar som uttryckliga exportalternativ och ger inte samma bevarande som förlustfri rensning.

## Verifiering

- `node tests/drawing-analysis.cjs`: riktiga PDF-objekt, skilda produkter med samma rubrik, andra stämpeluppgifter/rotation, oanvänd data, bildåteranvändning, formulär, bilagor, lager, projektdata, sidborttagning, avbrott och signaturspärr.
- `node tests/drawing-analysis-browser.cjs`: hela analys-/sparflödet i dator-, iPhone- och iPad-vyer, uttrycklig dubblettborttagning, ångra/gör om, avbryt/starta igen och oberoende PDF.js-jämförelse av pixlar, text och markeringar.
- Befintliga `drawing-card-groups.cjs`, `drawing-card-groups-browser.cjs` och `drawing-export-v360.cjs` kontrollerar bevarade funktioner för textgruppering, markering, beskärning, bildimport, uppdelning och export.

Samtliga ovanstående tester passerade. Dator- och iPhone-rapporten har även bildgranskats. Ett syntetiskt stresstest med 250 MiB oanvänd bilddata (262 151 928 byte totalt) analyserades och rensades med samma innehållskontroller; resultatet blev 3 495 byte. Den stora besparingen kommer från testfilens avsiktligt oanvända data och är inte ett mått på förväntad besparing i kundfiler.

Storleksuppgifter i rapporten är uppskattningar av datadelar. Slutlig besparing mäts först efter ompackningen. En stor fil kan redan vara väl komprimerad och behöver inte bli mindre. Användarens egen cirka 250 MB stora PDF har inte funnits tillgänglig för test. Webbläsartester ersätter inte ett test på fysisk iPhone/iPad; stora filer kan kräva mycket minne.
