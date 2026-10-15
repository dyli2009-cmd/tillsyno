# Tillsyno v2.4.358 – fungerande reservväg för ZIP-delning

Användaren rapporterade att ZIP-filer skapades i CE-märkning men inte gick att dela från datorn.

En brist återskapades i den tidigare koden genom att webbläsarens delningskontroll returnerade true och själva delningen sedan avvisades med NotAllowedError. Den färdiga ZIP-filen fanns kvar, men sidan visade bara ett fel utan att hämta filen. Detta reproducerar kodvägen; användarens exakta webbläsare/felmeddelande är inte fastställt.

Samma begränsade rättning används för både Spara valda filer och Exportera komplett CE-underlag:

- Saknad delningsfunktion, negativ/felande delningskontroll och avvisad direktdelning startar den vanliga ZIP-hämtningen.
- Statusraden anger filnamnet och att ZIP-filen kan bifogas i mejl från Hämtade filer. Detta skickar inget mejl och påstår inte att en mottagare har fått filen.
- Avbruten delning behåller ZIP-filen och startar ingen oönskad hämtning.
- Ett pågående delningsförsök spärrar dubbelklick. Knappen går att använda igen efteråt.
- Delning anropas direkt i klicket. Filen genereras inte på nytt där.
- Samma färdiga fil, namn och bytes används i direktdelningen och i reservvägen. Urval, ifyllnad, godkännanden och projektdata ändras inte.

`tests/ce-zip-share-v358.cjs` använder riktiga PDF- och ZIP-filer genom båda exportvyerna. Det kontrollerar avvisad delning, fördröjt avslag, synkrona fel, saknade API:er, felande delningskontroll, avbrott, lyckad delning, användaraktivering och dubbelklick. Hämtade filer jämförs byte för byte med Spara ZIP. Den kompletta exportens sju dokumentmappar kontrolleras också. CE_REPRODUCE_PREVIOUS=1 kan användas innan commit för jämförelse mot tidigare HEAD.

`tests/ce-file-export-v312.cjs` behåller kontrollerna av 30 riktiga PDF-filer, urval, numrering, saknade dokument/signaturer, skydd mot inaktuellt projekt och offline-export.

Verifieringen gäller Chromium med kontrollerade svar från delningsfunktionen. Verklig OS-delning och mejlprogram varierar mellan datorer; direktdelning kan fortfarande nekas av webbläsaren, men filen finns då att bifoga manuellt. Endast den fristående CE-modulen ändras funktionellt; övriga moduler får gemensam versions-/cachemärkning.
