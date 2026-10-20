# Avläsning TEST 9.84 – GS-material per ritningsposition

Användarbeslut 20 oktober 2026: projektmaterial ska samlas från varje placerad ritningsposition och dess avlästa GS-arbetsrader. Ett dörrkort som används av tre GS2-positioner bidrar tre gånger med sitt material, multiplicerat med varje produktrads antal. Flera legitima rader för samma produkt på samma kort behåller sina mängder. Ett avläst kort utan ritningsposition bidrar inte med en extra uppsättning material. Originalkortet finns kvar som avläsningsunderlag.

GS-ansvar följer med från arbetsraden in i material- och tidsberäkningen. Uttryckliga DT-rader och rader där GS bara är leverantör räknas inte som GS-montage. Egna tillägg och extraantal behålls. Ingen ny OCR-, tabell-ID- eller ritningsmatchningsregel införs.

## Redigering och sammanslagning

Produktnamn och kategori kan ändras direkt i Projektmaterial, även för en produkt som matchar produktlistan. Rättningen sparas som en projektkoppling; originalets arbetsrader, positions-ID:n och avprickningar behålls. När användaren rättar en felaktig benämning till en befintlig produkt summeras mängderna på en rad. Extraantal på både käll- och målprodukten bevaras, även om källans extraantal ändras samtidigt. Sammanlagt extraantal över 999 avvisas innan någon ändring skrivs.

Kända produkter använder produktlistans tid. Saknad matchning visas som okänd tid. Modellbeteckningar gissas inte ihop: DC700X, DC700 och DC700 AC förblir olika tills användaren uttryckligen rättar namnet. Säker normalisering av produktlistans identiteter, exempelvis DC-700/DC700 och 21250/212-50, använder samma katalogprodukt och rad. Egna projektbenämningar kan bevaras utan att ändra grundkatalogens namn.

Tid visar samma summerade material och extraarbete i en läslista utan redigeringsfält. Projektets egna kategorier visas där efter redigering. Det tidigare beteendet att låsa även projektnamnet till produktlistan ersätts av den nya beställningen; kända produkters stycktider ändras fortsatt i produktlistan.

## Lista och sparning

Materialet visas i en kompakt lista. På dator ryms namn, extraantal, stycktid, kategori och radknappar tillsammans. På telefon delas samma kontroller i korta rader. Växlande ljusa/mörka radbakgrunder följer temat och räknas om efter sökning. Varje produkt visar antal och antal ritningspositioner. Produktlista-knappen öppnar katalogposten; Spara rad sparar projekträttningen.

Projektmaterialets egna namnkopplingar, kategorier, extraantal och katalog följer fortsatt projekt-PDF:en enligt 9.82. Namnutkast vid verklig katalogkonflikt och PDF-sparningen från 9.83 bevaras.

9.84 använder intern build 36.227 och app/cache 2.4.452. Föregående 9.83 är oförändrad. Startsida och fast testadress följer 9.84.

## Verifiering

`tests/smartmatch-position-materials-v9-84.cjs` använder en verklig femsidig projekt-PDF med fyra positioner på två ritningar, tre dörrkort, upprepade GS2-positioner, flera GS-produktrader för samma artikel, explicit DT-arbetsrad och en leverantörsrad med GS utan montageansvar. Testet verifierar per-position-mängder, att oplacerade kort inte räknas, okänd OCR-variant, uttrycklig rättning till DC-700 och sammanslagning med Dc700, fortsatt åtskillnad mot Dc700 ac samt sammanslagning där båda produkterna har extraantal. Projektkategori ändras, Tid kontrolleras som läsvy, originalpositioner och avprickningar jämförs och riktig projekt-PDF öppnas i en ren webbläsare med motstridig grundkatalog. Mängder, namn och kategori återkommer. Växlande radfärger, knappgeometri och horisontell bredd kontrolleras i ljust/mörkt tema på dator och iPhone-profil i Chromium.

Den tidigare fullständiga katalogregressionen på dator samt PDF-materialöverföring och export med namnkonflikt passerar. Riktade katalog-, utkast-, Excel-, exportkö-, metadataskrivar-, protokollnavigation- och lokala sparningstester passerar också. Fysisk Safari/iOS har inte verifierats.
