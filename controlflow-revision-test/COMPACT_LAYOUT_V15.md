# Kompakta valvyer – TEST v15

På användarens korrigering av TEST v13:s alltför breda appvyer återgår valinnehållet till kompakt, centrerad bredd. Vanliga valvyer begränsas till 460 px och Spara PDF / tidigare service / ögat till 400 px, med marginal på smala telefoner. Tillbaka ligger direkt ovanför innehållet inom samma bredd. Kundmallens PDF och anmärkningsöversikten har fortsatt utrymme för dokument och listor.

Områdesknapparna ligger centrerat och är högst 340 px breda. Hem och Ritningsverktyg är 42 px ikonknappar, centrerade tillsammans med Fortsätt. Överflödiga hjälp-/rubrikrader i områdesväljaren och sidhuvudets undertitel döljs. Projektnamnet visas centrerat utan upprepade vybenämningar. Den långa texten efter lyckad PDF-export och det upprepade meddelandet ovanför valet Ny service/Fortsätt är borttagna. Felmeddelanden behålls.

Checklistans tabell med – / ✓ / ×, egna kontrollpunkter direkt under listan, inga native bekräftelse-popup och Ångra från TEST v14 kvarstår. Data, import, filnamn och PDF-innehåll påverkas inte. Föregående TEST v14 finns arkiverad; ordinarie Kontrollflöde och iOS berörs inte.

Verifierat i Chromium 320/390/768/1200 px: centrerad begränsad bredd, 42 px ikoner, närliggande Tillbaka, sparvy, tidigare service/fortsätt, projektnamn i samtliga vyer och borttagen framgångstext. Full serviceöversiktsregression med kundmall/export, filåteröppning, länkar och offline passerar. Historiska runtime-hashar och grundkopians isoleringskontroll passerar.

Test: tests/controlflow-compact-v15.cjs.
