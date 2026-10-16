# SmartMatch – Avläsning TEST 7

Versionssida: `smartmatch-read-test-v7.html`. Intern version `36.141-READ-TEST`. Den fasta testsidan `smartmatch-read-test.html` följer nu [TEST 8](SMARTMATCH_READ_TEST_V8.md). Ändringen gäller den separata avläsningstesten; tidigare testversioner och ordinarie moduler är bevarade.

## Välj söksätt före läsningen

| Söksätt | Dörrkort | Ritning |
| --- | --- | --- |
| **Snabb sökning – PDF-stämplar först** | PDF-text inom markerad kod och arbetslista. Bildläsning av dessa områden vid behov. | Sparade PDF-stämplar först, därefter tidigare text- och bildreserv när det behövs. |
| **Sök i text – snabbare, utan bildläsning** | Endast PDF-text inom markeringarna. | PDF-stämplar och PDF-text, utan OCR. |
| **Sök även i bilder – tar längre tid** | Text och bildläsning inom markeringarna. | Tidigare kompletterande bildsökning finns kvar. |

Textläget startar ingen OCR eller rendering för själva avläsningen. En kod eller arbetslista som endast finns som bild kräver något av de andra söksätten. Ritningen visas fortfarande i PDF-visaren oavsett söksätt; stor fil, PDF-tolkning och första visningen kan därför fortfarande ta tid.

Om ritningen saknar användbara PDF-stämplar kan även snabblägets reservsökning ta längre tid. Textläget är valet som helt utesluter bildläsning. Bildläget kompletterar även sidor där stämpelindex redan gett träffar.

I snabbläget undersöks om bilder faktiskt överlappar markeringen. En logotyp på en annan del av sidan utlöser inte bildläsning av en redan läsbar texttabell. Resultat för sidtext och lästa områden återanvänds mellan **Hitta övriga dörrkort** och **Läs korten och sök på ritningen**.

Kortupptäckten behöver läsa sidornas text för att hitta motsvarande kortområden. Snabbläget begränsar dess bildläsning till exempelkortet och områden som identifierats som motsvarande korttabeller. Det bildläser inte varje okänd ritningssida. Om andra helt inskannade sidor inte kan identifieras från exemplet, använd det kvarvarande bildläget eller ange kortsidorna. Olika PDF-upplägg kan fortfarande kräva ett nytt exempel och granskning.

## Steg för steg

1. Öppna underlaget. Nya underlag visar läsguiden; använd **Läsområden** för att ändra ett redan sparat projekt.
2. Markera **Kod** på ett dörrkort och sedan **Arbetslista**. Ta med tabellens kolumnrubriker, särskilt **Mont av** eller **Monteras av**. Hela texten runt exempelvis `Beslagskod GS23` får markeras; den identifierade koden visas för kontroll.
3. Börja med **Snabb sökning – PDF-stämplar först**. Välj textläget om kod och tabell är vanlig PDF-text. Välj bildläget om du behöver komplettera med bildinnehåll.
4. Låt **GS – endast vårt montage** vara valt. Klicka **Hitta övriga dörrkort** och kontrollera de föreslagna kortområdena. Klicka sedan **Läs korten och sök på ritningen**.
5. Kontrollera kod, arbetsrader och ritningsträffar. Justera vid behov och godkänn granskningen. Varje fysisk dörr har egen avprickning.
6. Välj **Spara → Spara PDF**. Den exporterade projekt-PDF:en öppnas nästa gång direkt med kopplingar och arbetsstatus, även i en annan webbläsare.

## GS och arbetsstatus

Nya listor tar med faktiska komponenter där GS står för montaget. **Lev av** och **Mont av** hålls isär: GS som leverantör och DT som montör ger ingen GS-punkt; DT som leverantör och GS som montör ger en GS-punkt. Tomma produkter, streck och administrativa rader blir inte arbetsmoment. Produktnamn och beskrivning visas i checklistan.

Om ansvarskolumnens rubrik saknas visas en varning och ett försiktigare urval används. Ta med rubrikerna och provläs igen för säkrare ansvarstolkning. **Alla markerade arbetsrader (tidigare läsning)** finns kvar som ett uttryckligt alternativ. Bytet mellan arbetsurval återanvänder redan lästa ord.

Checklistans avprickning, ritningsstatus och tidsöversikt använder samma kontrollvärden. Befintliga standardtider används för identifierade moment. Okänd tid redovisas som okänd; ingen tid hittas på. Alla punkter behöver vara klara för 100 procent.

Äldre sparade arbetslistor filtreras inte automatiskt vid direktöppning. Deras text, kontrollnycklar och resultat behålls. För att läsa om en äldre lista enligt GS-urvalet: öppna **Läsområden**, välj GS och granska den nya listan innan godkännande. Läsaren och sessionslagringen har egna TEST 7-nycklar.

## Verifierat 2026-10-16

- Enhetstesterna `smartmatch-read-work-v7.cjs`, `smartmatch-read-image-regions-v7.cjs`, `smartmatch-read-matcher-v7.cjs` och `smartmatch-read-discovery-v7.cjs` passerar. De täcker ansvarskolumner, blandade GS/DT-rader, bilders placering, strikt textläge och begränsad OCR vid kortupptäckt. Tidigare matchnings- och regionfall passerar också med de nya läsarna.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-fast-v7.cjs` passerar i dator- och iPhone-storlek. Genererat textunderlag läses utan OCR i text- och snabbläge trots bilder utanför markeringarna. Bildläget läser en inskannad tabell. GS-urval, produktnamn, byte av arbetsurval utan omläsning, separat dörrstatus, tidsvägd procent samt export och direkt återöppning kontrolleras.
- `SMARTMATCH_SCHOOL_PDF=/lokal/sökväg/test-skolan.pdf CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-school-v7.cjs` passerar med kundens reducerade skolfil, angiven lokalt. Resultatet är **40 GS23-kopplingar** och **tre GS-moment: Behör 256, Trycke 6696 och Cylinder in/utsida Utsida**. Fem OCR-anrop görs på dörrkortssidan; ritningen får ingen OCR. Provläsningen återanvänder kortupptäcktens OCR. Upptäckt och provläsning tog tillsammans cirka **11 sekunder i testmiljön**, utöver filöppning och visning. Exporterad projekt-PDF behåller alla kopplingar och avprickning vid direkt återöppning.
- `SMARTMATCH_READ_VERSION=v7 SMARTMATCH_DEVICE=desktop CHROMIUM_PATH=/usr/bin/chromium node tests/smartmatch-read-direct-open-v6.cjs` passerar. Sparade texter, områden och kontrollnycklar bevaras, inklusive äldre listor utan GS-policy. PDF-data har företräde framför gammal lokal data; ogiltiga projekt kräver granskning. Testets vanliga TEST 6-läge passerar fortfarande i dator- och iPhone-storlek.

Kundens PDF ingår inte i repot. Tiderna är mätningar i testmiljön, ingen garanti för andra filer eller enheter. iPhone-kontrollen använder Chromium med mobil vy; fysisk Safari/iOS och en ny TestFlight-build är inte verifierade här. Inga nya bibliotek, externa OCR-tjänster eller bildkakling har lagts till.
