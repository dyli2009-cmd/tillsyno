# Projektering 2.4 – kategorier, produktobjekt och material

Stencilbiblioteket har knappar för Alla, Dörrkort, Dörrautomatik, Dörrstängare, DFS, Armbågskontakter och Övrigt. När en kategori väljs visas dess stenciler. Egna kategorier väljs eller skapas i Ny stencil. GS-stämplar använder fortsatt ett gemensamt dörrkort per beteckning. DA, DS, DFS och egna produktstämplar behöver inget dörrkort. DFS är en egen produktkategori utan antagen teknisk betydelse; en tidigare egen DFS-stencil skrivs inte över.

## Produktuppgifter på varje placering

Dubbelklicka eller dubbeltryck på en produktstämpel, välj Produktuppgifter i snabbmenyn eller använd knappen under Vald markering. Fyll i objektnummer, typ/produkt, antal och anteckning. Uppgifterna hör till placeringen. Kopiering och inklistring behåller modell, antal och anteckning men tilldelar ett nytt ledigt objektnummer. Egna objektnummer kontrolleras för dubbletter. Teknikern kan komplettera uppgifterna även när ritningspositionen är låst; geometrin förblir låst.

Produktstämplarna visar kod, objektnummer, kort typtext och effektivt antal inom den befintliga stämpelformen. Långa uppgifter finns fullständigt i dialogen och i projekt-PDF:ens produktförteckning. Ritningens panorering, zoom och storlekshandtag fungerar som tidigare.

## Material och beställningslista

Fliken Material samlar sparade produkter från alla placerade dörrkort och produktstämplar på samtliga sidor. Samma modell och komponent summeras över flera GS-beteckningar. Cylinder från båda sidor summeras som cylinder; armbågskontakt och öppnaknapp hålls isär. Underlag visar vilka beteckningar som bidrar till antalet. Sparade kort utan placerade dörrar räknas inte med.

- En produkt på GS1 räknas en gång per placerad GS1, med kortets angivna antal. En kopia av GS1 lägger till hela den uppsättningen.
- Armbågskontakt på dörrkort räknas alltid med faktor två: 2 GS1 × 1 uppsättning × 2 = 4 kontakter.
- En egen produktstämpel som klassas som Armbågskontakt använder också faktor två. Dialogen visar hur antalet uppsättningar blir antal kontakter.
- DA, DS, DFS och andra produktstämplar räknas med sitt angivna antal. De är separata placerade produkter; ingen osparad eller gissad koppling till ett GS-kort används för att ta bort produkter ur summan.
- Markeringar utan vald typ syns som ofullständiga produktrader. Materialfliken anger vilka uppgifter som behöver fyllas i före beställning.

Sök i listan och välj Skriv ut lista · PDF för ett utskrivbart beställningsunderlag, eller CSV för vidare arbete. Appen, CSV och PDF använder samma beräkning. Produktnamn radbryts i list-PDF:en; långa listor får flera sidor. Alla aktuella produktrader ingår i exporten även när en sökning begränsar vyn.

## Lämna vidare och fortsätt arbeta

Exportera PDF samlar originalets ritningssidor med aktuella stämplar, alla sparade dörrkort och en produktförteckning med fullständiga objektnummer, modeller, antal och anteckningar i samma fil. Ren originalritning och redigerbart projektinnehåll följer med. Öppna PDF:en i Projektering för att fortsätta och komplettera produktuppgifterna. Spara projekt ger samma redigerbara innehåll som en flyttbar JSON-fil. Materiallistans PDF är en separat utskriftslista.

Schema 2 behålls med stencilkategori och produktuppgifter på placeringarna. Äldre projekt får säkra standardvärden och unika objektnummer; tidigare DFS-data bevaras. Materialantal lagras inte som manuella räknare utan beräknas från sparade uppgifter och aktuella placeringar. Lokal sparning, historik och importer använder fortsatt atomisk validering före byte av aktivt projekt.

Nya versionerade app-, skal-, data-, material-, canvas- och PDF-filer används. Tidigare versioner, Avläsning, Kontrollflöde och behörigheter är oförändrade. Ingen bildgenerering eller skapande av skärmbilder har använts i arbetet.

Verifiering: nya data-, material-, PDF- och webbläsartester för 2.4, tidigare modellregression och tidigare canvasregression mot den nya visningsmodulen. Dator samt emulerad iPad/iPhone täcker kategorier, produktuppgifter, unika kopienummer, låst geometri, GS-multiplikation, armbågskontakter ×2, sökning, PDF/CSV och exakt återöppning via PDF/JSON/IndexedDB. Fullständiga långa produktuppgifter och sidbrytning verifieras i sökbar PDF. Fysisk Safari/iPhone har inte testats.
