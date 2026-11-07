# Väntande punkter – vad som behövs och när

Senast uppdaterad 7 november 2026, Tillsyno v2.4.581.

Den här listan samlar allt som är beslutat men inte klart, och vem som gör vad. När en punkt blir aktuell gör vi den i den ordning som står här. Bocka av med datum och version när den är klar.

**Vem:** **Ägaren** = du som äger Tillsyno. **IT** = arbetsgivarens IT. **Claude** = utvecklingen i appen.

---

## 1. Inbjudan med e-post direkt från Tillsyno (egen e-postserver, SMTP)

**Läge idag:** *Bjud in användare* fungerar redan. Men Supabases inbyggda e-posttjänst skickar bara till Supabase-teamets egna adresser, och bara några få mejl per timme. Därför visas en personlig länk som skickas från eget Outlook.

- [ ] **Ägaren** (eller IT): välj en e-posttjänst för utskick. Det kan vara en tjänst som Resend eller Brevo, eller en brevlåda i företagets Microsoft 365 om IT tillåter SMTP-inloggning.
- [ ] **Ägaren:** lägg in uppgifterna i Supabase → *Authentication → Emails → SMTP Settings*: server, port, användarnamn, lösenord, avsändaradress och avsändarnamn (till exempel *Tillsyno*). Lösenordet skrivs bara där, aldrig i chatten eller i mejl.
- [ ] **Ägaren:** höj vid behov gränsen för antal mejl per timme under *Authentication → Rate Limits*.
- [ ] **IT / domänägaren:** lägg till SPF och DKIM för avsändardomänen, så att mejlen inte hamnar i skräpposten.
- [ ] **Claude:** när SMTP är inställt, testa *Bjud in användare → E-post från Tillsyno* mot en riktig testadress och skriv in resultatet här.

**Klart när:** en inbjudan kommer fram i inkorgen och mottagaren kan välja lösenord. Ingen ändring i appen behövs.

## 2. Logga in med Microsoft (SSO via Microsoft Entra ID)

**Rekommenderat val:** Supabases Azure-inloggning (OAuth). Den fungerar på nuvarande gratisplan. SAML-SSO kräver Supabase Pro och behövs först om flera kundföretag ska ha egen inloggning.

- [ ] **IT:** skapa en appregistrering i Microsoft Entra ID (*App registrations → New registration*):
  - Kontotyp: *Endast konton i den här organisationen* (single-tenant).
  - Omdirigerings-URI (Web): `https://vczdugrwcivnotjltarm.supabase.co/auth/v1/callback`
  - Skapa en klienthemlighet (*Certificates & secrets*) och skriv in utgångsdatumet i kalendern.
  - Rekommenderat: lägg till de valfria anspråken `email` och `xms_edov` i appens manifest, under *optionalClaims*, för både ID-token och åtkomsttoken.
- [ ] **IT → Ägaren:** lämna över *Application (client) ID*, *Directory (tenant) ID* och klienthemligheten på ett säkert sätt, inte i vanlig e-post eller chatt.
- [ ] **Ägaren:** i Supabase → *Authentication → Sign In / Providers → Azure*: slå på, fyll i Client ID och Secret, och som *Azure Tenant URL* `https://login.microsoftonline.com/<tenant-id>`.
- [ ] **Ägaren:** behåll *Allow new users to sign up* avstängt. Då kan bara personer som du har bjudit in logga in med Microsoft.
- [ ] **Claude:** lägg till knappen *Logga in med Microsoft* på inloggningssidan och testa med ett inbjudet konto. Kontrollera att Microsoft-inloggningen kopplas till samma konto, och att moduler och licens styrs som förut i administrationen. Dokumentera i TILLSYNO_LICENSE_RULES_LOCK.md.

**Klart när:** en inbjuden kollega loggar in med sitt jobbkonto, inklusive företagets tvåstegsverifiering, och ser bara sina moduler.

## 3. Säkerhetsinställningar i Supabase (ägaren)

- [ ] Kontrollera att *Authentication → Sign In / Providers → User Signups → Allow new users to sign up* är **av**. Självregistreringen är stängd i appen sedan v2.4.573.
- [ ] *Leaked password protection* (stoppar lösenord som har läckt) kräver Supabase Pro. Ta ställning till detta inför IT-granskningen.

## 4. IT-granskningen

