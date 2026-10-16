# Tillsyno v2.4.359 – tydligare administration

Beställt 16 oktober 2026: prioritera flödet och gör sedan adminsidan enkel, tydlig och fin. Kontrollera kontoradering, färgteman och knappar på dator, iPhone och iPad.

## Ändrat

- Väntande ansökningar visas först. Räknarna filtrerar väntande, godkända eller alla konton; sökning fungerar inom filtret.
- Varje konto visar namn, e-post, status, tilldelade moduler och licensens slutdatum. Ägarkontot är skyddat.
- En huvudknapp öppnar Behörighet & licens. Eget slutdatum, förlängning och avslut ligger i separata hopfällda avsnitt.
- Radera konto ligger under användarens åtgärdsmeny. Dialogen anger personen och kräver samma e-postadress före permanent radering.
- Godkännande och radering behåller dialogens tillstånd efter ett tillfälligt serverfel, så Försök igen fungerar direkt. Dubbelåtgärder spärras under pågående anrop. Fel vid första hämtningen behåller sitt uppdateringsmeddelande.
- `auth/admin-ui-v359.css` gäller endast adminsidan och följer samtliga sju teman, även i dialoger, datumfält, kryssrutor och knappar. Statusfärger behåller sin betydelse.
- Adminversionen visas nere till höger. Gemensamma versions- och cachereferenser höjs till 2.4.359; den nya adminstilen ingår i offlinefilernas förteckning. Administration kräver fortfarande internet.

## Server och avgränsning

GitHub innehöll en äldre adminfunktion. Källan har synkats med den redan aktiva Supabase-funktionen `tillsyno-admin`, version 9, hämtad den 16 oktober. Ingen ny serverfunktion eller databasändring har driftsatts. Serverns kontroll av adminroll, aktuell session, e-postbekräftelse, valda moduler/licenstid och skyddat ägarkonto bevaras. Databasens `tillsyno_access.user_id` har verifierats använda `ON DELETE CASCADE` mot Auth.

Inga riktiga konton har ändrats eller raderats. PDF-innehåll, projektdata och den beslutade offlineperioden ändras inte. Kontrollflödet är fortsatt låst. Övriga moduler får endast gemensamma versions-/cachereferenser.

## Verifiering

- `node tests/tillsyno-admin-auth.cjs`: serverbehörighet, sessionskontroll, e-postkrav, modulval, licensperioder, slutdatum, avslut, permanent radering, ägarkontots skydd och klientens offline-/inloggningsregler.
- `CHROMIUM_PATH=/path/to/chromium node tests/admin-ui-v359.cjs`: riktiga HTML/CSS/JS-handlers med lokala simulerade konton och serveradapter. Filter, sökning, uppdatering, godkännande, direkt återförsök efter serverfel, licensändring, datum, förlängning, avslut, radering och avbryt, sidlänkar och utloggningsknapp.
- Alla tre adminrutor och palettvärden kontrolleras i sju teman vid telefon-, surfplatte- och datorbredder. Ingen horisontell överskjutning eller JavaScript-runtimefel. Ljus telefonvy och mörk datorvy bildgranskade.
- Samma admin-HTML, JavaScript och CSS speglas till iOS-källan och testas med dess befintliga guard/utseendelager. Nästa native-bygge hämtar den nya låsta webbcommiten via `ios-release.json`.

Chromium med testdata ersätter inte fysisk Safari/iOS eller en verklig registrerings- och e-postkedja. TestFlight-buildens publicering verifieras separat.
