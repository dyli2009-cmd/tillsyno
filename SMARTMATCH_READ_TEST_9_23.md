# SmartMatch Avläsning TEST 9.23

TEST 9.23 bygger vidare på den färdiga avläsningen i projekt-PDF:en. Varje fysisk dörr får nu en egen beräknad arbetstid, samtidigt som projektets material och tider summeras per produkttyp.

## Arbetsgång

1. Öppna en färdig projekt-PDF i **Avläsning TEST 9.23**.
2. Klicka på en länkad stämpel på ritningen.
3. Ovanför kontrollpunkterna visas **Beräknad dörrtid**, **Klart**, **Kvar** och antal punkter **Utan tid**.
4. Bocka av arbetet som tidigare. Dörrens tid, projektets tid och procent uppdateras tillsammans.
5. Välj **Ändra** på en punkt för att rätta benämning, modell, antal eller tid för just den fysiska dörren.
6. Välj **＋ Extra tid** för krångel eller annat tillkommande arbete. Ange tid och en kommentar. Tillägget hör bara till den öppna dörren.
7. Öppna **Tid** och välj:
   - **Per produkt** för total mängd, material/modeller och standardtid per typ.
   - **Per dörr** för beräknad total, utfört, kvar och material på varje fysisk position. Klicka på en rad för att öppna dörren.
8. Spara projekt-PDF:en. Tidsmallar, antal, dörrspecifika ändringar, extraarbete och avprickningar följer med filen.

## Beräkningen

- Samma dörrkort kopplat till flera stämplar räknas en gång per fysisk dörr.
- Standardtiden för exempelvis låshus, cylinder, dörrstängare och dörrautomatik kan ändras i **Per produkt**.
- En egen tid på en kontrollpunkt gäller före standardtiden.
- **Antal** multiplicerar både materialmängd och tid.
- Produkter som saknar tidsmall visas under **Övrigt utan tidsestimat**. De räknas inte tyst som noll minuter.
- Avlästa GS-rader behåller grupperna Daglåsning, Nattlåsning, Övrig utrustning och Larm/Passer i kompakta, öppningsbara sektioner.

Tiderna är arbetsberäkningar. **＋ Extra tid** kan användas som en justering för faktiskt krångel, men TEST 9.23 är ännu ingen start-/stoppklocka för registrerad arbetstid.

## Bevarat beteende

- TEST 9.22 och äldre snapshots och lokala arkiv ändras inte.
- Tidigare projekt använder samma sparformat och får standardvärdet antal 1 på äldre punkter.
- **Läs om detta kort** behåller kopplingar, bockningar, egna punkter, antal och tider.
- Ritningsmatchning, GS-regeln, PDF-exportens kontroll och iPadens minnesskydd är oförändrade.
- Standard-SmartMatch, Ritningsverktyget, Kontrollflöde och auth ändras inte.

## Verifiering

Automatiska tester kontrollerar flera fysiska dörrar med samma kort, mängd, egna tider, extraarbete, ändrad standardtid, produktgrupper, klickbar dörrlista, äldre projekt och iPad-layout. En fysisk iPad med Safari är fortsatt obligatorisk slutkontroll för verklig minnesbelastning och toucharbete.
