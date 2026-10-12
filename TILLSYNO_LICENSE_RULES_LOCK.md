# Tillsyno – beslutad regel för användare, behörighet och licens
**Beslutad:** 12 oktober 2026
**Status:** Gällande överenskommelse, första enkla versionen (webb: v2.4.272).
**Ändra inte dessa principer utan nytt uttryckligt beslut från användaren.**

## 1. En gemensam ingång
- En huvudadress för Tillsyno, med personliga konton (e-post och lösenord).
- Vanliga användare öppnar appen. Administratören ser dessutom **Administration**.
- Adminsidan får ha en direktadress men är del av samma app och inloggning.
- Inga aktiva arbetsytor ska kunna användas normalt utan behörighetskontroll, inte ens via en direktlänk.
- Separera *roll* (administratör eller vanlig användare) från *modulbehörighet* och *licenstid*.

## 2. Administratörens kontroll
- Huvudadministratören har alla moduler och ingen licensslutdag, men omfattas av återkommande inloggning.
- Huvudadministratören får lägga till, godkänna, redigera, förlänga, spärra och återaktivera användare. Huvudkontot ska inte kunna tas bort/redigeras som en vanlig medlem.
- Medlemmar får endast tillgång till de tilldelade modulerna:
  1. SmartMatch (ritningar och dörrkort)
  2. Kontrollflöde (kontroller och protokoll)
  3. Ritningsverktyg (PDF-verktyg)
- Modulerna ska vara separata val. Dold knapp är inte ensam säkerhetskontroll: behörighet ska även prövas när modulen öppnas.
- Medlemmar får inte själva ge sig fler moduler, förlänga licenser eller bli administratörer.

## 3. Licensens tidsperiod
- Admin ska kunna ge exempelvis **2, 7, 30 eller 365 dagar**.
- Admin får **ändra** modulval och ange ett nytt slutdatum från idag.
- **Förläng** betyder att dagar läggs till det befintliga framtida slutdatumet. Om licensen redan gått ut, räknas förlängningen från nu.
- Licensens slutdatum sparas server-side i Supabase, inte i användarredigerbara metadata.
- Användaren bör se ungefär **antal dagar kvar** samt tydligt meddelande om att licensen har gått ut.
- En medlem med utgången licens ska inte få fortsatt tillgång vid en **onlinekontroll**. Admin kan förlänga tillgången.
- Ingen betalnings- eller abonnemangshantering i denna första version.

## 4. Beslutad sjudagarsregel – lösenord och offline
Detta är den särskilt överenskomna kompromissen för servicetekniker utan internet.

- Efter en riktig inloggning med lösenord har användaren högst **7 dagar** innan en ny lösenordsinloggning krävs.
- När enheten är **online** kontrollerar appen aktuell roll, modulbehörighet och licensslutdatum mot Supabase. En utgången licens eller spärrat konto ska då stoppa användningen.
- När enheten är **offline** kan en tidigare verifierad användare fortsätta lokalt i högst återstående delen av sjudagarsperioden, enligt den senast godkända behörigheten.
- **Viktigt avsiktligt undantag:** Om licensen går ut medan enheten är offline, får personen fortsätta lokalt tills sjudagarsperioden från senaste inloggning/verifiering tar slut. Det är alltså inte 7 *extra* dagar efter licensslutet, utan högst fram till slutet av den redan beviljade offlineveckan.
- Exempel: Inloggning och kontroll 12 oktober; licens går ut 15 oktober. Fortsatt arbete offline kan fungera till ungefär 19 oktober. Återkomst online 16 oktober: åtkomst stoppas direkt vid ny kontroll.
- Efter perioden krävs internet, lösenordsinloggning och godkänd licenskontroll.
- Server-API:n och adminåtgärder får **aldrig** godkännas baserat endast på en lokal offlinecache.
- Ingen oavsiktlig radering av pågående projekt/ritning/PDF när kontrollperioden tar slut. Befintligt lokalt arbete ska bevaras även om fortsatt appåtkomst spärras.
- Detta är en **praktisk offlinekompromiss**, inte manipulationssäkert skydd mot ändrad enhetsklocka eller manipulerad lokal lagring. Före kommersiella licenser behövs starkare serverutfärdade/signaturkontroller och säkrare distribution.

