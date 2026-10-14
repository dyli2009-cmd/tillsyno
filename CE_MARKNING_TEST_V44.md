# CE TEST 44 – mindre ZIP och storleksrapport

- ZIP använder DEFLATE nivå 6 i stället för STORE, fortfarande med streamFiles för iPad/Safari.
- CE-skyltar: JPEG över 450 KB kan krympas vid ZIP-export till högst 1500 pixlar och JPEG-kvalitet 0,82. Exportkopian används bara om den är minst 8 % mindre. Lagrat projektfoto ändras inte. Befintlig inläsning max 1600 px, JPEG 0,85 är kvar.
- Projektfoto hålls kvar i projektet i dess redan förminskade form; originalet från kameran ska användaren behålla på enheten. Fullstora original lagras inte i projektet, vilket annars ökar projekt-PDF-storleken avsevärt.
- ZIP visar faktisk MB-storlek, antal dörrmappar och mailråd (över 18 MiB föreslås att dela på flera ZIP).
- Expanderbar redovisning visar totalsumma i varje dokumentkategori före ZIP-komprimering, inte slutlig komprimerad storlek per kategori.
- Välj färre dörrar för att skicka flera ZIP separat om mejlgräns kvarstår.
- Samma PDF-generering, kryss, underskrifter, projekt-PDF och Kontrollflöde/SmartMatch som TEST 43.
- Kodstrukturen verifierad; riktig iPad- och bildläsbarhetstest återstår.
