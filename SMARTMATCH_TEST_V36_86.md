# SmartMatch TEST v36.86 – första vänstra tabellrutan

Dörrkortets ID läses endast från första tabellradens vänstra cell. Övriga kolumner används inte för identifieringen. En upptäckt tabell med otydligt ID faller inte tillbaka till höger cell eller senare utrustningsrader. Befintlig normalisering och ritningsmatchning behålls: GS 1 blir GS1; WC GS1 1 blir GS1.

Ny versionsmärkt HTML/JS/CSS och identisk fast TEST-entry. v36.85 bevaras. Separata lokala lagringsnycklar. Kontrollflöde och native iOS/TestFlight ändras inte.

Verifiering: node tests/smartmatch-first-cell-v36-86.cjs och node --check project-workspace-smartmatch-v36-86.js. Fall täcker vänster/höger-konflikt, tre kolumner, splittrade PDF-textfragment, projektrubrik ovanför tabell och otydlig vänstercell. Ingen riktig användar-PDF har provats.
