# Avläsning TEST 9.34

Datorns ritningsvy startar detaljrendering efter 70 ms stillhet (tidigare 300 ms). Färdiga detaljpixlar behålls på sina PDF-koordinater under förflyttning och ersätts först när nästa detaljbild är färdig. Vid zoom skalas den befintliga detaljbildens placering tillsammans med ritningen. Samma sidas översiktsbild återanvänds vid zoom; den synliga detaljytan ger slutlig upplösning. Sidbyte, dokumentbyte och uttrycklig paus rensar gammal detaljbild.

Mobilens tidsgränser och pixelbudgetar behålls. Avläsningslogik och cellvis OCR från 9.33 ändras inte.

Verifiering: webbläsartest på dator kontrollerar att färdig detaljbild behålls, att zoom inte startar en ny helsiderendering och att ny detaljbild slutförs. Projektflöde och PDF-export/återöppning testas på dator och emulerad iPad/iPhone. Offline-cache verifieras. Ingen total tidsvinst i sekunder utlovas för kundens PDF; kostnaden beror på PDF-innehåll och dator.
