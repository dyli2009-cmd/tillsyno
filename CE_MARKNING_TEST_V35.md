# CE-märkning TEST 35 – synliga kryssrutor och flersidig Egenkontroll

- Riskanalys 4.6.12 och 4.6.13, SLR-medlemskap i EG-försäkran och Egenkontrollens radio-/kryssrutor ritas direkt som synliga DOM-fyrkanter. Tomma rutor visas utan tryck; valda rutor har ett tydligt X. Den tidigare iOS-känsliga transparenta canvasens första repaint krävs inte längre.
- Om PDF.js inte rapporterar en widget i sitt annotationslager ritas den genom PDF-lib:s per-sida-widgetlista, med samma värden och interaktioner. Ingen extra X-ritning sker i sparad PDF.
- Egenkontroll och andra flersidiga formulär använder naturlig vertikal sidordning, utan en separat 65dvh hög inre vertikal scrollbehållare som kan ge sken av att bara första sidan finns.
- Föregående/Nästa sida och Sida X av Y visar hur många sidor den inlästa PDF-mallen faktiskt har.
- Varje sida renderas med egen felhantering. Ett fel vid återgivning/annotering på en sida stoppar inte alla efterföljande sidor; fel visas nära sidan.
- Om Egenkontrollens importerade original innehåller exakt en sida visas en varning och instruktion att byta mall via Fil. Appen kan inte återskapa saknade sidor ur en ensidig PDF.
- Horisontell rullning tillåten för zoomade sidor på iPad/iPhone.

Tester: JavaScript-syntax. Kontrollrutors DOM-uppbyggnad i tomt och markerat tillstånd; per-page- och fallback-kod granskat. Ingen slutlig visuell kontroll med användarens sparade originalfil eller på fysisk iPad har gjorts.