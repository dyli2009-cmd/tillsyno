# Väntande punkter – vad som behövs och när

Senast uppdaterad 7 november 2026, Tillsyno v2.4.579 (tester städade samma dag).

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

- [ ] **Ägaren:** prova på riktig iPhone och iPad: bjud in, välj lösenord via länken och logga in, uppdatera med förloppsstapeln (syns från uppdateringen efter 2.4.579), färgteman i Projektering och SmartMatch, samt *Rensa enhetens data*.

## 6. Beslut som väntar på ägaren

- [ ] **Stora ritningar kraschar i Kontrollflöde Dörrautomatik:** orsaken är utredd och en plan i fyra steg är klar, se [CONTROLFLOW_HEAVY_PDF_PLAN.md](CONTROLFLOW_HEAVY_PDF_PLAN.md). Den innehåller bland annat att filen tolkas en gång, att minnet frigörs och ett sparläge för tunga ritningar. Kräver **"Lås upp Kontrollflödet"**.
- [ ] **Svag grå hjälptext i ljusa teman:** kontrasten är 3,7–3,9:1 i hela appen. Färgen sitter i den gemensamma temafilen, så en ändring kräver **"Lås upp Kontrollflödet"**.
- [ ] **SmartMatch *Uppdatera och fortsätt*:** har ingen förloppsstapel ännu. Säg till om den ska få samma stapel som startsidan.
- [ ] **Ritningsverktyg → Dörrautomatik/Säkerhetsservice:** knapparna *Öppna i Dörrautomatik* och *Öppna i Säkerhetsservice* finns inte längre, och ingen modul använder överföringen. Du sparar PDF:en och öppnar den i modulen. Säg till om knapparna ska tillbaka.
- [ ] **SmartMatch, återställd produktändring:** en ändring som ångras försvinner nu ur listan *Ändringar · pos.* i stället för att visas som *Återställd*. Vilket är rätt?

## 7. Tester som väntar (Claude)

Testsviten är städad 7 november 2026: `node tools/run-tests.mjs`, se [tests/README.md](tests/README.md). Följande fel ligger i [tests/known-failures.json](tests/known-failures.json) och tas när det blir aktuellt:

- [ ] Kontrollflödet (låst): kundmallens × på iPad-bredd stänger ibland inte förhandsvisningen vid första trycket (`controlflow-customer-floating-v310`).
- [ ] Kontrollflödet (låst): placering av detektorer (`security-detectors-v344`), andra tryck på samma svar (`security-uncheck-v531`) och rotation med testritning (`security-drawing-rotation`).
- [ ] SmartMatch: raden *Återställd*, se punkt 6 (`smartmatch-position-changes-ui-v9-100`).
- [ ] Ritningsverktyg, textigenkänning: ett felläst ord (*Dérrcentral* i stället för *Dörrcentral*) kan ibland godkännas utan att visas för granskning (`drawing-ocr-swedish`).
- [ ] SmartMatch Version 1.5 (`smartmatch-slr-test.html`) länkar till `project-workspace-smartmatch-test.html`, som inte publiceras.

## 8. Utvecklingsstrategi – nästa steg

Grundstrukturen (CLAUDE.md och docs/moduler/) är klar. De förberedda ändringarna finns i [docs/kvalitetskontroller.md](docs/kvalitetskontroller.md) avsnitt 3. Varje punkt godkänns separat.

**Beslutat 7 november 2026:**
- De två motorerna i Kontrollflödet (`security.js` och `controlflow-revision/security-v335.js`) behålls. De slås inte ihop, och funktioner flyttas inte mellan dem.
- Båda låsprotokollen behålls där de ligger: *Checklista revision lås* under Dörrautomatik/Lås och *Lås & Dörrmiljö* under Säkerhetsservice.
- PDF-designen ska vara gemensam, men innehållet egna per undermodul.

**Nästa uppgift, branchskydd och automatiska tester:**
- [ ] **Claude, efter godkännande:** tester på varje PR (3B), låskontroll (3C) och påverkan på andra moduler (3D).
- [ ] **Ägaren:** slå på skyddet av `main` enligt 3A, när 3B och 3C har gått igenom en gång.

**Därefter:**
- [ ] **Claude, efter godkännande:** nätverkstestet för IT-granskningen (3E).
- [ ] **Ägaren, beslut:** förbättringar av PDF-designen P1–P7 i [pdf-design.md](docs/moduler/kontrollflode/pdf-design.md). Viktigast är P6, en kundstil för alla. Görs i båda motorerna och kräver upplåsning.
- [ ] **Ägaren, godkännande:** rättningar av dokumenthänvisningar R1–R8, se kvalitetskontroller.md avsnitt 4.

---

## Avbockat

- 2026-11-07: testsviten städad och körbar med ett kommando (`tools/run-tests.mjs`). Kraschen med stora ritningar är utredd (plan klar).

- 2026-11-07, v2.4.579: *Bjud in användare* i administrationen (e-post eller personlig länk) och uppdateringsruta med förlopp till 100 %. Serverfunktionen är version 12.
- 2026-11-07, v2.4.578: färgtemat gäller i hela appen.
