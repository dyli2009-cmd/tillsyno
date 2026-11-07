# SmartMatch – gemensamt arbete, offline och molnlagring

**Status:** Planeringsunderlag. Diskussionen är sparad; lösningen är **inte byggd eller aktiverad**.  
**Datum:** 2026-10-10.  
**Modul:** Endast SmartMatch TEST / Projektflöde; inte ordinarie Dörrservice, Kontrollflöde eller iOS/TestFlight.  
**Utgångsläge:** SmartMatch TEST v35 är publicerad. v36 används tills vidare som namn på en möjlig framtida utvecklingsomgång, inte som en färdig version.

## 1. Syfte
Flera tekniker ska kunna arbeta med samma SmartMatch-projekt, exempelvis samma ritning med dörrkort och kontrollpunkter, samtidigt från olika iPads och även från olika geografiska platser. Systemet ska fungera när internet saknas, minimera dubbelarbete, bevara varje användares arbete och ge ansvarig arbetsledare kontroll över eventuella konflikter.

## 2. Beslutade principer från diskussionen

1. **Samma projekt för flera tekniker.** Utgångsexempel är tre tekniker, men arkitekturen ska kunna skalas upp.
2. **Automatisk, tillfällig låsning per fysisk dörrposition när man är online.** Inte ett lås för hela projektet och inte bara för beteckningen GS14, eftersom flera fysiska dörrar kan ha samma kod.
3. **Offlinealternativ A är valt.** Teknikern får fortsätta arbeta också med **nya, ännu inte tidigare öppnade dörrar utan internet**.
4. **Offlineändringar sparas lokalt som väntande** och förs över när enheten åter har kontakt. Det ska synas tydligt vad som bara är lokalt sparat respektive serverbekräftat.
5. **Ingen får förlora sitt arbete genom tyst överskrivning.** Ändringar jämförs per kontrollpunkt. Olika oberoende punkter kan normalt sammanfogas; motstridiga ändringar på samma punkt blir konflikter.
6. **Endast ansvarig arbetsledare får avgöra och godkänna konflikter.** Tekniker får se konflikter och fortsätta med andra dörrar men får inte själva avgöra en konflikt.
7. **Spårbar historik.** Registrera vem som gjorde vad och när, samt vem som beslutade i en konflikt och skälet till beslutet.
8. **PDF som arbetsunderlag och export, inte som direkt synkad redigeringsdatabas.** Arbetsstatus synkroniseras separat; vid färdig export skapas en gemensam PDF som visar aktuell procent per berörd position och kan bära med sig sparad SmartMatch-status.
9. **Dropbox, Google Drive eller OneDrive** ska kunna övervägas som lagrings- och delningsplats för käll-PDF/färdig PDF. Ingen leverantör är vald och ingen molnintegration är byggd ännu.
10. **Slutlig projekt-PDF ska inte godkännas förrän väntande ändringar och konflikter är hanterade.** Systemet måste skilja på arbetskopia och granskad/slutlig status.

## 3. Föreslaget arbetsflöde online

- Tekniker öppnar projekt och trycker på GS14 på ritningen.
- SmartMatch begär lås från servern för ett **stabilt unikt dörr-ID** (projekt + fysisk position, inte enbart GS14). Servern godkänner bara en aktiv redigerare åt gången.
- Låset har tidsgräns (lease) och förnyas automatiskt så länge klienten är aktiv och uppkopplad.
- Övriga kan läsa dörrkort/checklista/procent, men inte redigera den tillfälligt låsta dörren.
- När redigeraren stänger med X eller lämnar dörren släpps låset. Om iPaden kraschar kan låset upphöra när tiden löper ut.
- Exakta timeout-tider och regler för övertagning av arbetsledare **är ännu inte bestämda**.

## 4. Föreslaget arbetsflöde offline

