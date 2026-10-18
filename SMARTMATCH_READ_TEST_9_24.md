# SmartMatch Avläsning TEST 9.24

TEST 9.24 rättar ett avgränsat fel där en produkt syntes i **Hela avlästa tabellen**, men inte blev en kontrollpunkt att bocka av. Felet kunde bland annat drabba **31 Dörrstängare DC700** under Övrig utrustning och magnetprodukter under Larm/Passer.

## Orsak

Råtabellen var korrekt avläst och innehöll både produkten och montageansvaret GS. I vissa PDF- och OCR-resultat fick den korta GS-rutan i kolumnen **Monteras av** en något annan höjd än produkttexten. GS-rutans mittpunkt kunde därför hamna några bildpunkter ovanför produktradens mittpunkt.

Tabelläsaren uppfattade då GS som en separat rad. Produkten fanns kvar i råtexten, men GS kunde inte säkert kopplas till samma produktrad. Därför lämnades exempelvis DC700 eller magneten utanför den strukturerade GS-listan och blev ingen punkt i dörrkortets checklista.

## Rättning

Tabelläsaren jämför nu den synliga lodräta överlappningen mellan GS-rutan och produktens textrutor. En kort GS-ruta som ligger strax ovanför eller nedanför men fortfarande tillhör samma visuella tabellrad kopplas till den raden.

Avgränsningen är fortsatt försiktig:

- endast GS i montagekolumnen räknas som GS-arbete
- en verklig efterföljande produktrad utan montageansvar tas inte med
- sektionsgränser och andra GS-rader får inte korsas
- produktnamn, modellbeteckningar och ansvarstext ändras inte

## Så kompletterar du ett befintligt projekt

1. Öppna den färdiga projekt-PDF:en i **Avläsning TEST 9.24**.
2. TEST 9.24 läser de redan sparade ordpositionerna lokalt och kompletterar de strukturerade GS-raderna. Ingen OCR eller ritningsmatchning startas.
3. Klicka på den länkade stämpeln för dörren där en produkt saknades.
4. Kontrollera att produkten nu ligger under rätt avsnitt, exempelvis **Övrig utrustning** eller **Larm/Passer**, och kan bockas av.
5. Om projektet saknar sparade ordpositioner: kontrollera **Hela avlästa tabellen**, tryck **Läs om detta kort**, granska resultatet och spara produkterna för kortet.
6. Spara projekt-PDF:en när kompletteringen är klar.

Omläsningen använder det sparade tabellområdet för just det öppna dörrkortet. Ritningen och alla andra kort behöver därför inte läsas om.

## Bakåtkompatibilitet

- Befintliga projekt-PDF:er öppnas utan ny fullständig avläsning. Sparade tabellord repareras lokalt med den nya parsern.
- Alla befintliga arbetsrader behålls; reparationen lägger endast till GS-produkter som tidigare föll bort.
- **Läs om detta kort** kompletterar den strukturerade GS-listan utan ny ritningsmatchning.
- Ritningskopplingar, redan bockade punkter, egna texter, egna punkter, antal och tider behålls.
- TEST 9.23 och äldre snapshots samt deras lokala arkiv ändras inte.
- Tidsberäkningen från TEST 9.23 använder den kompletterade produkten när den har fått en kontrollpunkt.
- Standard-SmartMatch, Ritningsverktyget, Kontrollflöde och auth ändras inte.

## Testbevis

Ett fokuserat automatiskt regressionstest bygger en tabell där de korta GS-rutorna ligger tre bildpunkter ovanför produktlinjerna. Testet kör samma ord både i normal och omvänd indataordning och verifierar att:

- **DC700** skapas som **Dörrstängare** under **Övrig utrustning**
- **MK240** skapas som **Magnetkontakt** under **Larm/Passer**
- båda punkterna har ansvaret GS
- giltiga produkter inte får varningen att produkt saknas

Regressionstestet finns i `tests/smartmatch-read-work-v9-24.cjs`. Faktiska projekt kan ha ytterligare PDF- eller OCR-varianter, så ett berört kundkort ska fortfarande slutkontrolleras innan projekt-PDF:en sparas. Använd **Läs om detta kort** om produkten ännu saknas.

Ett separat webbläsartest i `tests/smartmatch-read-work-migration-browser-v9-24.cjs` öppnar ett sparat TEST 9.23-projekt och verifierar att DC700 och MK240 återställs utan OCR eller ritningssökning. Testet kontrollerar samtidigt att koppling, tidigare avbockning, arbetsstatus, egen tid och egen kontrollpunkt bevaras.
