# CE TEST 40 – professionella benämningar, kompakta ikoner och direkt PDF-förhandsvisning

## Benämningar
- Dörrar och dörrautomatik, + Ny dörr, Löpnummer, Automatik-ID.
- Ansvarigs underskrift.
- Exportera CE-underlag.
- Dokumentåtgärder: Mall, Visa PDF, Gemensamt, Endast denna, Granska/Granskad, Fler alternativ.
- Dokumentstatus: Granskad, Påbörjad, Ej granskad. Mappavvikelse: Anpassad.
- Slutför dörr / Återöppna dörr, Markera 5 som granskade.
- Fler alternativ: Spara PDF, Dela dokument, Återställ denna dörr.
- Dokumentnamnen, PDF-originalmallarna och formfältens tekniska namn bibehålls.

## Design och ikoner
- Enhetliga tunna SVG-linjeikoner för mall, visa, gemensamt (personer), ändring endast denna (penna), granskning (checklista), kopiera, redigera, ta bort, nedladdning och delning.
- Sex dokumentåtgärder hålls på en rad på mobil och iPad genom adaptiv CSS-grid. Minsta tryckyta 44–48 px trots små ikoner och etiketter.
- Granskad markeras diskret grönt. Borttagning förblir en separat, bekräftad åtgärd.

## Visa PDF
- Popup öppnas omedelbart vid val av Visa PDF för vald dörr och dokumenttyp.
- Initialt meddelande "Förbereder PDF…" visas innan compose startar; laddning visar "Visar n av N sidor…".
- Visa all genererad ifyllnad och alla PDF-sidor i popup med zoom på iPad, iPhone och dator.
- Fel visas inne i popupen i stället för att knappen verkar inaktiv. Spara fil använder vald dörr och dokument.
- CE-skylt i bildformat kan förhandsgranskas genom samma vy.

## Tester
- Kontroll av JavaScript-syntax, versionslänkar och cache.
- PDF-preview öppnas före compose enligt funktionens exekveringsordning. Flera sidor renderas enligt numPages, och vald dörr behålls.
- 9 olika SVG-ikoner skapades med olika paths i exekverat test.
- Mobil/iPad-grid och tryckytor granskade i CSS. Fysiskt iPad-test och visuell original-PDF-verifiering återstår.