## 5. Vad som byggts och vad som återstår
**Incheckat på webben i/kring v2.4.271 (2026-10-12):**
- Supabase Auth med personligt lösenord och ägarkonto.
- Skyddad adminfunktion på servern; rollerna ligger i RLS-skyddade `public.tillsyno_access`.
- `allowed_modules` och `license_expires_at` per konto.
- Admingränssnitt för att skapa användare med licenstid/moduler, redigera, förlänga, spärra och återaktivera.
- Webbläsarguard och sjudagarskrav; lokal offlineåtkomst kräver tidigare verifiering.
- Självregistrering via `auth/register.html`; registrerade användare saknar åtkomstrad tills administratör godkänner dem. E-postbekräftelse och val av moduler/licenstid kontrolleras server-side i `tillsyno-admin`.
- Serverfunktionen har åtgärderna `list`, `add`, `approve`, `remove`, `link`, `update`, `extend`.

**Ej färdigställt/verifierat:**
- Riktiga end-to-end-tester på iPhone/iPad med både admin och medlemskonto, inkl. offline och licensutgång.
- Spegling och publicering av motsvarande ändringar i aktuell iOS/TestFlight-build.
- Registrering med namn, e-post och eget lösenord via "Registrera", följd av väntande ansökan. Inget konto får modulbehörighet eller licens före adminbeslut; e-postbekräftelse krävs innan godkännande. Admin väljer moduler och 2/7/30/365 dagar vid godkännande. Publicerat för webben i v2.4.272. Verifiera alltid med verklig testanvändare före produktionsbruk.
- Företag som köper ett paket och chefer som fördelar moduler, betalning, priser, licenspaket, flera företagsadministratörer: **framtida möjlighet, inte byggt nu**.
- GitHub Pages är statisk/offentlig hosting. Klientbaserad HTML-spärr gör inte källkoden eller lokala PDF-filer hemliga. För stark företagssekretess behövs autentiserad hosting, säker lokal lagring och bättre offlinelicenser.

## 6. Utvecklingsregel
Behåll den enkla modellen medan den testas. Lägg inte till företagslicenser, betalning, avancerade roller eller ändrade offlinevillkor utan att användaren uttryckligen beslutar det. Vid fortsatt arbete med konton, licenser eller moduler ska detta dokument läsas tillsammans med `DEVELOPMENT_RULES.md` och aktuell serverkod.

**Kortform att komma ihåg:** *Admin bestämmer moduler och antal licensdagar. Appen fungerar offline i högst 7 dagar från godkänd inloggning/kontroll. Online kontrolleras licensen direkt. Efter 7 dagar krävs ny inloggning. Företagslicenser väntar till senare.*

## 7. Självregistrering v2.4.272 – säkerhetskontroller som återstår
- Registreringsflödet och admin-godkännandet är incheckat på GitHub; ett fullständigt realtest med separat användarkonto och e-postbekräftelse återstår.
- Kontrollera att **Confirm email** är påslaget i Supabase Auth och att GitHub Pages-adressen för inloggning är tillåten som redirect URL. Enbart förekomst av `email_confirmed_at` räcker inte som verifiering av projektets konfiguration.
- Supabase Security Advisor varnade 2026-10-12 för att **Leaked Password Protection** är avstängt. Aktivera skyddet innan bredare användning och överväg CAPTCHA för att minska massregistrering.
- GitHub Pages publiceringsstatus och iPhone/Safari-end-to-end har inte kunnat kontrolleras här; dessa testas separat.
