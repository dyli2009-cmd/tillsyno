# CE-dörrad: rättning av sen centrering – v2.4.316

Rotorsaken reproducerades i den riktiga arbetsytan: tillsyno-appearance.js lägger via sin MutationObserver till en ikon efter 150 ms när dörradens text innehåller exempelvis dokument eller mapp. Med ceDoorOpen justify-content:space-between blir det tre barn (ikon, text, procent). På dator flyttades textstarten från vänsterkanten till x=529 medan ikonens högra kant var x=342 – ungefär 188 px tomrum. v315 rättade rubrikerna men inte denna dynamiska dörrad.

CE-raden skapar nu sin egen SVG-mappikon i renderDoors. Det generiska utseendelagret upptäcker befintlig SVG och lägger inte till en andra ikon. CE-sidans avgränsade CSS ger info flex:1, vänsterställd text, fast ikonbredd och procent till höger. Inga ändringar i den gemensamma ikonregeln, andra moduler eller data.

Verifierat med en verklig dörr på platsen Dokumentförråd, som utlöste problemet före rättningen. Vid 390/768/1366 px ligger texten 8 px efter ikonen både direkt och efter den fördröjda dekoreringen. Exakt en ikon, oförändrad position och procent till höger. Sparat projekt återöppnat och kontrollerat igen. Visuell granskning på dator. Webbändring, native-källan saknar CE och speglar bara versionen.
