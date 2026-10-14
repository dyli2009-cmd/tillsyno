# CE TEST 31 – öppna ny dörr utan automatisk maskintyp-popup

När användaren trycker på + Dörr ska bara det vanliga dörrformuläret öppnas.
Tidigare satte koden automatiskt fokus på Maskintyp-select vid öppning, vilket kan trigga systemets native valruta direkt i iPhone/iPad Safari.

Ändrat: borttaget automatisk .focus() på Maskintyp i + Dörr-handlern.
Maskintyp är kvar som ett normalt select-fält. Väljaren öppnas först när användaren själv trycker på fältet.
Alla tidigare CE-, PDF-, produktlista-, signatur- och profilfunktioner är oförändrade.

Test: simulerad första tryckning öppnar formuläret utan fokus/popup på Maskintyp. Andra tryckningen stänger formuläret. JS-syntax och uppdaterade versionslänkar kontrollerade. Visuellt test i Safari på iPad återstår.
