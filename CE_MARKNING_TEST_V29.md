# CE-märkning TEST 29 – 4.6.4 Med glas

**Riskanalys 4.6.4, Med glas** har nu följande förval:
- **Glas uppfyller krav på personsäkerhet** – valt (4.6.4 Val 1).
- **Glas är laminerat eller härdat** – valt (underval 1).
- **Glas FZ med säkerhetsfilm** – valt (underval 2).
- **Glas ska förses med säkerhetsfilm** – **inte valt** (underval 3 = false).

Övriga risk- och egenkontrollpunkter är oförändrade, liksom profilen Utan glas. Äldre sparade projekt med Med glas migreras en gång vid öppning om deras interna schema är äldre än 5. Migreringen rensar bara underval 3 på glasdörrar samt äldre glasprofil och bevarar andra val och dörrar. Nya sparningar får schema 5; om en tekniker manuellt ändrar den tredje kryssrutan efter migreringen sparas det valet också.

Kodverifiering: förval kontrollerade, äldre projekts korrigering kontrollerad, andra dörrtypens värden orörda och manuella senare ändringar bevarade. Visuellt PDF-test på användarens faktiska mall återstår.
