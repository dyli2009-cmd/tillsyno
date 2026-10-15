# CE-filexport: löpnummer först – v2.4.314

Användarbeslut 15 oktober 2026: dokument för samma dörr ska hållas ihop vid sortering på filnamn, fortfarande som separata filer utan undermappar i ZIP.

Filexporten heter exempelvis `01-Loggbok-57617-14-24-1.pdf`, `01-EG-försäkran-57617-14-24-1.pdf` och `02-Loggbok-57617-14-24-2.pdf`. Prefixet kommer från dörrens befintliga löpnummer, aldrig från platsen i urvalet. Minst två tecken används. Om hela projektets längsta löpnummer har tre eller fler siffror fylls alla prefix till samma bredd, även vid export av en enda dörr. Exempel: 001, 010, 100. Hela maskinbeteckningen bevaras i filnamnet. Äldre importerade poster utan separat löpnummer använder ett numeriskt slutsuffix i sourceText om ett sådant finns; inget nytt dörrnummer uppfinns.

Ändringen gäller Spara valda filer (ZIP). Innehåll, signaturer, projektdata, individuell PDF-export och komplett mappexport ändras inte. ZIP-namn och namnkollisionsskydd bevaras. Den befintliga CE-exportregressionen verifierar 30 filer, rätt individuell PDF-text, prefix 01–10, val av bara dörr 2/8 utan omnumrering, tresiffrig bredd från hela projektet, saknade dokument/signaturer, ändrat projekt, kollisioner och offline. PDF-renderaren är oförändrad.

Webb inklusive mobil-/iPad-webbläsare. Native-källan saknar CE-modulen och speglar endast den gemensamma versionen.
