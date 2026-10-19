# Avläsning TEST 9.40

GS-material och tidsvyn har en centrerad lista, max 760 px på dator. Produkt, antal, minuter/st, kategori och Spara rad ligger nära varandra. Telefoner använder två kompakta rader. Alla kategorier och produkter visas utan hopfällning.

Grupper: Armbågskontakt, Låshus, Magnetkontakt, Behör, Beslag, Slutbleck, Dörrstängare, Dörrautomatik, Dörr-/porthållare, Trycke/handtag, Cylinder, Magneter och Övrigt. Kategoriförslag bygger på komponentetiketten, inklusive en saknad/felaktig bokstav när förslaget är entydigt. Produktmodell eller siffror rättas aldrig genom denna heuristik. Kategori kan väljas manuellt per produkt och sparas med projektet. Samma korrigerade produktnamn slås fortsatt ihop.

Tid anges direkt i minuter/st, även decimaler (7,5). Spara grupp validerar samtliga ändringar före tillämpning och avvisar motstridiga tider/kategorier vid sammanslagning. Spara rad ändrar endast den valda raden. Osparade ändringar i andra grupper bevaras vid uppdatering av listan och sparas inte av misstag. Sparade ändringar bekräftas i listan. Projekttider och kategorier följer med PDF.

Verifierat: kategori med saknad bokstav, gruppering utan ändrat produktnummer, centrering och telefonbredd, gruppvis sammanslagning med decimalminuter, konflikt utan delvis sparande, bevarade utkast i andra grupper, manuellt kategoribyte, återöppnad projekt-PDF, befintlig materialrättning/borttagning och offlinecache.