- Användaren måste kunna ha tillgång till ritningar, dörrkort och checklistor lokalt. Föreslagen funktion: **Gör projekt tillgängligt offline** med kontroll att allt nödvändigt material har hämtats.
- Avbockningar, kommentarer, egna punkter och andra tillåtna ändringar sparas lokalt som separata ändringshändelser i en beständig kö (för webb/iPad kan IndexedDB vara en kandidat; teknikval är inte fattat).
- Skärmen visar tydligt `Offline`, `Sparat på denna iPad` och antal `Väntar på synkronisering`.
- Det går att öppna även nya dörrar offline, **men enheten kan då inte garantera att ingen annan arbetar på samma dörr**.
- Om ett online-lås fanns före avbrottet kan servern låta det löpa ut. Det gamla offline-arbetet blir inte automatiskt exklusivt.
- När internet återkommer skickas köade händelser med unik händelseidentitet och ursprunglig basversion. Servern måste kontrollera att återförsök inte skapar dubletter.
- Rensa inte den lokala kön förrän servern uttryckligen kvitterat berörd ändring. Vid serverfel ska kön finnas kvar och synkförsök kunna göras om.
- Offlinearbete innebär särskild risk om användaren rensar Safari/webbplatsdata, avinstallerar appen eller förlorar iPaden före synk; lokala säkerhetskopior/återställningsväg och enhetsskydd ska utredas och testas.

## 5. Konfliktregler och arbetsledarens granskning

**En konflikt är inte samma sak som en sen synkning.** Servern jämför varje ändring mot den senaste accepterade versionen av samma kontrollpunkt.

| Scenario | Föreslaget resultat |
|---|---|
| Tekniker A ändrar GS14/Cylinder, ingen annan har ändrat den punkten | Acceptera och synkronisera |
| Tekniker A ändrar GS14/Cylinder och B ändrar GS14/Slutbleck | Sammanfoga om de är oberoende |
| Två personer anger samma nya värde på samma punkt | Kan behandlas som förenligt, men spara båda händelsernas historik |
| A anger Färdig, B anger Ej färdig på samma punkt | Konflikt, ingen tyst överskrivning |
| Någon ändrar eller tar bort en punkt medan en annan ändrar dess status | Kräver särskild konflikthantering, inte blind sammanslagning |
| Offline-teknikern återkommer när någon annan tagit över dörrens lås | Jämför händelserna; gammalt lås ger inte rätt att skriva över |

**Granska konflikter** är en separat vy för ansvarig arbetsledare:
- Dörrens stabila ID, ritningsplacering, punkt, ursprungligt värde och båda versionerna.
- Teknikernas namn, tidsstämplar, händelseordning och om registreringen skedde offline.
- Alternativ för att fastställa giltig status eller kräva ny kontroll på plats.
- Beslutet måste kunna kopplas till arbetsledarens konto och sparas i oföränderlig revisionshistorik.
- Tekniker kan se att punkten väntar på beslut, men inte avgöra konflikten.
- Övriga dörrar får fortsätta uppdateras.
- Den officiella procenten räknas utifrån **accepterade** ändringar. Osäkra punkter ska flaggas och en olöst konflikt får inte tyst ge projektet slutstatus 100 %.

## 6. Roller och säkerhet

| Åtgärd | Tekniker | Ansvarig arbetsledare |
|---|---|---|
| Öppna tilldelat projekt och läsa ritning/dörrkort | Ja | Ja |
| Bocka av och arbeta offline | Ja | Ja |
| Se synkstatus och konflikter | Ja | Ja |
| Avgöra konflikt | **Nej** | **Ja** |
| Godkänna slutlig projektstatus | **Nej** | **Ja** |

Behörigheten ska kontrolleras på servern, inte enbart genom dolda knappar. Säker inloggning, företags-/projektåtkomst, kryptering, loggning, radering och eventuell kundpolicy för säkerhetsritningar behöver utredas före införande. **Lägg inte kundritningar, behörighetsnycklar, åtkomsttoken eller hemliga uppgifter i detta publika GitHub-repo.**

## 7. Föreslagen koppling till Dropbox / Google Drive / OneDrive

Arkitekturen skiljer mellan:
- **Filer:** Källritningar, dörrkort och färdig PDF i företagets valda molntjänst.
- **Synkroniserad arbetsdata:** Dörrarnas status, lås, ändringshändelser, procent, roller och konflikter i en gemensam projekttjänst/databas.
- **Lokal offlinekopia:** Behörigt nedladdade projektfiler och en kö med ännu inte överförda ändringar på varje iPad.

**Varför inte skriva till samma moln-PDF efter varje klick?** Dropbox/Drive/OneDrive hanterar filer och versioner, inte transaktionella lås och sammanslagning på nivån enskild kontrollpunkt i SmartMatch. Tre samtidiga PDF-uppdateringar riskerar olika filversioner eller överskrivning. Molntjänsten får därför vara fillager; SmartMatch sköter samarbetslogiken.

