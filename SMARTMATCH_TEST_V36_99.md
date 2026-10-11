# SmartMatch TEST v36.99 – närmaste korrekta GS med dörrautomatik

Beslut: 2026-10-11. Område: **Verktyg → Koppla dörrautomatik**. Den nya uttryckliga instruktionen ersätter v36.97–v36.98:s prioritet för exakt modell/ID framför fysisk närhet, som i verkliga projekt ledde till att flera olika automatiker kunde peka långt bort mot GS2.

## Korrigerad regel
1. Läs automatikerna på ritningen och deras fysiska positioner precis som tidigare. En fysisk automatik behåller egen kontroll och SLR.
2. För varje automatik: granska **GS-positionerna på samma ritningssida**, men bara de som har ett kopplat dörrkort som bekräftar dörrautomatik.
3. För just pilkopplingen är **Dorma ED100/ID100 (typ 24), ED200/ID200 (typ 17), ED250/ID250 (typ 37) kompatibla**. Detta ändrar aldrig maskintyp, automatiks ID eller protokoll.
4. Kräv fortsatt att fullständigt objekt och sista märkningsnummer stämmer om dörrkortet faktiskt anger dessa. Andra inkompatibla maskintyper väljs inte.
5. **Välj alltid närmaste verifierade GS geografiskt.** Modell/ID hjälper att godkänna rätt kandidat och avgöra likvärdiga alternativ, men får **inte** dra en pil förbi en närmare godkänd GS.
6. Om enda godkända GS ligger orimligt långt från automatiken jämfört med närmaste fysiska GS och märkningens storlek: **ingen automatisk långpil**. Visa koppla manuellt.
7. Endast verklig geometrisk likhet mellan två likvärdiga GS ger manuellt val. Den gamla fyrpunkts-toleransen kunde dölja en annars säker pil.
8. Om tidigare version sparade en **obekräftad automatisk** GS-koppling räknas den om efter dörrkortsläsningen när projektet öppnas. **Manuellt bekräftade** kopplingar och frånkopplingar respekteras. Egenkontroller, SLR och anteckningar får inte raderas.
9. Högst **en synlig pil per fysisk automatik** även med äldre dubbla poster på samma plats. Olika fysiska automatiker får tillhöra samma GS/dörr.

## Kod och regressionskontroller
- `smartmatch-da-v36-99-module.js`: närmast först, ED200 som kompatibel ED-familj, ID200-stavningar, rimlighetsgräns för långpil, självkorrektion av äldre obekräftade GS-kopplingar.
- `project-workspace-smartmatch-v36-99.{html,js,css}`: egen testversion; kopierad till `project-workspace-smartmatch-test.html` som fast adress.
- `tests/smartmatch-nearest-ed-family-v36-99.cjs`: Node-regression med simulerade dörrkort, tre GS och tre DA, plus GS2-historik, långpil, dublett, manuellt sparat val.

**Verifiering:** 28 testassertioner med den riktiga JS-modulen i simulerad ritnings-/dörrkortsmiljö passerade före publicering, inklusive 3 automatiker som går till var sin närmaste GS, ED200 före långt bort GS2 med exakt ID, omräkning av tidigare auto-länk och bibehållna kontrollresultat. **Ingen verklig kund-PDF eller iPhone/iPad-webbläsarsession har testats i detta steg**, så faktisk PDF-läsning och mappning måste fortfarande kontrolleras på användarens projekt. Ingen ändring gjord i iOS/TestFlight, dörrkortets låsta första-ID-cell eller protokollsexporten.

## Versioner
- v36.98 finns kvar orörd som återgång. v36.99 är nu gällande TEST.
- Låsta regeln `SMARTMATCH_AUTOMATION_RULE_LOCK.md` uppdateras för närmast-giltig-GS i stället för ID-styrt fjärrval.
