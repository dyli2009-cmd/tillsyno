# Projektering 2.12 – numrerade grundstenciler och en enda kortserie

Nya projekt börjar med GS1:1, GS2:1 och så vidare till GS100:1 i stencilbiblioteket. Även standardmallarna DGS100, WC, HWC och DBL börjar på :1. Symbolerna DA, DS och DFS behåller sina beteckningar. När GS1:1 placeras på två dörrar delar de samma kort som tidigare. Ändra bara denna dörr skapar GS1:2 för en markerad dörr; nästa egna kort blir GS1:3, utan att ett andra kolon läggs till.

Nytt dörrkort föreslår den första tillgängliga kortbeteckningen i aktuell serie. En befintlig GS1:1-stencil utan sparat kort kan användas direkt. Kopiera dörrkort och en ny kortstencil föreslår nästa lediga beteckning och hoppar över redan reserverade kort/stenciler. Kopiering lägger inte längre till B efter källbeteckningen. Beteckningsfältet är fortsatt redigerbart, och ogiltiga eller upptagna kopienamn ändrar inget kort.

Äldre öppnade och lokalt sparade projekt behåller sina befintliga stenciler, kort, ID:n, produkter och placeringskopplingar. GS1, GS1:1 och äldre GS8-A kan därmed fortsatt vara separata kort i samma äldre projekt. Dataformatet är fortsatt schema 2. Synlighet och tilldelade grupper i det personliga biblioteket hör till exakt beteckning; äldre GS1-val påverkar inte ett separat GS1:1-kort. Nya numrerade mallar följer bibliotekets prefixgrupper om ingen exakt grupptilldelning finns.

När ett nytt projekt skapas kan en äldre personlig standardmall för GS1 ge utseendet till GS1:1. Ett redan sparat explicit GS1:1-utseende har företräde. Återöppning eller senare biblioteksuppdatering lägger inte tillbaka den oanvända gamla GS1-mallen bredvid den numrerade grundmallen. Oförändrade standardstenciler från ett äldre projekt kopieras inte in i det personliga biblioteket som egna mallar.

Den medföljande exempelritningens 50 dörrar använder de numrerade grundmallarna. Sökbar PDF-export, PDF-förhandsvisning, material, arbetstid och originalritning/projektdata fungerar som i 2.11. Den separata Avläsningen är oförändrad och stöder ännu inte kolonbeteckningar.

Nya filer används för HTML/CSS, huvudkod, data, bibliotek och PDF. Materialmodulen 2.11, biblioteksvyn 2.9 samt canvas, sökning och arbetsyta 2.10 återanvänds. Stabil projekteringsadress visar 2.12 och Home/sw visar v2.4.482; auth och service workerns cachelista är oförändrade.

Verifiering: färska standardmallar, första kortet i en befintlig :1-mall, kopior/egna kort utan dubbla kolon, upptagna beteckningar och avbrutna val, privata produktändringar, äldre koders identitet och oberoende biblioteksval. Riktiga PDF- och projektfilsrundresor samt exempelritningen kontrolleras. Webbläsarflöden omfattar dator och emulerad iPad/iPhone, delat GS1:1-kort på två fysiska dörrar, eget :2/:3, kopiera/nytt, återläsning och äldre GS1-projekt. Inga bilder eller skärmbilder skapas.
