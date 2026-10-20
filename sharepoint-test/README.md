# Tillsyno – SharePoint-pilot (Projektflöde)

**Status 2026-10-20: Förberedelse på separat GitHub-gren. Ingen skarp SharePoint-koppling, publicerad testlänk eller Microsoft-inloggning är aktiverad.**

## Utgångsläge
- GitHub: `dyli2009-cmd/tillsyno`, `main` är fungerande app och ska lämnas oförändrad.
- Projektflöde finns i `project-workspace.html` och `project-workspace.js`. Kontrollflöde är låst.
- SmartMatch TEST är en separat version; den får inte ändras av bara detta pilotarbete.
- Användaren har skapat en SharePoint-webbplats Tillsyno, en projektmapp och laddat upp en test-PDF som går att öppna i SharePoint. Den exakta webbplats- och mappadressen är inte verifierad via API.
- SharePoint är dokumentlager. Projektstatus och samtidiga ändringar i flera montörers checklistor får inte synkas genom att flera personer skriver över samma PDF.

## Stegvis genomförande
1. Registrera **Tillsyno SharePoint Test** i Microsoft Entra ID, i första skedet **single-tenant**, som **Single-page application (SPA)**. Registrera en exakt separat test-redirect-URI innan inloggning provas. Använd MSAL Browser authorization code + PKCE. Ingen client secret i frontend eller public GitHub.
2. Konfigurera endast nödvändiga **delegerade Microsoft Graph-behörigheter** för testkontot. Tillgång ska begränsas av användarens behörighet i SharePoint. Kräv godkännande enligt organisationens policy. Skydda inloggningen även med Tillsynos befintliga Supabase-behörighetskontroll.
3. Anslut separat test-UI (inte Kontrollflöde, inte skarp `main`). Välj webbplats, dokumentbibliotek, mapp och PDF.
4. Hämta PDF som bytes från Microsoft Graph och mata in den i Projektflödets existerande `analyze(file)`-flöde. Ändra inte avläsning, dörrkorts- eller GS-matchningsregler.
5. Exportera Projektflödets färdiga PDF via befintligt exportflöde och **spara som ny testkopia** i SharePoint; behåll originalet och visa tydlig serverkvittens.
6. Testa återöppning i SharePoint, läsbehörighet, nekad behörighet, nätavbrott, stora PDF:er, andra enheter och fel från Microsoft Graph innan någon skarp koppling eller multi-user-synk byggs.
7. Stöd för flera företag kräver multi-tenant-appregistrering, separat företagsbehörighetskontroll och företagsisolerad konfigurering. Detta ingår **inte** i första testet.

## Kod skapad på pilotgrenen
`sharepoint-test/graph-client.js` är en fristående REST-adapter. Den behöver en godkänd `getAccessToken`-funktion från Microsoft-inloggningen för att användas. Den kan läsa webbplatser, lista bibliotek/mappar, hämta PDF och ladda upp en **ny** PDF-kopia. Funktionen för uppladdning begär att inte skriva över befintlig fil.

**Adapterkoden är inte ansluten till Projektflödets UI ännu och är inte testad mot användarens SharePoint.** Den ska inte beskrivas som en fungerande integration förrän ovanstående steg är genomförda.

## Säkerhet
- Inga access tokens, lösenord, klienthemligheter, PDF-filer, ritningar eller kunduppgifter i GitHub.
- HTTPS, PKCE, tydliga behörigheter och särskilt testkonto.
- Håll testkonfiguration skild från Tillsynos vanliga inloggning och iOS.
- Dra inte slutsatsen att filer på SharePoint automatiskt blir åtkomliga i Tillsyno; det krävs faktisk OAuth/Graph-koppling.
- Starta med läsning; spara som kopia, aldrig ersätt original utan versionskontroll.
