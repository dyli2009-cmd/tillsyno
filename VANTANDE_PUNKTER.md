# Väntande punkter – vad som behövs och när

Senast uppdaterad 7 november 2026, Tillsyno v2.4.579.

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

- [ ] **Svag grå hjälptext i ljusa teman:** kontrasten är 3,7–3,9:1 i hela appen. Färgen sitter i den gemensamma temafilen som även Kontrollflödet använder. En ändring kräver att du skriver **"Lås upp Kontrollflödet"**.
- [ ] **SmartMatch *Uppdatera och fortsätt*:** har ingen förloppsstapel ännu, eftersom det är ett eget flöde som sparar arbetet först. Säg till om den ska få samma stapel som startsidan.

## 7. Teknisk skuld (Claude, när det passar)

Följande tester fallerar likadant på main och har inget med de senaste ändringarna att göra:

- [ ] De äldre temafeltesterna (`theme-consistency-v319`, `navigation-theme-v320`, `save-theme-v321`, `customer-preview-theme-v322`, `ce-signature-theme-v357`) stoppas av kodlåset för moduler (v2.4.562) och väntar sig ett körfel som inte längre finns.
- [ ] `tillsyno-admin-auth`: sista delen väntar sig att inloggningen leder till `index.html`, men den leder nu till `app.html`.
- [ ] `offline-cache-performance-browser`, `controlflow-revision-copy-v1`, `smartmatch-projektering-v2-8-suggest` och `time-overview-v525` fallerar. `smartmatch-read-appearances-v9-93` saknar modulen `@napi-rs/canvas`.
- [ ] SmartMatch Version 1.5 (`smartmatch-slr-test.html`) länkar till `project-workspace-smartmatch-test.html`, som inte publiceras.

---

## Avbockat

- 2026-11-07, v2.4.579: *Bjud in användare* i administrationen (e-post eller personlig länk) och uppdateringsruta med förlopp till 100 %. Serverfunktionen är version 12.
- 2026-11-07, v2.4.578: färgtemat gäller i hela appen.
