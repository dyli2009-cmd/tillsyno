# Tillsyno v2.4.320 – temafärg även före sidan laddats

Användaren rapporterade blått före vald ljus färg vid Hem/Tillbaka och Kontrollflöde → Dörrautomatik/Lås → revision → Fortsätt till ritningen.

Orsak: övergångens inline-CSS gav html och laddningsgardinen fast #132b38. Den sparade paletten lästes sent i head, efter externa beroenden. Bakgrunden blir nu rätt genom en tidig läsning först i head och en temavariabel på övergångsgardinen. Vid temabyte uppdateras också den tidiga dokumentbakgrunden, så efterföljande sidbyten använder samma färg. Ingen ändring av väntan på behörighetskontroll, länknavigation, projektdata, PDF eller sidlayout.

Verifiering: blå bakgrund återskapad från v319 med fördröjd temaladdning. Alla sju paletter kontrolleras vid första renderingsramarna, synlig laddningsgardin, Hem och historik/Tillbaka samt verkligt protokollval och Fortsätt till ritningen. Samma tidiga bootstrap och utseenderuntime speglas i native-källan. TestFlight-build inte publicerad här.