- [ ] **Ägaren:** dela IT-underlaget (dokumentet i Claude Docs) med IT och skicka mejlet till IT när du är redo. Utkastet finns.
- [ ] **Ägaren:** använd inga riktiga kundritningar eller kunduppgifter förrän IT har godkänt.
- [ ] **Claude:** uppdatera underlaget när punkt 1–3 är klara, till exempel med SSO och e-postserver.

## 5. Kontroll på riktiga enheter

- [ ] **Ägaren:** prova på riktig iPhone och iPad:
  - bjud in, välj lösenord via länken och logga in;
  - uppdatera med förloppsstapeln;
  - färgteman i Projektering och SmartMatch;
  - *Rensa enhetens data*;
  - öppna en stor ritning i Kontrollflöde Dörrautomatik, även på telefon. Sidraden ska visa *· Sparläge*. Kontrollera att laddningsrutan fylls till 100 %, zooma snabbt och öppna Kundmall.
  - **Skarp zoom (v2.4.591), också i appen i TestFlight:** öppna den tunga ritningen i Säkerhetsservice, Brand och Dörrautomatik. Zooma in på ett område och vänta: området ska bli skarpt efter en kort stund. Flytta åt höger och vänster: den nya delen är suddig och blir skarp när du stannar. Zooma snabbt fram och tillbaka och kontrollera att appen inte stängs. Säg till om det tar för lång tid att bli skarpt.
  - **Färgen i den tunga ritningen:** syns färgerna nu i Säkerhetsservice när ritningen öppnas? Om inte: säg om filen är sparad från Tillsyno tidigare, ett äldre Bluebeam-protokoll eller en ren ritning från kunden, och om de färgade delarna står under *Kommentarer* i Acrobat.
  - Dörrautomatik (v2.4.584–590): sidhuvudet på en rad, *Stäng ritning*, verktygsmenyn, *Ta bort* vid markerat ritobjekt, frågan vid *Hem*, *Historik* och *Mall*-rutan. Kontrollera särskilt att nyp-zoom i *Mall* inte zoomar hela sidan i Safari. Välj *Spara PDF* i frågan och kontrollera att PDF:en blir sparad innan du går vidare.

## 6. Beslut som väntar på ägaren

- [x] **Säkerhetsservice och stora ritningar:** ägaren beställde det 7 november 2026. Säkerhetsservice och Brand har sparläge och skydd vid snabb zoom sedan v2.4.591 (`security-drawing-view.js`).
- [ ] **Extremt tunga ritningar:** första gången en mycket tung sida ritas behöver appen fortfarande cirka 1,1 GB, till exempel för en A0 med 1 miljon linjer. Kraschar en sådan ritning ändå på äldre iPad, prova en nyare pdf.js som eget beslut. Se [CONTROLFLOW_HEAVY_PDF_PLAN.md](CONTROLFLOW_HEAVY_PDF_PLAN.md).
- [ ] **Svag grå hjälptext i ljusa teman:** kontrasten är 3,7–3,9:1 i hela appen. Färgen sitter i den gemensamma temafilen och påverkar hela appen. Säg till om den ska bli mörkare.
- [ ] **SmartMatch *Uppdatera och fortsätt*:** har ingen förloppsstapel ännu. Säg till om den ska få samma stapel som startsidan.
- [ ] **Ritningsverktyg → Dörrautomatik/Säkerhetsservice:** knapparna *Öppna i Dörrautomatik* och *Öppna i Säkerhetsservice* finns inte längre, och ingen modul använder överföringen. Du sparar PDF:en och öppnar den i modulen. Säg till om knapparna ska tillbaka.
- [ ] **SmartMatch, återställd produktändring:** en ändring som ångras försvinner nu ur listan *Ändringar · pos.* i stället för att visas som *Återställd*. Vilket är rätt?

## 7. Tester som väntar (Claude)

Testsviten är städad 7 november 2026: `node tools/run-tests.mjs`, se [tests/README.md](tests/README.md). Följande fel ligger i [tests/known-failures.json](tests/known-failures.json) och tas när det blir aktuellt:

- [ ] Kontrollflödet: placering av detektorer (`security-detectors-v344`), andra tryck på samma svar (`security-uncheck-v531`) och rotation med testritning (`security-drawing-rotation`).
- [ ] SmartMatch: raden *Återställd*, se punkt 6 (`smartmatch-position-changes-ui-v9-100`).
- [ ] Ritningsverktyg, textigenkänning: ett felläst ord (*Dérrcentral* i stället för *Dörrcentral*) kan ibland godkännas utan att visas för granskning (`drawing-ocr-swedish`).
- [ ] SmartMatch Version 1.5 (`smartmatch-slr-test.html`) länkar till `project-workspace-smartmatch-test.html`, som inte publiceras.

