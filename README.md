# dorrservice

> **Viktigt före ändringar:** Läs [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md). Där finns regler för modulgränser, versionshantering och hur Kontrollflöde/Projektflöde ska hållas separerade.

## SmartMatch TEST v36.103

Senaste separata TEST: Förenklad text i **Koppla dörrautomatik**-dialogen. Endast instruktionen "Rita en ruta kring dörrautomatikens ID. Sedan söker appen samma objekt på alla ritningssidor." visas. Funktionerna och GS/SLR-regeln från v36.102 är oförändrade. Fasta testadressen är uppdaterad.

## Tidigare GS-kontroll v36.102

[Senaste kontrollen av GS-koppling och SLR-källa (v36.102)](SMARTMATCH_TEST_V36_102.md) visar nu sparad GS mot föreslagen GS direkt i automatikdialogen och stoppar osäker källa till SLR. Korrigerad länk måste bekräftas av teknikern. Separat TEST, ingen TestFlight-uppdatering.

## Tidigare låst GS-regel v36.101

Senaste separata TEST: [högst en verifierad GS per fysisk automatik – säker framtida källa för SLR](SMARTMATCH_TEST_V36_101.md). DA-symbolen från v36.100 finns kvar som positionshjälp, inte som garanti att GS är rätt. Ordinarie Kontrollflöde och iOS är oförändrade.

## Tidigare spar-/uppdateringsflöde v36.71

Se [senaste implementerade spar- och uppdateringsflödet](SMARTMATCH_TEST_V36_71.md) och [sparad mall för kundens Egenkontroll](SMARTMATCH_MALL_EGENKONTROLL.md). TEST fungerar separat från ordinarie app.

## Fortsätt senaste SmartMatch-arbetet

**Starta här:** [SMARTMATCH_FORTSATTNING_2026-10-10.md](SMARTMATCH_FORTSATTNING_2026-10-10.md) – uppdaterad överlämning med beslut om PDF som projektfil, senaste TEST-versionen, 17 dörrautomatiker, Dropbox-buggen, tester och förslag på nästa steg.

## SmartMatch – sparade planer

- [SmartMatch TEST v36 – Koppla dörrautomatik direkt i ritningsvyn](SMARTMATCH_TEST_V36.md) – analysera efter att du öppnat PDF, eller koppla manuellt.
- [SmartMatch – dörrkoppling steg 1](SMARTMATCH_DORRKOPPLING_STEG1.md) – separat test för märkning, löpnummer, klickbara knappar och GS-positioner.
- [Samarbete för flera tekniker, automatisk dörrlåsning, offlinearbete, konflikter och Dropbox/Google Drive/OneDrive](SMARTMATCH_SAMARBETE_OFFLINE_PLAN.md) – planeringsdokument, inte implementerat.

Deploy trigger: 2.4.82
