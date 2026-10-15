# Kontrollpunktstabell – TEST v14

Appens protokoll visar kontrolltext och tre symbolval på samma rad: – Ingår ej, ✓ Klart utan anmärkning, × Klart med anmärkning. Rubrikerna visas en gång överst; på telefon förkortas de till Ingår ej / Utan anm. / Med anm. Full benämning och kontrollpunktsnummer finns i varje knapps tillgängliga namn. Val med anmärkning öppnar de befintliga anmärkningsfälten direkt under raden. Exakt ett svar per kontrollpunkt, samma sparade result-värden och statusregler som tidigare.

Signaturfältet i appens objektuppgifter är dolt. Projektsignaturen och rapportens uppgifter/layout är bevarade.

Egen kontrollpunkt öppnar ett formulär under listan. Ändra öppnar formuläret vid den aktuella raden. Arbetsytan ligger kvar; ingen ny appvy, dialog eller popup öppnas. Spara/Avbryt, direkt borttagning och Ångra fungerar som tidigare. Nästa nummer räknas från största befintliga 1.N samt basprotokollet: 18 grundpunkter följs av 1.19, 1.20 osv. Lediga nummer mitt i listan fylls inte automatiskt. Egna punkter får samma symbolval och anmärkningsfält som baspunkterna och sparas i befintligt customChecks-format.

Verifiering: Chromium 320/390/768/1200 px, tre justerade symbolkolumner och kontrolltext på samma rad, tillgängliga knappnamn, textstorlekar A–/A+, inga överflödande bredder, dolt signaturfält, svar och anmärkningsfält, egna punkter 1.19/1.20, avbryt/ändra/ta bort/ångra och lokal lagring. Full serviceöversiktsregression med faktisk PDF-export, kundmall, länkar, återöppning och offline passerar. Rapport/PDF-funktionerna är byteidentiska med TEST v13. Låst import, tidigare runtime-filer, ordinarie Kontrollflöde och iOS lämnas oförändrade.

Test: tests/controlflow-checklist-v14.cjs. Föregående TEST v13: v13/all-in-one.html.