En enda leverantör bör integreras och testas först. Vilken som ska prioriteras (OneDrive, Google Drive eller Dropbox) är **inte beslutat**. Företagets säkerhetskrav, API-åtkomst, kostnader och krav på filplacering behöver kontrolleras. Undvik offentliga länkar till kundernas säkerhetsritningar.

## 8. Föreslagen implementation i etapper (inte beställt som kodarbete ännu)

1. **Gemensam datamodell:** stabilt dörr-ID, kontrollpunkt-ID, version/revision och ändringshändelser. Kartlägg befintligt SmartMatch-format och migration av sparad PDF-status.
2. **Inloggning och projektåtkomst:** roller för tekniker/arbetsledare; separera kundprojekt och säkerställ servervaliderad behörighet.
3. **Online-synkning och låsning:** atomärt dörrlås, förnyelse, frigivning, flera samtidiga uppkopplade iPads och synliga statusuppdateringar.
4. **Offlinepaket och kö:** hämta material i förväg, lokala kontrollpunktsändringar, pålitliga återförsök och verifierad serverkvittens.
5. **Konfliktdetektion och arbetsledarvy:** granular jämförelse och behörighetsstyrt avgörande; ändringshistorik.
6. **PDF-import/export:** procent på ritningen, inbäddad projektstatus och återöppning; endast godkända, synkade ändringar i slutlig export.
7. **Molnfilintegration:** börja med en vald leverantör; lagra original och godkänd PDF, utan per-klick-överskrivning.
8. **Test/pilot:** minst tre riktiga iPads/tekniker på testprojekt innan skarp användning.

## 9. Kritiska testfall före pilot

- Två online-tekniker försöker öppna exakt samma fysiska dörr; bara en får redigera.
- Två GS14 på olika ritningspositioner ska ha separata lås och separata procentvärden.
- Lås förnyas när klienten är aktiv och återhämtar sig korrekt efter krascher/utgångna lås.
- Tekniker arbetar flera timmar offline på en **ny** dörr; inga data försvinner när internet återkommer.
- Två offline-tekniker ändrar **olika** punkter på samma dörr; de sammanfogas korrekt.
- Två offline-tekniker ändrar **samma** punkt motstridigt; endast arbetsledare kan avgöra.
- Synkförsök upprepas efter nätverksfel utan dubbla registreringar.
- Allt osynkat arbete flaggas innan användaren byter enhet, rensar lagring eller försöker slutexportera.
- Import av exporterad PDF på en annan iPad visar rätt tidigare accepterad procent/checklista.
- Slutlig PDF-export fungerar från gemensam godkänd status och ger inte dubbla procentetiketter.
- Åtkomst nekas när användaren inte har rätt till projektet; konflikthantering kan inte kringgås med klientanrop.
- Kontrollera dataskydd, åtkomst och leverantörsvillkor för ritningar som kan innehålla säkerhetsinformation.

## 10. Öppna frågor vid nästa diskussion

- Vilket moln använder företaget faktiskt: OneDrive, Google Drive eller Dropbox?
- Ska originalritningarna lagras i molnet, enbart lokalt, eller erbjudas i båda lägena beroende på kundens policy?
- Ska arbetsledaren kunna ta över ett aktivt dörrlås? Hur hanteras frånvaro, och hur lång är lease-tiden?
- Vem kan bjuda in tekniker, och ska arbetsledare kunna tilldela ansvar/områden utöver låsningen?
- Vad är den konkreta offlinebackupen om iPad/webbläsarlagring försvinner?
- Hur länge ska ändringslogg och gamla PDF-versioner sparas?
- Ska arbetsledaren kunna kräva fotobevis/signatur vid konflikt eller vid godkännande?
- Vad ska räknas som 'slutligt godkänt' när det finns väntande offlineändringar på en annan iPad?

## 11. Återuppta arbetet

När användaren säger **"Fortsätt SmartMatch-planen för tre tekniker"** eller frågar om **samtidigt arbete/offline/molnlagring**, läs detta dokument och `DEVELOPMENT_RULES.md` innan vidare beslut eller kodning. Ta hänsyn till de fattade besluten men behandla allt under 'Föreslagen' och 'Öppna frågor' som ännu inte godkänt för implementation.

**Ingen samarbetskod ska byggas bara för att den här planen sparats.** Bestäm teknisk lösning och säkerhetskrav först.
