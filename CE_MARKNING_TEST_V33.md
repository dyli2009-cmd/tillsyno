# CE TEST 33 – Exportera valda dörrar till ZIP

- Ny knapp **Exportera valda dörrar** direkt på CE-startsidans verktygsrad.
- Välj en, flera eller alla färdiga dörrar; knapparna **Välj alla färdiga** och **Avmarkera alla**.
- Pågående/ofärdiga dörrar syns grå med **Ej klar**, men kan inte exporteras som färdiga CE-underlag.
- **Skapa ZIP** genererar ett paket med en egen mapp för varje vald dörr (dörrens automatiknummer används som mappnamn), och sju dokumentmappar för den dörren.
- **Spara ZIP** hämtar filen. **Skicka / dela ZIP** öppnar enhetens delningsmeny om webbläsaren stöder fildelning, där e-postapp kan väljas. På andra enheter hämtas ZIP och kan bifogas manuellt i mejl.
- Namn: projektnamn-CE.zip. Ingen automatisk sändning sker; användaren väljer själv mottagare i delningsmenyn.
- Urval som ändras gör tidigare genererad ZIP ogiltig, så inte fel dörrar råkar skickas.
- Visar progress per dörr under skapande, skyddar mot att skapa två ZIP samtidigt.
- Exporten bygger vidare på befintligt dokumentflöde; kontroll/logik för färdiga dörrar, CE-originalmallar, signatures och lokala PDF-filer bevaras.

Verifierat via JavaScript-test: två valda dörrar av tre gav 14 filer i exakt två rätt namngivna dörrmappar; tredje dörrens dokument förekom inte. Ofärdig dörr avvisades. JavaScript-syntax verifierad. iPhone/iPad Safari-delning återstår att kontrollera på fysisk enhet.