# SmartMatch – låst regel för dörrautomatik och GS-koppling

**STATUS: LÅST enligt användarens uppdaterade beslut 2026-10-11.**
**Gällande kopplingsregel: TEST v36.100.** Föregående godkända objektsökning och placering från v36.92 behålls, men dess rena närmaste-GS-regel ersätts av dörrkortsverifierad GS-matchning. Den tidigare regeln finns dokumenterad som historik.

Detta är den gällande beteenderegeln för dörrautomatik i SmartMatch TEST. Läs även [samlingen av funktionsregler](SMARTMATCH_FUNCTION_RULES_LOCK.md). Äldre versionsanteckningar beskriver historik; de får inte återinföra äldre kopplingskrav som strider mot detta beslut.

## 1. Så använder man funktionen

1. Öppna ritningen och välj **Verktyg → Koppla dörrautomatik**.
2. Skriv en fullständig märkning som exempel och välj **Placera och hitta alla**.
3. Rita en ruta runt den första automatikens märkning, justera vid behov och tryck **Spara**.
4. Appen läser märkningen i rutan och söker automatiskt efter samma hela objektnummer på alla ritningssidor.
5. Varje fysisk träff får en egen tryckknapp för **Egenkontroll dörrautomatik** och **SLR-dokumentmapp**. Knappen hör till den träffens egen sida och position.
6. Appen läser dörrkortet för respektive GS och väljer närmaste kompatibla fysiska GS-position på samma ritningssida. En fysisk automatik får endast en GS-pil. Om tillräckligt underlag saknas visas manuell koppling i stället för en gissning.

**Hitta fler automatiker** ska kunna upprepa objektsökningen i det öppna projektet.

## 2. Hur märkningen ska förstås

Exempel: `20-83-92-3-24-10`.

| Del | Betydelse | Hur den används |
| --- | --- | --- |
| `20-83-92-3` | Objektnummer | Hela denna del är söknyckeln. Objektet får innehålla flera bindestreck. |
| `24` | Maskintyp | Typkoden läses på varje träff; 24 motsvarar Dorma ED 100 i maskinlistan. |
| `10` | Antal / sista märkningsnummer | Den sista delen sparas för just denna träff. Fältet heter internt serialNumber. |

De två sista delarna är maskintyp och antal/sista nummer. Alla föregående delar tillsammans är objektnumret. Antalet delar i objektnumret får inte hårdkodas till ett visst projekt.

Varje träff läser sin egen maskintyp och sitt eget sista nummer. Sökningen får inte begränsas till första märkningens maskintyp eller kopiera dess värden till alla träffar. Ett annat objekt som bara innehåller liknande siffror ska inte matcha.

## 3. Första placeringsrutan är avläsningskällan

Appen läser PDF-text och läsbara PDF-annotationer inom den placerade rutan.

- En entydig läsbar märkning i rutan används, även om det inskrivna exemplet skiljer sig.
- Flera olika märkningar i rutan kräver en tydligare placering; appen ska inte välja en på måfå.
- Om inget ID kan läsas i rutan används den uttryckligt inskrivna märkningen, med information om detta i status.

Detta gör att den verkliga märkningen på positionen kan bestämma objekt och maskintyp. Inskrivningen är ett exempel och en manuell reserv när texten inte går att läsa.

## 4. Sök hela ritningen och behåll varje fysisk träff

Sök både PDF-text och läsbara annotationer på samtliga ritningssidor. Text som PDF:en delar i flera fragment och lodräta märkningar ska kunna hanteras med hjälp av position och textriktning.

Ritningssidor får inte uteslutas för att en legend eller ritningsstämpel råkar innehålla ord som även finns på dörrkort. Dörrkortssidor ska identifieras separat. Klassningen måste kontrolleras i det verkliga appflödet.

Två representationer av samma märkning på samma fysiska plats ska ge en träff. Samma ID på olika fysiska platser ska behålla sina egna positioner. Ny placering på en redan befintlig märkning ska återanvända posten. Upprepad sökning ska inte skapa nya dubletter.

## 5. GS-pilen styrs av dörrkortet och närmaste rätta position – v36.97

Vid **Verktyg → Koppla dörrautomatik** läses automatikens fullständiga märkning på ritningen. Systemet går därefter igenom de identifierade GS-positionernas **egna kopplade dörrkort** och kontrollerar att kortet anger dörrautomatik. Fullständig märkning, maskintyp och eventuella skillnader i objekt/antal används för att undvika felkoppling. Kompatibilitetsundantaget omfattar ED100/ID100 (typkod 24), ED200/ID200 (17) och ED250/ID250 (37), i båda riktningar **endast för GS-pilen**, aldrig ommärkning av maskintyp. `ID250` rättades i v36.98 och `ID200` i v36.99. Samma objekt och sista nummer måste fortsatt stämma om kortet innehåller ett fullständigt automatik-ID.