## 8. Utvecklingsstrategi – nästa steg

Grundstrukturen (CLAUDE.md och docs/moduler/) är klar. De förberedda ändringarna finns i [docs/kvalitetskontroller.md](docs/kvalitetskontroller.md) avsnitt 3. Varje punkt godkänns separat.

**Beslutat 7 november 2026:**
- De två motorerna i Kontrollflödet (`security.js` och `controlflow-revision/security-v335.js`) behålls. De slås inte ihop, och funktioner flyttas inte mellan dem.
- Båda låsprotokollen behålls där de ligger: *Checklista revision lås* under Dörrautomatik/Lås och *Lås & Dörrmiljö* under Säkerhetsservice.
- PDF-designen ska vara gemensam, men innehållet eget per undermodul. Designen och de två motorerna lämnas orörda tills vidare.
- Kontrollflödet förblir upplåst (sedan v2.4.581). I stället för låskontroll används en påverkanskontroll utan spärr (alternativ A): varje ändring visar vilka moduler och motorer som påverkas, och de relevanta testerna körs.

### Versionshantering (beslut 7 november 2026)

**Läge v2.4.590:**
- Modulversionerna finns i `versions.json`. De visas med liten text på startsidan, i Kontrollflödets mappval och i modulernas sidhuvud, via `tillsyno-versions.js`. Undantag: Dörrautomatik / Lås visar ingen version i sidhuvudet (ägarens beslut, v2.4.584).
- Dörrautomatik / Lås är 1.7 och Säkerhetsservice 1.3 (v2.4.590). Övriga moduler har sina startversioner.
- Kontrollsummor, automatisk höjning och CI-kontroll är **inte** införda ännu (steg 3).
- Fram till steg 3 höjs versionerna för hand i `versions.json`, i samma PR som ändringen. Testet `tests/module-versions-v582.cjs` kontrollerar att appversionen stämmer överallt.

**Regler:**
1. **Appversion `2.4.x`:** en för hela appen. Höjs ett steg i varje publicering som ändrar någon publicerad fil.
2. **Modulversion `X.Y`:** egen per modul och undermodul.
   - Y höjs när modulens **funktion** ändras för användaren. Det gäller också en felrättning som märks.
   - X höjs bara efter ägarens beslut.
   - Bara den modul vars funktion ändras höjs. En rättning i Dörrautomatik höjer inte Säkerhetsservice eller Brand.
   - Varje modul vars kontrollsumma ändras markeras i PR:en som *funktionsändring* (då höjs den) eller *endast kodberoende*.
3. **Kontrollsumma:**
   - Räknas ut automatiskt över alla filer som modulens sidor laddar, också delade filer och `vendor/`.
   - Sparas i registret och kontrolleras i CI och av `build-release.mjs`. Den skrivs aldrig för hand.
   - Visar exakt vilken kod som är publicerad.
4. **Testtäckning styrs av kodberoende**, inte av versionshöjning. Ändras en delad fil testas alla moduler som laddar den.
5. **Inga nya filkopior:**
   - Versionen står i registret, inte i filnamnet.
   - Filer rättas där de ligger, och befintliga filnamn behålls.

**Att hålla isär:**
- *Kodberoende* avgör tester.
- *Funktionsändring* avgör versionshöjning.
- *Kontrollsumma* avgör spårbarheten till publicerad kod.

**Godkända startversioner** (ägarens beslut 7 november 2026: alla moduler börjar på 1.0, utom CE-märkning som behåller 1.2. Varje funktionsändring höjer 1.0 → 1.1 → 1.2. Appversionen fortsätter i sin egen serie, 2.4.x, och går bara uppåt):

| Modul | Start |
|---|---|
| Dörrautomatik / Lås (en gemensam version, beslut 7 november 2026: grupperas som i mappvalet) | 1.0 |
| Säkerhetsservice | 1.0 |
| Brand | 1.0 |
| Avläsning | 1.0 (från v2.4.583, ersatte 9.100.35) |
| SmartMatch | 1.0 för driftsidan `smartmatch-read-v9-100.html` (egen serie, skild från Avläsning) |
| Projektering | 1.0 (från v2.4.583, ersatte 2.19.24) |
| CE-märkning | **Modulversion 1.2**, och **separat dataformat 60** (`VERSION=60`/`FORMAT` i `ce-markning-v1-2.js`, sparformatet). De blandas inte ihop. Dataformatet ändras bara när sparformatet ändras. |

