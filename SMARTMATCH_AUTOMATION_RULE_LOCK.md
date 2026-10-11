# SmartMatch – låst regel för dörrautomatik och GS-koppling

**STATUS: LÅST enligt användarens beslut 2026-10-11.**
**Godkänd grund: SmartMatch TEST v36.92.** Användaren bekräftade: ”Okej, nu funkar detta” och bad att reglerna sparas och låses.

Detta är den gällande beteenderegeln för dörrautomatik i SmartMatch TEST. Läs även [samlingen av funktionsregler](SMARTMATCH_FUNCTION_RULES_LOCK.md). Äldre versionsanteckningar beskriver historik; de får inte återinföra äldre kopplingskrav som strider mot detta beslut.

## 1. Så använder man funktionen

1. Öppna ritningen och välj **Verktyg → Koppla dörrautomatik**.
2. Skriv en fullständig märkning som exempel och välj **Placera och hitta alla**.
3. Rita en ruta runt den första automatikens märkning, justera vid behov och tryck **Spara**.
4. Appen läser märkningen i rutan och söker automatiskt efter samma hela objektnummer på alla ritningssidor.
5. Varje fysisk träff får en egen tryckknapp för **Egenkontroll dörrautomatik** och **SLR-dokumentmapp**. Knappen hör till den träffens egen sida och position.
6. Pilen går från automatiken till närmaste fysiska GS-position på samma ritningssida. GS-positionens befintliga koppling leder vidare till dörrkortet.

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

## 5. GS-pilen styrs av närmaste position

Den automatiska pilen väljer närmaste fysiska GS på **samma sida**, utifrån märkningens och GS-positionens mittpunkter.

Dörrkortets automatikrad, modell, ID eller förekomst får inte användas som spärr för denna geometriska koppling. Äldre krav på en automatik per GS får inte återinföras: flera märkningar kan därför peka på samma GS.

Närmaste GS anger vilken fysisk dörrposition pilen går till. Det intygar inte att all utrustning på dörrkortet stämmer med märkningen.

- Saknas GS på sidan ska automatikens knapp ändå finnas, med möjlighet att koppla manuellt.
- Ligger två skilda GS exakt lika nära ska appen begära ett manuellt val.
- Operatören ska kunna ändra GS-kopplingen och justera pilen.
- Uttryckligt bekräftade manuella kopplingar och frånkopplingar ska bevaras vid omsökning.

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

**Principerna ovan får endast ändras efter ett nytt uttryckligt beslut från användaren.** En annan uppgift i appen innebär inte att denna regel låses upp.

Felrättningar som återställer regeln, förbättrat stöd för ett nytt PDF-upplägg och dokumentationsförtydliganden är tillåtna inom användarens beställda arbete. Låset gäller beteendet, inte ett förbud mot att rätta kod.

När principen ändras ska beslutet sparas med datum, berörd regel, tidigare beteende, nytt beteende, skäl och verifiering. Ändra endast den berörda principen; resten förblir låst. Behåll äldre beslut som historik och markera tydligt vad som ersatts.
