# SmartMatch TEST v36.88 – endast hittade positioner i Ritning & dörrkort

På användarens begäran tas Läs kontrollpunkter (GS/Alla/Eget sökord) och Lägg till position / koppla dörrkort bort från den synliga gruppen. Den manuella positionens formulär döljs, och kort utan funnen ritningsposition visas inte längre som åtgärdsrader för manuell placering. Hittade positioner och befintliga kopplingar visas fortsatt.

Befintligt kontrollpunktsuttag och sparade läslägen behålls under ytan så att tidigare projektdata inte ändras av en UI-förenkling. Formulärets DOM finns kvar dolt för befintliga event handlers. Den låsta tabellregeln och dörrkortsidentifieringen från v36.87 är oförändrade.

Verifierat JavaScript-syntax, borttagna UI-anrop, dolt formulär med CSS-skydd och identisk fast TEST-entry. Ingen ändring i Kontrollflöde eller native iOS/TestFlight. v36.87 bevaras, nya versionsmärkta resurser och lokala nycklar.