**SmartMatch TEST 1.5** (`smartmatch-slr-test.html`) och övriga befintliga testversioner behålls oförändrade. Övergången från nya filkopior till registret görs först när registret är verifierat och ägaren har godkänt den.

**Beslutad arbetsordning:** varje steg är en egen uppgift med egen branch och PR och kräver ägarens godkännande.

- [x] 1. PR #10 (dokumentationsstrukturen) sammanslagen 7 november 2026. Utgångsläget har taggen `tillsyno-2.4.581-utgangspunkt`.
- [x] 1b. Modulversionerna visas i appen (v2.4.582). Det tidigarelades före kraschuppgiften på ägarens beslut.
- [ ] 2. Krascher i Dörrautomatik, i en ny session.
  - Undersökning utan kodändring: minne, nätverk och service worker med syntetiska testritningar.
  - Undersök bland annat om registreringen `sw.js?v=2.4.567` i `controlflow-revision/offline.js` bidrar. Den ger en ominstallation på ca 19 MB vid varje sidbyte, verifierat i Chromium.
  - Rapport. Därefter beslut om rättning.
- [ ] 3. Versionsregistret byggs ut (`versions.json` finns): kontrollsummor och automatisk höjning, tillsammans med tester på PR (3B), påverkanskontroll utan spärr (3C), tester för påverkan (3D) och versionstesterna, och ändrade regeltexter. Därefter slår ägaren på skyddet av `main` (3A).
- [ ] 5. Säkra uppdateringar: service worker, cache och inga blandade versioner, med tester på dator, iPhone och iPad.

**Fynd när funktionsbeskrivningarna skrevs (7 november 2026, inte åtgärdade):**
- [ ] **CE-märkningens service worker** stod på 2.4.570. **Höjd till 2.4.582 i v2.4.582**, så att enheter får den nya CE-sidan. Kvar till steg 5: dess version måste fortfarande höjas för hand vid varje ändring i CE-märkningen.
- [ ] ***Rensa enhetens data*** saknar den kontobundna CE-databasen `tillsyno-ce-markning-test-v7-<användar-id>` i sin lista. Den blir kvar i webbläsare utan `indexedDB.databases()`. Egen uppgift (System).
- [ ] **Delad lagring:** Kontrollflödets båda motorer sparar arbetet under samma nyckel `doorservice-all-in-one:<kontrollsumma>`. Effekten när samma ritning öppnas på båda sidorna är inte verifierad. Ska kontrolleras i kraschuppgiften eller med testerna i 3D.
- [ ] **Inaktuella etiketter:** *9.100.17*, *"SmartMatch 1.3"* (nu *SmartMatch TEST 1.5*) och CE-märkningens *"v2.4.359"* är rättade i v2.4.582. Kvar: bannern *"Separat test"* på Avläsningens driftsida.
- [x] **Ritningsverktyg** följer appversionen och har ingen egen modulversion (ägarens beslut 7 november 2026).
- [ ] **Tillfälligt testfel:** `ce-file-export-v312` föll en gång i full körning (knappen *Exportera filer* blev inte synlig inom 30 s). Det gick igenom vid omkörning. Undersöks i uppgiften om automatiska tester (steg 3).
- [ ] **Tidskänsligt testfel:** `controlflow-heavy-zoom-v581` föll i full körning och med 4 parallella jobb, även på `main` utan ändringar (v2.4.581). Testet väntar sig att en A2-ritning *inte* räknas som tung på iPad, men gränsen *mer än 1,5 s att rita* nås när datorn är hårt belastad. Ensamt går det igenom. Undersöks i uppgiften om automatiska tester (steg 3).

**Senare, efter godkännande:**
- [ ] Nätverkstestet för IT-granskningen (3E).
- [ ] **Ägaren, beslut:** förbättringar av PDF-designen P1–P7 i [pdf-design.md](docs/moduler/kontrollflode/pdf-design.md). Viktigast är P6. Görs likadant i båda motorerna när det beställs.
- [ ] **Ägaren, godkännande:** rättningar av dokumenthänvisningar R1–R9, se kvalitetskontroller.md avsnitt 4.

---

## Avbockat

