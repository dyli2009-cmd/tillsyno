# SmartMatch Avläsning TEST 9.25

TEST 9.25 bygger vidare på den sparade avläsningen i TEST 9.24. Den ändrar inte tidigare snapshots eller redan sparade projektfiler.

## Säkrare arbete på dörrkortet

- **Ta bort den här positionen** ligger bakom den lilla pilen bredvid **Passa** och kräver fortfarande en separat bekräftelse.
- Bulkknappen **Avmarkera** avmarkerar nu kontrollpunkterna på de valda dörrarna och sparar resultatet. Tidigare tömde den bara det visuella urvalet.
- **Alla**, **Rensa alla**, **Punkt**, **Extra tid**, **Beställning** och **Anmärkning** ligger samlade ovanför dörrens tid.
- Lokalt sparade projekt från TEST 9.24 visas även efter uppdateringen till TEST 9.25. De äldre databaserna läses utan att stora PDF-filer kopieras.
- Den valfria OCR-granskningen använder nu appens lokala Tesseract-filer och fungerar utan en extern CDN.

## Egna punkter och samma dörrkort

När en punkt läggs till väljs avsnittet Daglåsning, Nattlåsning, Övrig utrustning eller Larm/Passer. Punkten kan läggas på bara den öppna fysiska dörren eller på alla positioner som använder samma verkliga källdörrkort. Varje fysisk dörr får en egen bockning. Äldre egna punkter utan avsnitt fortsätter visas i den tidigare gruppen.

## Material och arbetstid

Tidsöversikten visar varje materialsort med redigerbart projektnamn, antal, tid per styck och beräknad totaltid. Blanksteg och bindestreck normaliseras när samma produkt summeras, medan meningsbärande skiljetecken och olika modeller hålls isär. En dörrspecifik tid har alltid företräde framför projektets produkttid, som i sin tur har företräde framför den allmänna tidstypen. Inställningarna bäddas in i projekt-PDF:en.

## Beställningar och anmärkningar

Varje fysisk dörr kan få beställningar och anmärkningar med text och historik. Aktiva beställningar markeras med ett lila **B** och aktiva anmärkningar med ett orange **!** på ritningen. Projektvyn delar upp Beställningar, Anmärkningar och Historik och kan öppna rätt fysisk dörr.

Under **Verktyg → Färgförklaring** kan en lokal legend placeras på valfri ritningssida. Den använder samma sparade bildnotering som foton och kan flyttas, ändras i storlek och följa med projekt-PDF:en.

## DS och DA

PDF-stämplar av typen **Dörrstängare** och **Dörrautomatik** får tydliga **DS**- och **DA**-etiketter i ett passivt lager på ritningen. Lagret använder stämpelregistret som redan lästes när filen öppnades; det startar ingen ny helsidesläsning eller OCR. Det skapar inga arbetspositioner och påverkar inte matchning, procent eller tid. Dörrkortssidor och andra stämpeltyper ignoreras.

## Avgränsning

Att skapa en helt ny fysisk dörrkortssida inuti en stor PDF blir en separat version. Funktionen kräver att hela PDF-filen skrivs om och verifieras atomiskt, vilket behöver egna minnes- och avbrottstester på dator och iPad.

## Kontroll

Releaseproven täcker bulkmarkering, sektionsval och källdörrkort, materialnormalisering och tidsordning, beställningshistorik, säkert borttagningsflöde, DS/DA-lagret, iPad-layout, lokal historik, offlinecache samt PDF-export med stor inbäddad projektdata och återöppning utan ny OCR eller matchning.
