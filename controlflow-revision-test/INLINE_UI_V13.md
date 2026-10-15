# Inga popup-rutor – TEST v13

Användarbeslut: appens egna val, redigering och borttagning ska inte öppna popup-rutor.

- Objekt, kontrollpunkt och textanteckning tas bort direkt. En Ångra-knapp visas i appens befintliga meddelanderad och återställer föregående sparade ändring via sessionshistoriken. Även ritningsverktygens befintliga direkta borttagning och globala ångra finns kvar.
- Alla native alert/confirm/prompt-anrop har tagits bort från aktiv security-runtime. Text, kontrollpunkter och egna automatikmodeller redigeras i vanliga appvyer med Spara/Avbryt/Tillbaka.
- Ny service startar direkt från sin beskrivna knapp och kan ångras. Arbetsfilens Fortsätt/Ny service är en vanlig vy.
- Protokollval, ögat med flera typer, signatur, sparalternativ, filnamn, inställningar, importavvikelser, formulering och kundmall visas i dokumentflödet med Tillbaka. Ingen bakgrundsskugga, centrerad ruta, top-layer eller låsning av resten av sidan.
- Ett avgränsat kompatibilitetslager visar befintliga dialogbaserade hjälpvyer som appvyer. Deras öppet/stängt-kontrakt och close-händelser bevaras. Källfilerna för låst importerare och äldre läsprofiler ändras inte.
- Operativsystemets filväljare för Öppna/Spara används fortfarande som vanligt.

Omfattning: enbart separat revisionstest. Ordinarie Kontrollflöde, auth/licenser, SmartMatch och iOS berörs inte. PDF-format och innehåll är oförändrade. Föregående TEST v12 är arkiverad med sina oförändrade runtime-filer.

Verifierat i Chromium: inga native dialoghändelser eller :modal-element; borttagning och fullständig återställning av objekt/kontrollsvar/text; lägga till/ändra/avbryta; sparvy; nästlad översikt/kundmall och Tillbaka; navigation; ny service och Ångra; handskriven signatur; inställningar; telefonbredd. Dessutom full regressionskörning av serviceöversiktens PDF-länk, exakt kundmallsbild/export, flytt/storlek/format, sparat arbete, offline och borttagning, samt v12:s protokollayout. Baslinjeisolering och historiska hashkontroller passerar.

Test: tests/controlflow-inline-v13.cjs.
