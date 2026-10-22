# Projektering 2.3 – DA, DS och egna stämplar

DA är dörrautomatik och DS är dörrstängare. Båda är stämplar utan dörrkort. Överst visas antal markeringar, sparade dörrkort, dörautomatiker och dörrstängare. Produktantalet beräknas från aktuella placeringar på alla ritningssidor och följer placering, duplicering, inklistring, borttagning, ångra och gör om. Två GS8-positioner använder ett gemensamt dörrkort; två DA-positioner räknas som två dörautomatiker.

I Ny stencil väljs **Dörrstämpel med dörrkort** eller **Dörrstämpel utan dörrkort**. För en stencil utan kort väljs även **Räknas som**: ingen separat produkt, dörrautomatik eller dörrstängare. En egen DBL-DS kan exempelvis räknas som dörrstängare. En del av en egen beteckning används inte för att gissa produktkategori. Biblioteket visar stämpelns användning och produktnamn; DA och DS kan även sökas med sina produktnamn.

Den kombinerade standardstencilen DADS är borttagen ur biblioteket. Redan sparade DADS-placeringar och deras stencildata finns kvar i äldre projekt och kan flyttas eller tas bort på ritningen. De räknas inte automatiskt som både DA och DS. Äldre DA/DS-symboler utan produktmetadata får rätt klassning; ett äldre uttryckligt DA-dörrkort behålls som dörrkort.

Förhandsvisningen har en egen SVG-yta med ett centrerat textfält som anpassas efter bredd och höjd. Den tidigare nästlade stämpelstilen som gav dubbla ramar och överlappande text är borttagen. Menyn **Justera / fördela** är också borttagen. Direkt dragning, storlekshandtag, rotation och egenskaperna under Vald markering finns kvar.

**Exportera PDF** skapar en fil med alla ritningssidor och aktuella stämplar, följt av alla sparade dörrkort. Originalritning och projektdata följer också med så att PDF:en kan öppnas för fortsatt projektering. Sparade kort, produktklassning och antal återställs via samma projekt-PDF, JSON och lokal lagring. Mängdförteckningens CSV innehåller separata rader under Ritningsprodukter för placerade DA/DS och egna produktklassade stämplar, utöver dörrkortens utrustningsrader.

Nya versionerade skal-, app- och datafiler används från den fasta projekteringsadressen. Canvas 2.2, befintlig lagring och PDF-byggare återanvänds. Schema 2 behålls med stencilfältet productType. Äldre inställningar för det borttagna justeringsverktyget filtreras vid inläsning. Tidigare versionerade filer, Avläsning, Kontrollflöde och behörigheter ändras inte.

Verifiering finns i tests/smartmatch-projektering-v2-3-data.cjs och tests/smartmatch-projektering-v2-3-browser.cjs. Genererade PDF-underlag används för produktantal, delade kort, historik, SVG-förhandsvisning, äldre projekt, PDF/JSON/IndexedDB och kombinerad export. Webbläsartesterna kör dator-, iPad- och iPhone-vyer med emulerad touch. Fysisk Safari/iPhone har inte testats.
