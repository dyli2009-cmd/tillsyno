# Kontrollflöde 2.4.501 – läsbarhet och gemensamma gränssnittsregler

Kontrollflödets Säkerhetsservice/Brandsäkerhet och Dörrautomatik/Lås använder nu samma textroller, ikonmått och tryckytor enligt UI_RULES.md. Text och inmatning är 16 px i telefon/surfplattevy och 18 px i rymlig datorvy; rubriker är 24/20 px och stödtext minst 14 px. Viktiga huvudknappar visar ikon och text. På telefon öppnas objektval i Lägg till objekt-menyn, vilket ger ritningen mer plats.

Den separata textskalan går från 100 till 200 %. Större text får radbrytning och rullning i stället för att tryckas ihop. Symbolknappar för kontrollresultat behåller minst 44 px tryckyta; brandprotokollens svar med full text får tillräcklig bredd. Textskalan påverkar inte ritningens markörer eller PDF:ens storlekar. Kontrollflödets gamla negativa textnivå normaliseras till den nya basstorleken utan att skriva över andra modulers inställningar.

## Verifiering

Browserharness finns i tests/controlflow-ui/ med körinstruktioner. Testerna använder produktionskoden och syntetisk PDF/protokolldata. Autentisering och offlineuppstart ersätts endast i testserverns HTML-svar; produktionsfilerna behåller sina skydd och uppstartsflöden.

- Godkänt: 23 webbläsarfall och 1131 kontrollpåståenden. Fall: båda produktionsingångarna i 1440×900, 834×1194, 390×844 och 320×740 med ljust/mörkt tema; ytterligare fem teman på telefon och manuellt telefon-/surfplatteval i stort fönster.
- Alla tio protokolltyper: läsbar kontrolltext, fungerande svarsknappar och bevarade uppgifter efter textförstoring.
- Huvudverktyg/resultat har minst 44 px tryckytor; viktiga verktygstexter har kontrast minst 4,5:1 i de kontrollerade tillstånden.
- Text kan dubbleras utan horisontellt sidöverflöde eller ändrade objektdata/stämpelmått. Ritningen behåller användbar höjd vid basstorleken.
- Faktisk PDF-export med protokollsidor och inbäddade objekt i båda ingångarna. Säkerhetsservice: bevarad rotation, originalfilnamn samt stängning/återöppning med lokala ändringar.
- Visuell granskning av dator, telefon och extra stor text. JavaScript-syntax och diffkontroll.

Testresultatet avser Chromium i fasta fönster/iframes. Fysisk iPhone/iPad, Safari, TestFlight och autentiserad produktionssession har inte provats. Detta är inte en fullständig tillgänglighetscertifiering.

## Avgränsning och återställning

Produktionslogiken för PDF, inloggning och lagring är oförändrad. Nya UI-filer aktiveras bara via data-controlflow-ui på Kontrollflödets två ingångar. Startsidan ändrar endast versionsnummer/länk och service workern får ny cacheversion samt de nya UI-resurserna. Ingen global CSS eller annan modul ändras. För återställning återställs releasecommitten som helhet och en ny cacheversion publiceras.

## Slutkontroll och korrigering i v2.4.502

En oberoende kontroll med emulerad pekskärm fann 96 px rityta på 320×740 när samtliga sju protokolltyper i rotens arbetsyta var valda. Arbetsytan får nu minst 180 px rityta i normal textskala. Flexlayouten tillåter vertikal rullning när rubriker och kontroller behöver mer utrymme. Detta gäller endast rotens ritningsläge; den separata revisionsmodulen och gränssnittsstandarden från v2.4.501 behålls.

Fyra ytterligare Chromium-fall är godkända: 1440×900, 834×1194, 390×844 och 320×740, med pekskärmsemulering för de tre sista. Kontroll på produktionskoden omfattar typografi, tryckytor, objektmeny, alla sju protokolltyper, textskala 200 %, bevarade data, verkliga PDF-byte och stängning/återöppning. Testkravet för rotens minsta rityta är skärpt till 180 px.
