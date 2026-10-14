# CE-märkning TEST 28 – återställ fungerande förvalda kryss

**Felorsak:** Val av Med glas/Utan glas ändrade tidigare i huvudsak bara profilkopplingen. Redigeringsläget kunde dessutom öppnas som Ändra standard, vilket gav ett annat urval än den valda dörrens faktiska förval. Tidigare sparade profiler kunde därmed dölja de korrekta standardkryssen.

**Åtgärd:** Vid val av Med glas eller Utan glas rensas föregående kryss-/radiovärden och alla förvalda värden från den godkända respektive fabriksmallen läggs uttryckligen i den aktuella dörrens egna fält för Riskanalys och Egenkontroll. Ej valda alternativa checkboxvärden får false eller tomt värde så gamla sparade standardprofiler inte tränger igenom. Ändra standard används bara när användaren uttryckligen väljer det; vid vanlig dörröppning och avslutad redigering används dörrens eget läge.

Ingen profil tömmer kryssvalen. Sensortext, mätvärden, annan fritext och signaturer bevaras. Inga ändringar av hur rena kryss ritas/exporteras i TEST 27.

**Kodtester:** Med glas kontrollerat mot bl.a. 4.6.4/10.5.11/10.5.13, Utan glas kontrollerat mot motsvarande alternativ, gamla underliggande val inaktiverade, Ingen profil tar bort valen och fritext bevaras. Praktiskt test på iPad och originalmall behövs för visuell verifiering.