**Urval – uppdaterat i v36.99 och fysiskt förankrat i v36.100:** Välj **närmaste fysiska GS på samma ritningssida vars eget dörrkort bekräftar dörrautomatik och är kompatibelt**. Fullständigt ID/typ används som kontroll av att GS-kandidaten är möjlig, inte för att välja en långt bort liggande GS framför en närmare giltig GS. Kompatibel ED-familj **åt båda håll för pilen** är 17 (ED200/ID200), 24 (ED100/ID100), 37 (ED250/ID250). Om dörrkortet innehåller komplett automatik-ID ska samma objekt och sista nummer gälla. Om närmaste verifierade GS trots detta ligger orimligt långt bort visas **Koppla manuellt** i stället för en lång pil. Endast två faktiskt lika nära, likvärdiga GS kräver manuellt val.

**Ny precisering i v36.100 efter kontroll av Snidaren-PDF (sida 3, Plan 0):** Den långa textmärkningens mittpunkt kan ligga mellan två GS-stämplar fast varje dörr har en separat `DA`-symbol. Fördela närliggande DA-symboler **en-till-en mellan unika fysiska automatikmärkningar** och mät sedan GS-avståndet från den tillhörande DA-symbolen. Om en tydlig DA-symbol inte kan identifieras används textrektangelns tidigare avstånd som reserv, med samma kontroller av dörrkort och långa pilar. Verifierat exempel: `200154-28-24-1 → GS4` och `200154-28-24-2 → GS2`. Båda dörrkorten anger ED100 (PDF s. 14 respektive 12). Se [TEST v36.100](SMARTMATCH_TEST_V36_100.md).

**Exakt en GS-pil per fysisk automatik.** Äldre dubbla poster på samma fysiska märkning får inte orsaka två synliga pilar; befintliga kontrollsvar, SLR och historik raderas inte. Två olika fysiska automatiker kan däremot dela GS när de tillhör samma dörr.

- En automatik utan verifierad GS behåller egen knapp, egenkontroll och SLR, och kan kopplas manuellt.
- Manuell korrigering vid avvikande dörrkort kräver uttrycklig bekräftelse.
- Tidigare manuellt bekräftade kopplingar och frånkopplingar bevaras vid omsökning.
- Vid återsökning och återöppning räknas endast automatiska, obekräftade kopplingar om till närmaste godkända GS, efter att dörrkort och eventuella läsbara DA-symboler har hämtats. Manuellt bekräftade val och bortval förblir orörda.
- För ändring av pilens spets används befintlig justering, utan ny dörrkoppling.

**Historik:** TEST v36.92 valde endast närmaste GS utan dörrkortskontroll. I v36.97–v36.98 prioriterades bevisningstyp (exakt ID/modell) så högt att fjärran GS kunde väljas före nära ED200 och vissa pilar saknades. **v36.99 ersätter detta med närmaste giltiga automatik-GS**, ED200-kompatibilitet och skydd mot för långa automatiska pilar. Fungerande objektsökning och projektsparande behålls.

Dörrkortets eget ID läses enligt [den låsta tabellregeln](SMARTMATCH_TABLE_RULE_LOCK.md). Automatikens märkning och dörrkortets ID är olika uppgifter med olika avläsningskällor.

## 6. Sparat arbete ska bevaras

Varje automatik har egna kontrollresultat, anmärkningar, SLR-uppgifter och koordinater. Sökning och koppling får inte skriva över dessa eller dela kontrolltillstånd mellan olika automatiker.

Befintliga äldre dublettkontroller får inte automatiskt raderas om de kan innehålla arbete. Rättning av en pil är inte tillåtelse att radera en egenkontroll.

## 7. Varför vi valde detta och vad som bekräftats

Användaren ville återställa ett fungerande arbetssätt: **placera första märkningen → hitta hela objektet → knappar på träffarna → pil mot närmaste GS**.

Tidigare dörrkortsfilter kunde hindra pilar. En annan faktiskt reproducerad orsak var att ritningssidor felklassades som kort och helt hoppades över av sökningen. Isolerade tester med en förberedd sidlista missade detta.

v36.92 testades därför genom den verkliga HTML-sidan och placeringsdialogen i Chromium. Snidaren gav 17 fysiska automatikträffar och 17 GS-pilar; Egenkontroll och SLR kunde öppnas och tidigare kontrolluppgifter bevarades. Därefter bekräftade användaren att funktionen fungerar. Detaljer och tester finns i [versionsdokumentet](SMARTMATCH_TEST_V36_92.md).

Bildbaserade automatikmärkningar har inte fått en ny OCR-funktion i v36.92. Denna regel är inte en garanti att alla oprövade PDF-format redan stöds.

## 8. Låset och framtida ändringar

**Principerna ovan får endast ändras efter ett nytt uttryckligt beslut från användaren.** Gällande version av GS-regeln är v36.97; v36.92 är historik för endast geometrisk GS-koppling. En annan uppgift i appen innebär inte att denna regel låses upp.

Felrättningar som återställer regeln, förbättrat stöd för ett nytt PDF-upplägg och dokumentationsförtydliganden är tillåtna inom användarens beställda arbete. Låset gäller beteendet, inte ett förbud mot att rätta kod.

När principen ändras ska beslutet sparas med datum, berörd regel, tidigare beteende, nytt beteende, skäl och verifiering. Ändra endast den berörda principen; resten förblir låst. Behåll äldre beslut som historik och markera tydligt vad som ersatts.
