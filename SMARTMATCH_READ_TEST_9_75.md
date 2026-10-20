# Avläsning TEST 9.75 – löpande lokalt arbete utan automatisk PDF-export

Användarbeslut 2026-10-20: pausa SharePoint och förbättra sparandet efter omstart i Safari och TestFlight med en PDF på nästan 100 MB. Små filer fungerar enligt användarens test.

Ändringar:
- Spara öppnar en lätt dialog och tömmer endast kön för arbetsdata. Ingen PDF läses, byggs eller verifieras automatiskt.
- Förbered PDF startar den befintliga fullständiga exporten uttryckligen. Efter verifiering används Spara PDF. Byte av exportalternativ startar inte heller tungt arbete.
- Befintlig lokal autosparning använder en begränsad väntan på 250 ms från första ändringen, även under kontinuerligt arbete. Original-PDF byggs inte om för varje avbockning.
- En skrivare köar aktuella arbetslägen. Nyare ändringar bevaras om en tidigare skrivning misslyckas. Sparstatus visas efter slutförd transaktion och fel går att försöka igen.
- PDF-exporten inväntar arbetsdatans lokala transaktion och stoppas vid sparfel innan tung PDF-bearbetning startas.

Befintlig delad lokal 9.x-projektlagring behålls för att tidigare arbete ska vara tillgängligt. Avläsningens egen labbnyckel är versionsmärkt 9.75. Original-PDF och arbetsdata är fortfarande lokal enhetslagring; detta är ingen molnbackup eller fleranvändarsynkning. PDF-exporten är fortfarande fullständig och verifierad och kan fortfarande överskrida enhetens minnesbudget.

Verifiering: tests/smartmatch-incremental-save-v9-75.cjs kör riktiga kö- och dialogfunktioner i Node VM med styrda transaktioner/timers. Täcker tät redigering, ändring under skrivning, kvotfel, bevarande av nyare utkast, återförsök och dialogöppning med en 100 MiB bytebuffert utan PDF-export. Detta är inte en riktig stor PDF eller ett fysiskt iOS-minnestest. Syntax och lokala HTML-resurser kontrollerade. Playwright kunde inte starta eftersom webbläsarbinären saknas.

Slutprov: öppna exakt användarens stora PDF på iPad, ändra en kontrollpunkt, invänta lokal sparstatus, öppna Spara och spara lokalt. Återöppna och kontrollera arbetet. Prova därefter separat Förbered PDF och notera sista exportsteget vid eventuell omstart.

Tidigare 9.74-filer är oförändrade. Kontrollflöde, auth och SharePoint är oförändrade. Inga iOS-/Capacitor-källor finns i detta repo; ingen TestFlight-build har skapats eller verifierats.
