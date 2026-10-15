# Tillsyno v2.4.296 – gemensamt utseende och enhetsinställning

## Funktion
- Fyra färgteman: **Isblå**, **Nordisk dimblå** (förval), **Havsbris**, **Sand & blå**.
- Fem enhetsalternativ: **Automatiskt** (förval), **iPhone / telefon**, **iPad / surfplatta**, **Dator**, **TV / stor skärm**.
- Första gången efter godkänd åtkomst visas inställningen på **Tillsynos startsida**. Det valda temat och enhetsläget sparas i `localStorage['tillsyno-ui-appearance-v1']`, endast på den enheten och domänen.
- Utseende kan ändras när som helst med **palettikonen** intill Mitt konto på Hem, eller med den lilla palettknappen i arbetsvyerna.
- Temat gäller över huvudsidorna, kontroll- och projektflöden, CE-märkning, SmartMatch, Ritningsverktyg, konto/admin, login och äldre/licensierade startsidor.
- Enhetsläget reglerar **visuell täthet och klickytor**; faktiska skärmstorleken används fortsatt för responsiva brytpunkter. Ingen artificiell zoom för PDF/ritningar (kritisk för koordinater i SmartMatch).
- Gemensam linjeikonstil i huvudmenyer samt relevanta handlingsknappar/verktygsfält. Ikoner adderas enbart dekorativt, inga action/event handlers ändras.
- Befintliga statusfärger (grönt, orange, rött), låst modulstatus och färger i dokument/PDF har inte skrivits över.
- Offlinecache omfattar `tillsyno-appearance.css` och `tillsyno-appearance.js` både i appens vanliga serviceworker och CE-märkningens serviceworker.

## Tekniskt
- Nya gemensamma resurser `tillsyno-appearance.css` och `tillsyno-appearance.js`; var och en fristående från själva service- och PDF-koden.
- Sidornas HTML har endast laddningsreferenser samt ett kort förinitieringsskript för färgval och startversionen på Tillsyno Hem.
- Ändrad offlinecacheversion för att distribuera nya CSS/JS till redan installerad PWA.
- Fullskärms-inbäddade licensierade appar visar inte dubbla palettknappar.
- Tema/preferenser påverkar inte IndexedDB eller arbetsprojekt. Användaren kan byta färg när som helst utan att ändra ett protokoll.
- Befintliga `project-ce-markning-test.html` (TEST60) och `tillsyno-ui-preview.html` förblir oförändrade.

## Begränsningar/QA
- Ändringarna är visuella; det är **inte** samma sak som att PDF-renderaren testats på fysisk iPhone/iPad/TV. Mobil- och surfplatteval är UI-preferenser ovanpå vanlig responsiv layout.
- Särskilt små eller låsta kontrollpunktsikoner kan behålla sin befintliga design för att skydda arbetsflödet.
- Efter publicering testa: initialt val, byte på en annan sida, återöppning, installation/PWA offline, modal när konto väntar på godkännande och ritningsprecision.
