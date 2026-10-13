# SmartMatch SLR TEST v36.125 – delade dörruppgifter och tydliga kontrollsteg

## Beslut 13 oktober 2026

- Företag, organisationsnummer och valfria mått ska inte hindra att ett dokument markeras kontrollerat.
- Fasta steg används i stället för en exakt fältprocent: 0 % innan dokumentets huvudval är besvarade, 50 % när de är besvarade, 100 % först efter Markera kontrollerat. Under arbetet visas antal besvarade huvudval. Det är en förberedelsestatus, ingen automatisk säkerhetsbedömning.
- Riskanalysens gemensamma dörruppgifter ska följa med till egenkontrollen för samma dörr. Utförd av, kontrollens datum, underskrifter och kontrollstatus ska fortsätta hanteras separat.
- Dörrnummer, beteckning ska vara märkningens sista nummer (1, 10, 11 osv.). Maskin-ID ska behålla hela objektnummer–maskintyp–sista nummer, exempelvis 20-01-54-7-8-24-1.

## Byggt

Gemensamma namngivna kontakt-, adress-, order- och dörrfält delas mellan Riskanalys och Egenkontroll. Passagehöjd, aktiv/passiv dörrbladsbredd och vikt, öppningsvinkel samt antal dörrblad/maskindrivna följer samma dörr. Äldre egenkontroller får motsvarande riskvärden som förval när egna värden saknas. Egna undantag på andra dörrar bevaras. Ändra arbetar i vald glasprofil; Ändra endast denna dörrautomatik arbetar bara i vald dörr och dess två motsvarande dokument. Ändrade dokument öppnas för ny kontroll; kontrollerat-markering sprids aldrig till andra dörrar.

Riskanalysens huvudval räknas från formulärfälten (objektsorientering, risknivå, antal dörrblad/maskindrivna och 4.6-punkterna); egenkontrollen använder huvudpunkterna 10.5. Ett radioalternativ räcker per punkt, och krysspunkter kan vara uttryckligen markerade eller avmarkerade. Underval och fritext räknas inte som obligatoriska fristående punkter. Ett avmarkerat standardkryss bevaras som avmarkerat. Loggbokens automatiska 50 %-steg använder modell och installationsdatum. Maskinbeskrivning och tillverkarförsäkran använder sina radio-/listval. Markera kontrollerat förblir teknikerns aktiva bekräftelse, även när ett fält är valfritt eller ej tillämpligt.

Mappmarkeringen och dörrens sista Klart-steg behålls. Alla sju manuellt kontrollerade mappar visar tillsammans 100 %, därefter trycks Klart innan färdigt mapppaket kan exporteras. Delad signatur och rullbar PDF-visning från v36.124 behålls.

## Avgränsning och sparning

Endast separat SLR TEST v36.125 och fasta smartmatch-slr-test.html ändras. v36.124 bevaras. Ny lokal versionsnyckel används; befintligt arbete tas med via sparad projekt-PDF. Uppgifter och granskningar sparas fortsatt som små dörr-/profildata; inga nya PDF-kopior per dörr skapas. Ordinarie SmartMatch, Kontrollflöde, GS-regler, inloggning och iOS/TestFlight ändras inte. DA-filen är byteidentisk med v36.123.

## Verifiering

- tests/slr-folders-v36-125.cjs passerar med riktig pdf-lib/JSZip: delade profilvärden, individuella undantag, egna granskningsmarkeringar, separata utförd-av/datum, 0/50/100-steg och valfria textfält.
- Dörrnumren 1/10/11 verifierade, med bibehållet fullständigt Maskin-ID i PDF.
- Riskanalys och egenkontroll verifierade mot användarens verkliga mallar lokalt: 17 respektive 26 huvudval, kopierade mått och korrekt dörrnummer. Första sidorna renderade och visuellt kontrollerade. Mallarna läggs inte i GitHub.
- Sparning/återöppning och ZIP med två dörrar/14 dokument passerar. Tre projekt-PDF-exporter ökade endast några byte och behöll kundbilaga samt delade mallar.
- JavaScript-syntax och versionsreferenser kontrollerade. Komplett visuell appgranskning och kamera på iPhone/iPad återstår. Detta är inte ett prestandatest av ett stort kundprojekt.

