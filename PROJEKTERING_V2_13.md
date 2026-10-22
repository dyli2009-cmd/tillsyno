# Projektering 2.13 – fyll luckor i kortserien och räkna endast GS-material

Nya kort, kopior och Ändra bara denna dörr söker alltid från det lägsta numret i aktuell serie. Finns GS1:1 och GS1:3 efter att GS1:2 raderats föreslås GS1:2. När tvåan skapats igen hoppas den befintliga trean över och nästa lediga nummer blir GS1:4. Befintliga kort, produkter och placeringskopplingar numreras aldrig om.

Orsaken till tidigare överhoppade luckor var att radering av kortet behöll dess stencil, vilket reserverade numret. En oanvänd kortstencil kan nu återanvändas för att skapa kortet med samma beteckning. Mallens ID och utseende bevaras, medan den nya kopians produkter kommer från valt källkort. Detta fungerar även för kvarliggande stenciler efter radering i äldre projekt; ingen raderingshistorik eller formatändring behövs. Sparade kort, befintliga placeringar, symboler och normaliseringskonflikter reserverar fortsatt sina beteckningar. Att bara radera en fysisk placering raderar inte ett separat sparat kort.

En ny stencil behöver ett eget ledigt namn. Därför använder Ny stencil en separat nummersökning som fortsatt hoppar över alla befintliga stencilmallar. Vanlig kortskapning och kopiering kan däremot använda en befintlig tom kortmall. Ogiltiga eller upptagna kopienamn, avbrutna val och låsta placeringar behåller sina tidigare skydd. Projektformatet är fortsatt schema 2 utan nya preferensfält.

Material och arbetstid räknas nu endast från placerade GS-dörrkort. DTS, DGS100, DBL, WC, HWC och andra beteckningar utanför GS-serien ingår inte, även om de har ett sparat dörrkort med produktrader. Fristående symboler räknas inte som material oavsett beteckning. De finns kvar på ritningen, i översikten och i vanliga projekt-/dörrkorts-PDF:er. Materialvyn anger kort utanför GS-serien separat.

Nya GS1:1-kort och äldre GS1, GS4-A och bindestrecksvarianter som GS-4 omfattas. Endast GS-kortens antal bidrar när samma produkt också finns på ett DTS-kort. Befintliga produkttider bevaras i projektet; rader utanför GS kan inte öka materialantal eller total arbetstid. Armbågskontakter räknas fortsatt gånger två. Material-PDF och CSV använder samma GS-underlag och kontrollerar källorna.

Nya filer används för HTML/CSS, huvudkod, data, bibliotek, material och PDF. Den stabila projekteringsadressen visar 2.13 och Home/sw visar v2.4.483. Canvas, sökning, panelstorlekar, auth och service workerns cachelista är oförändrade. Den separata Avläsningen är fortsatt oförändrad och stöder ännu inte kolonbeteckningar.

Verifiering omfattar radering med kvarvarande trea, återanvändning av tom stencil med eget ID/utseende, redan borttagna kort från 2.12, nya/kopierade/privata kort, avbryt/ångra/återställ samt PDF-/projektfils- och återöppningsflöden. Materialtester omfattar sparade DTS-kort, andra icke-GS-kort, identiska produkter i GS/DTS, GS-varianter, tid och export. Webbläsarkontroller använder dator och emulerad iPad/iPhone. Inga bilder eller skärmbilder skapas.
