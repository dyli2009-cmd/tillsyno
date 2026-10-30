# Tillsyno – gemensamma gränssnittsregler

Användarbeslut 2026-10-29: en gemensam standard, införd en sida/modul i taget. Första beställningen är Kontrollflödet. Detta dokument ger inte tillstånd att ändra andra moduler samtidigt.

## Storleksskala

Alla mått är CSS-pixlar vid webbläsarens standardtext 16 px. Använd rem och den gemensamma användarskalan så att text kan förstoras.

| Roll | Telefon/iPad | Rymlig datorvy |
| --- | --- | --- |
| Brödtext, kontrollpunkter, inmatningsfält | 16 | 18 |
| Etiketter, hjälptext, verktygsnamn | minst 14 | minst 14 |
| Sidrubrik / underrubrik | 24 / 20 | 24 / 20 |
| Verktygsikon | 20–24 | 20–24 |
| Aktiv verktygsknapps tryckyta | minst 44 × 44 | minst 44 × 44 |

Datorskalan kräver minst 1100 px, hover och fin pekare. Manuellt telefon-/surfplatteval behåller sin skala. Layouten måste också fungera i smala datorfönster och på breda pekskärmar. Samma namn och ikon används på alla enheter.

Viktiga åtgärder som Spara PDF och Kundmall visar ikon och text. Kompakt filhantering kan visa ikon med tillgängligt namn och tooltip. Vanlig text ska ha minst 4,5:1 kontrast; status använder även text eller symbol. Avstånd följer normalt 8/16/24 px.

## Anpassning

- Behåll läsbar text; ändra radbrytning, kolumner och placering efter tillgänglig bredd.
- Samla längre verktygslistor i en tydlig utfällbar meny på telefon. Håll ritningsytan användbar.
- Text ska kunna förstoras till 200 % utan att kontroller eller innehåll försvinner. Vid stor text och låg fönsterhöjd får arbetsytan rulla.
- Tangentbordsfokus ska synas. Alla ikonknappar ska ha ett tillgängligt namn.
- UI-skalan får inte ändra ritningskoordinater, stämpelstorlek, PDF-layout eller sparade protokollvärden.

## Arbetsgång för varje sida

1. Läs denna fil, modulens regler och tidigare användarbeslut.
2. Dokumentera avvikelser och avgränsa ändringen till beställd sida.
3. Ändra presentationen med separat, tydligt avgränsad CSS/JS.
4. Kontrollera dator, surfplatta, 390/320 px telefonbredd, smalt datorfönster, manuellt enhetsval, ljust/mörkt tema och 200 % text.
5. Kontrollera sidans verkliga funktioner: öppna, navigera, redigera, spara och återöppna där de finns.
6. Dokumentera resultat och begränsningar. Fysisk iOS-verifiering får inte påstås utifrån enbart webbläsartest.
7. Publicera och gå först därefter vidare till nästa beställda sida.

## Infört först i v2.4.501

`all-in-one.html` och produktionssidan `controlflow-revision/all-in-one.html` använder `controlflow-ui.css` och `controlflow-ui-scale.js`. CSS är begränsad till uttryckligen markerade Kontrollflödessidor. Den separata CSS-lagrets viktiga regler ersätter äldre kompakta UI-mått utan att skriva om delade stilmallar.

Textinställningen lagras i `tillsyno-controlflow-text-level-v1`, med nivåerna 100/112/124/136/160/180/200 %. Ett tidigare mindre textval normaliseras till standardens läsbara bas. Äldre större nivåer 1–3 behåller samma faktor. Inga inställningar för andra moduler skrivs över.

Gamla testversioner, CE, SmartMatch, startsidans layout och fristående säkerhetssidor omfattas inte av denna första utrullning.

## Ritningsyta v2.4.504

När en PDF är öppen och ritningsvyn visas döljs den gula instruktionen, områdesrubriken, protokollnamnsraden och projektrubriken (t.ex. Allt-i-ett). Objekträknaren behålls i en smal rad. Filnamn och arbetsknappar behålls. Rubriker i protokoll-/projektvyer och innan ritningen öppnats följer tidigare regler.

## Kompakta telefonprotokoll v2.4.506

På användarens beställning gäller 14 px kontrolltext, 13 px etiketter och 18/16 px rubriker inom telefonens protokoll. Inmatning behåller 16 px och svarsknappar minst 44 px tryckyta. Avstånd minskas. Revisionsrader visar text och svar bredvid varandra från 360 px vid normal textskala; mindre skärm eller större text får radbrytning. Samma telefonläge används vid högst 800 px eller manuellt val Telefon. Textförstoring bevaras. Dator/iPad och övriga panelers textskala ändras inte.

Ritverktygsfältet (sessionHistoryBar) visas endast i ritningsvyn. Det döljs även när Översikt ligger över en fortfarande aktiv ritningsvy eller när en separat inlinepanel är öppen. Det återkommer när man återgår till ritningen.


## Kompaktare objektuppgifter i Säkerhetsservice v2.4.527

Användaren beställde mindre uppgifter och inga dubbla fil-/projektnamn i arbetsytan efter PDF-öppning. Avgränsat undantag: 14 px rubrik, 12 px etiketter/låsta värden, 14 px redigerbara fält och 36 px fälthöjd. Etiketternas sammanlagda tryckyta är minst 44 px; fokuserade redigerbara fält är minst 16 px på pekskärm. Fyra kolumner på större skärmar, två på telefon, en vid stor text. Kontrollpunkternas text/svarsknappar och sparade namn ändras inte. Övriga moduler följer tidigare regler.
