# CE TEST 32 – gemensam glasstandard och märkta dörranpassningar

**Delad ifyllnad per dörrtyp**
- Alla dörrar med Med glas använder samma redigerbara glasstandard. Dörrar Utan glas har en separat standard.
- Ny dörr kopierar inte längre fabriksförval in i privat fältdata. Samma glasval ärver alltid samma gemensamma ifyllnad; objektnummer, dörr-ID, maskin, antal och placering kommer fortsatt från aktuell dörr.
- Ändras gemensam standard genom knappen Standard gäller förändringen för alla dörrar med den typen, medan verkliga undantag på enskild dörr bevaras.
- Äldre sparade projekt före intern data-schema 6 migreras för att rensa mekaniskt kopierade standardkryss (utan att radera fria texter eller avvikande egna val). Sparformatet är nu 6.
- Om en dörr redigeras utan byte av glasval ska tidigare egna avvikelser behållas. Byte av glasval återställer bara kryss kopplade till profilen.

**Tydlig status per dörr och mapp**
- Dörrlistan visar Gemensam standard eller Egen anpassning · N mappar beroende på vilka dokument som avviker.
- Dokumentmappar med egna fältändringar, individuell produktlista eller CE-foto visar Egen anpassning.
- Standardöversikten har tydliga knappar Standard (ändrar alla för typen) och Bara denna (ändrar bara den aktuella dörren).
- Signering, kontrollprocent och godkännande räknas inte som anpassade ifyllnadsvärden. Avvikelse tas bort när ett eget fält återställs till samma värde som standarden.

**Testning**
- JavaScript-syntax kontrollerad.
- Med tre glasdörrar och en utan glas är grundvärdena samma; avvikelse på dörr 2 påverkar inte dörr 1/3 och markeras bara på dörr 2.
- Ändring i gemensam standard följer alla tre glasdörrar men skriver inte över dörr 2:s egna avvikelse.
- Äldre sparade fabriksvärden rensas utan att fria sensortexter eller verkliga avvikande kryss raderas.
- Praktiskt iPad/Safari-test återstår.