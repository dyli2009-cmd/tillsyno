# Kontrollflöde UI – webbläsarprov

Kör från repots rot:

```
node tests/controlflow-ui/server.cjs --port 4173
```

Öppna `http://localhost:4173/qa-matrix.html` i en webbläsare. Testsidan visar PASS/FAIL och detaljerade påståenden för varje fall. `qa-visual.html` visar fasta telefon-/surfplattebredder för visuell granskning. I managed Sites-preview används samma server med CLI:ns tilldelade `--host` och `--port`.

Testservern är endast lokal QA. Den läser produktionsfilerna utan att skriva om dem och tar bort inloggnings-/offlineuppstart ur HTML-svaret. Den injicerar syntetisk PDF/protokolldata. Ingen riktig inloggning, kundfil eller extern databas används. På osäkra HTTP-testvärdar skickas SHA-256-arbetet till testserverns lokala Node-crypto, eftersom Web Crypto där saknas. Produktionskoden och HTTPS-flödet ändras inte.

Omfattning:

- Två produktionsingångar, dator 1440×900, surfplatta 834×1194, telefon 390×844 och 320×740, ljust/mörkt tema.
- Återstående fem teman på telefon samt manuellt telefon-/surfplatteval i stort fönster.
- Läsbar text och formulär, 44 px verktygs-/resultatknappar, kontrast i viktiga verktygstexter, ritningshöjd och horisontell sidbredd.
- Utfällbar Lägg till objekt-meny på smala skärmar.
- Alla tio protokolltyper, ändrade kontrollresultat, textskala till 200 % utan ändrade objektdata eller stämpelmått.
- Faktiska exporterade PDF-byte: protokollsidor, inbäddade objekt, rotation/filnamn och stängning/återöppning i Säkerhetsservice.

Webbläsarfönster/iframe-bredder är inte fysisk iOS, touchhårdvara eller TestFlight. Native-bygge och autentiserad produktionssession ingår inte i detta test.

## Menyregression v2.4.503

Menykontrollen testar nu varje aktiv objekttyp i 100/200 % text. Den rullar fram knappen och kontrollerar med `elementFromPoint` att knappens mittpunkt faktiskt tar emot klick, väljer typen och placerar ett objekt genom ritningens klickhanterare. Detta fångar överlappning som ett ensamt `.click()` eller måttkontroll missar. Manuell pekarinteraktion kompletterar det syntetiska testet. Lokal HTTP får en testbegränsad `randomUUID`-ersättning; produktionsappen och autentisering ändras inte.
