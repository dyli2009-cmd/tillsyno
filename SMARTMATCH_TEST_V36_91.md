# SmartMatch TEST v36.91 – rätt automatikmodul laddas

v36.89 och v36.90 publicerade nya DA-moduler men deras HTML laddade fortfarande smartmatch-da-v36-85-module.js. De isolerade testerna körde den nya modulen och verifierade därför inte kodvägen i publicerad HTML. Detta förklarar att rättningarna inte kom användaren till del; det bevisar inte alla orsaker till uteblivna träffar i den aktiva sessionen.

v36.91 laddar den testade smartmatch-da-v36-90-module.js från både versionssidan och den identiska fasta TEST-adressen. Ingen sök-/tabellprincip ändrad. Tidigare versioner bevaras. Kontrollflöde och native iOS/TestFlight orörda.

Verifierat: entry-resurs-test kontrollerar den faktiska scriptreferensen och identiska HTML-filer. DA-modulens befintliga helkedjetest med Snidaren-PDF ger 17 märkningar och 17 giltiga GS-pilar i kontrollerad DOM/bridge. Användarens aktiva webbläsare har inte styrts.
