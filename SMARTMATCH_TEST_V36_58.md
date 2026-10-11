# SmartMatch TEST v36.58 – skarpa identifierade stämpeletiketter

2026-10-11. Användaren förtydligar att GS14/DA/DS/automatikbeteckningar och kopplingar måste vara läsbara, inte enbart vanlig ritningstext.

Mobilens textlager kompletteras med SVG-etiketter från identifierade GS-/projektstämplar, aktuella positioner och dörrautomatiker. Sparad label/code/sourceText används utan OCR/gissning; automatik faller tillbaka till objekt-ID/visnings-ID när sourceText saknas. Etikett och vit bakgrund placeras inom sparad PDF-rektangel; bara beteckningsradens höjd täcks. Ursprunglig PDF ändras inte. Dubbletter med samma etikett och rektangel undertrycks; endast aktuell sida/synlig yta och högst 1500 etiketter visas. Vid översiktszoom under 100 procent visas inte de extra etikettplattorna. PDF.js gör ingen extra rasterrendering för dem.

Appens ramar, markörer och GS-kopplingspilar är redan HTML/SVG och kvar. Grafiska symboler/okända skannade stämplar som inte identifierats i projektet blir inte automatiskt rekonstruerade; originalbilden förblir pixelbegränsad. Etikettplattorna ändrar visningens utseende och kan täcka detaljer inom den sparade rektangelns beteckningsrad. Fysisk Safari/läsbarhetskontroll krävs.

Verifierat JS-syntax. Mocktest av faktisk etikettfunktion: GS14/DS/DA/exakt automatik-ID, dubbel GS undertryckt, koordinater skalas, fel sida/offscreen uteslutet och fitvy under 100 procent oförändrad. v36.57 bevarad. Endast SmartMatch TEST och dokumentation.
