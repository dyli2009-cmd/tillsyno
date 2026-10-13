# SmartMatch SLR TEST v36.131 — markera fem dokument kontrollerade

## Funktion på vald dörrautomatik
En ny knapp **☑ Markera fem dokument kontrollerade** ligger precis före den vanliga **Klart**-knappen i SLR-dokumentmappen. Den gäller enbart de fem vanliga dokumenten:
1. Riskanalys
2. Beskrivning av maskin
3. Loggbok
4. EG-försäkran – tillverkare av maskin (intern nyckel: Tillverkarens försäkran)
5. Egenkontroll

Knappen laddar befintliga mallar och kräver att alla fem finns. Vid ett tryck visas en bekräftelse med den aktuella dörrens beteckning och exakt vilka fem mappar som godkänns. Endast efter bekräftelse sätts `reviewedFolders[door.id][category]=true` för dessa fem.

**Produktlista och CE-skylt berörs inte** av massmarkeringen. De kontrolleras separat. SLR 100 % och dörrens `Klart` kräver som tidigare att alla sju mappar är kontrollerade och produktlistan har giltig GS-källa. Om de fem är de enda genomgångna blir det cirka 71 % totalt, inte automatiskt 100 %.

Om någon av de fem mallarna saknas ändras inget och användaren får ett begripligt fel. Ingen annan dörrautomatik, inte heller samma Med glas/Utan glas-profil, markeras klar. Redigering efter granskning återöppnar berörd mapp som i tidigare version. Efter granskning blir knappen **✓ Fem dokument kontrollerade** och inaktiv för samma dörr; enskilda mappar kan fortfarande öppnas igen.

## Omfattning
Isolerad SLR-TEST v36.131. Kopia från v36.130 med ny versionsmärkning, uppdaterad fristående SLR-modul och liten CSS. Egenkontroll/SLR-procentetiketter från v36.130, sparformat, GS-matchning, produktlista, PDF-generering, Kontrollflödet och ordinarie app/iOS påverkas inte. `smartmatch-slr-test.html` är fast testadress och pekar på v36.131. v36.130 bevaras.

## Verifiering
Testa med två dörrautomatiker, 50 %-status på fem dokument, användarbekräftelse ja/nej, avsaknad av mall, orörd Produktlista och CE-skylt, och att procenten överlever PDF-sparning och återöppning. Både dator och iPhone/iPad behöver köras praktiskt före produktionsbruk.
