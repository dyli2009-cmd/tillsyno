# CE TEST 46 – Ta bort bild och Ångra för CE-skylt

- Under CE-skylt finns en tydlig knapp **Ta bort bild** när vald dörrautomatiks CE-foto finns.
- Tar bara bort det aktuella fotot från den dörrens projektdata; rör inte andra dörrar, ritningar eller originalbilden i iPadens bilder.
- Knappen blir **Ångra borttagning**, som återställer fotot och dess tidigare gransknings-/slutförandestatus under pågående session.
- Ångra-bufferten är enbart i webbsidans arbetsminne: sparas inte i den redigerbara projekt-PDF:en, och försvinner vid sidomladdning eller en annan redigering. Då måste bilden väljas/tas på nytt.
- Direkt efter borttagning/återställning uppdateras bytes per CE-mapp och totalsumman för aktuell dörr genom befintlig asynkron mätning.
- Finns en gemensam CE-skyltmall visas dess filstorlek efter att fotot tagits bort. Annars står CE-skylt som **saknas**, och den dörren kan inte slutföras och exporteras innan en CE-skylt finns igen.
- Radering av bild gör dörren Pågår tills CE-skylt/återställning godkänns. Omedelbart Ångra återställer tidigare status.
- Ingen förändring i övriga CE-PDF:er, kryss, underskrifter, ZIP-algoritm eller andra Tillsyno-flöden.

Kodsyntax och filkopplingar verifieras. iPad-test med användarens projekt återstår.
