# Tillsyno v2.4.323 – större startsida endast på dator

Beställt 15 oktober 2026: större, tydligare startsida på dator. Telefon och iPad bevaras, samma färgtema.

Avgränsade CSS-regler under body.homeMode #appHome, minst 1100 px med hover och precis pekare. Telefon-/surfplatteval är undantagna även med mus. Startsidan får en 700 px ram och upp till 640 px breda kort, 20 px korttitlar, 14 px beskrivningar och 60 px ikonytor. Inga nya färger eller ändrade länkar, arbetsflöden, PDF-funktioner eller data. Endast gemensam versions-/cachehöjning utanför startsidan.

Verifierat i Chromium: 49 före/efter-fall, sju teman vid sju skärm-/enhetsinställningar. Samtliga 28 telefon-/iPad-bilder är pixelidentiska, inklusive liggande touch och uttryckligt surfplatteval med mus. Dator kontrollerad vid 1440x900, 1366x768 och 1280x600; större kort/text/ikoner, samma palett/länkar, ingen horisontell överströmning och inga runtime-fel. Bildgranskning av datorns ljusa och mörka tema. Ingen fysisk iPad- eller ny TestFlight-build verifierad.

Motsvarande CSS/version speglas till iOS-källan, men villkoret ändrar inte dess touchlayout. Kontrollflödet är fortsatt låst.
