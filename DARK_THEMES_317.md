# Fler mörka teman – Tillsyno v2.4.317

Beställt 15 oktober 2026: fler valbara färgteman med mörk omgivning, ljus text och fokus på den aktuella arbetsytan.

Sju fasta teman: Isblå, Nordisk dimblå, Havsbris, Sand & blå samt nya Midnattsblå (night), Grafit (graphite) och Mörkgrön (pine). De mörka varianterna har olika bakgrunds-/panel-/accentfärger. Ingen fri färgblandare har införts. Befintligt tema och standardval ändras inte automatiskt. Välj via startsidans Färger och enhet och tryck Spara val. Samma localStorage-nyckel och enhetsval används. Avbryt återställer sparat val.

CSS/JS-lagret styr endast gränssnittet. Tidiga HTML-bootstraps känner igen de nya nycklarna så att ett sparat mörkt tema inte ersätts med dimblå under laddning. Inga filter eller inverteringar läggs på dokument, canvas eller bilder. Skrivfält över CE:s vita PDF-original behåller dokumentets mörka bläck. Granskade egenkontrollsymboler behåller sina faktiska statusfärger. Egna ljusa !important-bakgrunder i protokoll, sidopaneler, formulär och vissa verktygsrader har avgränsade mörka UI-regler.

Verifierat:
- Sju val, tre mörka paletters huvudtext/sekundärtext/primärknapp med kontrast minst 4,5:1, sparande, omladdning, avbryt och återgång till ljusa färger.
- Startsida, ordinarie Kontrollflöde, Dörrautomatik/Lås, SmartMatch TEST v36.106, äldre Projektflöde, CE och Ritningsverktyg samt inloggning. Tidigt temaval, enhetsval och bredder 390/768/1366. Visuell granskning av mörka arbetsvyer och telefonens temaväljare.
- Verkliga kontrollpunkter i 320/390/768/1200 px, utan ändrad geometri eller kolumner. Alla tre resultat, anmärkningar, egna kontrollpunkter och ångra fungerar. Statusknapparnas bakgrund/text/ram är identiska mellan ljus och mörk palett.
- Verklig serviceöversikt, flytt/resize, kundmall med exakt pixeljämförelse mot export, PDF-länkar, arbets-PDF återöppning, ny service, undo och offline.
- Produktionsrouting och låst importer/snapshot oförändrade. Native-HTML har tidig temaläsning och giltiga temaresurser; identiska CSS-filer i webb/native.

Webb och iOS-källa speglas. Native-sidor som ännu saknade det gemensamma lagret har fått CSS/JS + tidig temaläsning, utan ändring av deras arbets- eller authkod. Ingen signerad iOS-byggnad, fysisk iPhone/iPad eller TestFlight-publicering har verifierats här. Den separata native-källan saknar fortfarande CE-modulen. Frysta testversioner behåller sina egna filer; endast aktiva skal och det uttryckligen beställda gemensamma utseendelagret ändras.
