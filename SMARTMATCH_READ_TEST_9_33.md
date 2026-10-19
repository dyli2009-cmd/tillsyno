# Avläsning TEST 9.33

Tabeller med ett tydligt rutnät bildläses cell för cell. Linjer identifieras även med mindre avbrott. Cellerna får vit marginal och förstoras upp till tre gånger inför OCR. Koordinater förs tillbaka till det ursprungliga markerade området. Sammanfogade celler delas inte vid en kolumnlinje som saknas på raden. Produkttext ändras inte med regler som tar bort inledande siffror.

Om ett tillförlitligt rutnät inte hittas används tidigare avläsning. PDF-text behålls; GS i Lev av eller Mont av gäller som i 9.32. Original-PDF och visning ändras inte. Cellvis bildläsning kan ta längre tid; framsteg visas per cell.

Verifiering:
- Användarens skärmbild: faktisk lokal Tesseract-läsning och produktparser ger 107 och 2356 utan extra ettor. Bilden ingår inte i källkod eller testdata.
- Syntetiskt webbläsartest med brutna linjer: 107, 2356, 6696 samt riktiga 1107, 12356 och 1 bevaras.
- Projektflöde, GS-regler, omavläsning, bockar, tid, PDF-export/återöppning på dator och emulerad iPad/iPhone.
- Omavläsning av enskilt kort och offline-cache.

För befintliga projekt: Läs om detta dörrkort och Spara produkter. Testet gäller uppladdad skärmbild, inte ursprunglig PDF. Ingen OCR kan garantera felfri text på alla bildkvaliteter.
