# SmartMatch TEST v36.72 – närmaste GS som har dörrautomatik
11 oktober 2026. Nytt uttryckligt beslut: närhet får avgöra **bland GS vars tilldelade dörrkort faktiskt bekräftar dörrautomatik**. Den gamla v36.68-regeln om att helt förbjuda avståndsurval ersätts bara inom SmartMatch TEST.

Exakt automatik-ID väger tyngst, därefter samma maskintyp, därefter uttrycklig automatik utan modell. En närmare GS utan automatik, med fel maskin eller uttryckligt annat automatik-ID får aldrig väljas. En GS får inte få två automatiker; vid konkurrens prövas nästa lediga giltiga GS. Sparad manuell länk eller uttrycklig frånkoppling bevaras.

"Hitta alla automatiker" försöker även koppla befintliga okopplade markeringar. Pilritningen och skanningen använder samma dörrkortscache. Osäkra fall (oläsbart kort, inget tilldelat kort, praktiskt lika nära kandidater eller inget ledigt giltigt GS) får ingen gissad pil; i träfflistan syns "Saknar säker pil – Koppla manuellt" och manuell GS-länk kan väljas. Exakt GS-ID/kod/koordinater sparas i projekt-PDF för framtida SLR-information som ska läsas från det GS-tilldelade dörrkortet.

Ändrade bara versionerade SmartMatch TEST-filer. v36.71 bevaras. Existerande stabil PDF-renderare, revisions-export och lokal sessionsmodul återanvänds oförändrade från v36.71. Kontrollflöde, ordinarie Projektflöde, iOS/TestFlight orörda.

**Manuella acceptanstester återstår på fysisk enhet/riktig PDF:** närmast utan DA vs längre bort med DA, flera med samma modell, fel ID, manuellt GS10, saknat/oläsbart kort, dubbla pilar och återöppning av sparad projekt-PDF. Kan inte garantera automatisk pil där dörrkort saknar tillförlitligt underlag.
