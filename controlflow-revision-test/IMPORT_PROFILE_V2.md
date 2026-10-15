# Arbetssätt 2 – TEST v2

Användaren godkände separat implementation och publicering 2026-10-15. Aktiv testadress: `all-in-one.html?v=2`. Den föregående testytan finns i `v1/all-in-one.html`.

## Identifiering och avgränsning

Den nya profilen kräver ritningens FreeTextCallout-pilar med maskin-ID, en revisionsmall med igenkännbar rubrik och protokollens ID i egna textmarkeringar. Den använder inga kundnamn, objektnummer eller filnamn för att välja lässätt. Filnamnet används endast som föreslaget projektnamn.

Finns P/GoTo-länkar används alltid den befintliga låsta importen. `legacy-door-import.js`, `security.js` och övriga gamla runtime-filer är oförändrade; bara den aktiva HTML-ingången byter till separata v2-filer. Ordinarie Kontrollflöde, SmartMatch och iOS ändras inte.

## Ny läsregel

- Skilj ritning, anmärkningsöversikt och revisionsprotokoll åt. Översikt och gamla protokoll blir inte ritningssidor i den nya arbetsfilen.
- Läs maskin-ID från dess textmarkering på protokollet och från pilens innehåll på ritningen. Datum får inte fungera som maskin-ID.
- Kräv hela samma ID för automatisk koppling. Flera motstridiga kandidater eller avvikande ID ger manuell kontroll; inga likhetsmatchningar eller närhetsgissningar görs i denna profil.
- Pilspetsens CL-koordinater och märkningens rektangelmitt räknas om till samma sidkoordinater som appen använder, inklusive PDF-rotation. Varje importerad pil behåller egen position.
- Läs företag, beställare, kontakter, telefon, adress, postnummer och ort efter mallens rubriker och kolumner. Välj inte företag från ritningens gamla logga, markeringens författare eller ett upprepat ämnesnamn.
- Läs anläggningsnummer och avtalsnummer från respektive ruta. Översiktens uttryckliga ordernummer får komplettera en tom orderruta. Besöksdatum och nästa provningsdatum hålls skilda från serviceintervallets text.
- Gemensamma fält som skiljer sig mellan protokoll lämnas tomma och flaggas för kontroll under Projekt.
- Gamla Allmän Info-anteckningar blir tidigare anteckningar/anmärkningar. Dagens 18 kontrollsvar börjar tomma. En gammal underskrift gör inte nya kontrollen signerad.

## Manuell koppling

Alla läsbara pilar visas, även om ett protokoll med samma fullständiga ID saknas. Banner och dialog visar vad som behöver kopplas och listar ännu okopplade protokoll. Ett uttryckligt val kopplar vald pil till valt protokoll och använder protokollets ID. Ritningens ursprungliga ID finns kvar som referens. Pilspets och etikettposition ändras inte.

Kopplingsstatus, källsidor, gamla anmärkningar och ännu okopplade protokoll sparas inuti vanliga objekt-/projektdata. Därmed följer de med vid lokal sparning, arbets-PDF, återöppning och ångra/gör om. V2 använder egna lokala nycklar/databaser. Behörighetskontrollen är samma oförändrade Kontrollflödeskontroll.

## Verifiering

`tests/controlflow-revision-copy-v1.cjs` verifierar den låsta grundkopian. `tests/controlflow-revision-browser-v1.cjs` kör oförändrad funktion på arkiverad v1. `tests/controlflow-revision-browser-v2.cjs` använder syntetiska PDF:er med olika företag/filnamn, roterad ritning, gamla datum, dubbla kolumnrubriker och ett avvikande maskin-ID.

Verifierat: exakta pilkoordinater, tre automatiska och en manuell koppling, alla projektfält, 18 tomma kontrollsvar, historik, arbets-PDF före och efter manuell koppling, ångra/gör om, telefonbredd 390 px, surfplattebredd 820 px och offlineåterladdning/import. V2:s dispatcher har även testats med en P/GoTo-fil och bevarar den låsta importens positioner.

En separat privat uppladdad service-PDF verifierades lokalt: en ritningssida, fyra pilar, tre exakta ID-matchningar och en synlig avvikelse. Företags-, beställar-, kontakt-, adress-, nummer- och datumfält jämfördes med originalet. Kundfilen och dess kontaktuppgifter ingår inte i repot. Inloggningens nätverkssvar simulerades i webbläsartesterna; fysisk iPhone/iPad återstår att prova.