- 2026-11-07, v2.4.591: skarp zoom som i Acrobat, i Dörrautomatik / Lås (1.8), Säkerhetsservice (1.4) och Brand (1.1). Bara det område som syns ritas skarpt när man slutar zooma eller flytta, med en fast pixelgräns. Säkerhetsservice och Brand har fått sparläge för tunga ritningar och avbryter inte längre en pågående ritning vid varje zoomsteg.
- 2026-11-07, v2.4.590: Historik över de senaste 10 servicetillfällena (status och anmärkningar) med en gul *Historik*-knapp, i Dörrautomatik / Lås (1.7) och Säkerhetsservice (1.3). *Mall* i Dörrautomatik är en flyttbar ruta som kan ändra storlek, utan A− / A+, och zoomen gäller bara rutan.
- 2026-11-07, v2.4.589: historikrutan *Tidigare service / anmärkningar* är läsbar i mörka teman, i Dörrautomatik / Lås (1.6) och Säkerhetsservice (1.2), och upprepar inte punktens namn. I Dörrautomatik har *Öppna* / *Stäng ritning* samma färg som *Mall*, ögat och sidpilarna som *Ångra*, och *Signatur och logga* är kompakt.
- 2026-11-07, v2.4.588: Dörrautomatik / Lås 1.5. Inga förklaringstexter (fel visas). Filnamn och antal objekt i sidraden, ögat i verktygsraden, sidpilar och öga följer färgtemat. Översikt börjar på *Objekt med anmärkning*, är kompakt och saknar *Tillbaka* och *Kundmall*. Projekt utan modulrubrik, kryss och rubriken *Service*; *Starta ny service* sist.
- 2026-11-07, v2.4.587: Dörrautomatik / Lås 1.4, checklistvyn. Liten rubrik med bara protokollnamnet. Raden med filnamn, projekt och antal objekt, krysset och den gamla versionstexten i hörnet är borttagna. *Objektuppgifter* ligger överst, är infällda och visar en varning när något saknas.
- 2026-11-07, v2.4.586: låsta stämplar har ingen ram på ritningen, i Dörrautomatik / Lås (1.3) och Säkerhetsservice (1.1). Den streckade fyrkanten följde tryckytan på 44 px och blev för stor när man zoomade ut. Låset fungerar som förut.
- 2026-11-07, v2.4.585: Dörrautomatik / Lås 1.2. En markerad text, pil, linje eller dörrsymbol har en liten *Ta bort*-knapp bredvid sig på ritningen (bara ikon på telefon). Borttagning frågar alltid först, även från verktygsmenyn, och kan ångras. Låsa stämplar fanns redan (*Justera / lås stämplar*).
- 2026-11-07, v2.4.584: Dörrautomatik / Lås 1.1. Sidhuvudet är en rad med *Öppna ritning* och en ny knapp, *Stäng ritning*, bredvid *Mall* och *PDF*. Versionsraden, A− / A+ och zoomknapparna i verktygsmenyn är borttagna, och verktygsknappen har en verktygsikon. *Justera / lås stämplar* och *Lägg till serviceöversikt* är egna rader i menyn. *Hem* och *Stäng ritning* frågar om PDF:en ska sparas när arbetet har ändrats.
- 2026-11-07, v2.4.581: krasch vid snabb zoom på telefon i Dörrautomatik. Zoom startar inte om en pågående ritning, tillfälliga ritytor frigörs, Safaris egen sidzoom är avstängd på ritningen och sparläget börjar tidigare på telefon.
- 2026-11-07, v2.4.581: låset på Kontrollflödet är borttaget enligt ägarens beslut. Ändringar kräver inte längre frasen ”Lås upp Kontrollflödet”.
- 2026-11-07, v2.4.581: laddningsruta i Dörrautomatik. När en ritning öppnas fylls en stapel till 100 %, med steg och filnamn.
- 2026-11-07, v2.4.580: Kontrollflöde Dörrautomatik känner av tunga ritningar och visar dem i sparläge. Ritningen ritas en gång, minnet frigörs, Kundmall blir mindre och stängs med rutan, och ritfel visas. Exporten är oförändrad. Kundmallens × var ett fel i testet, inte i appen; testet är rättat.
- 2026-11-07: testsviten städad och körbar med ett kommando (`tools/run-tests.mjs`). Kraschen med stora ritningar är utredd (plan klar).

- 2026-11-07, v2.4.579: *Bjud in användare* i administrationen (e-post eller personlig länk) och uppdateringsruta med förlopp till 100 %. Serverfunktionen är version 12.
- 2026-11-07, v2.4.578: färgtemat gäller i hela appen.
