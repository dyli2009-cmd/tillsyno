# Ögat – TEST v11

Ögat räknar distinkta aktiva checklistetyper bland ritningens objekt (alla ritningssidor). Noll eller en typ växlar direkt mellan synliga och dolda markeringar utan dialog. Flera dörrar med samma typ räknas som en typ. Vid flera typer visas en mindre valruta med direkt verkande val per checklista samt Visa alla/Dölj alla. Endast placerade aktiva typer visas.

Visningen påverkar inte projektdata, importer, kundmall eller export. Serviceöversikten följer befintlig global döljning. Föregående TEST v10 ligger i v10/all-in-one.html med oförändrade runtime-filer.

Verifierat i Chromium med telefonbredd: flera dörrar av samma typ, återställning från selektivt dold typ, två typer, selektiv döljning, växling från globalt dold till en synlig typ, Visa alla, tom ritning och oförändrad projektdata. Grundkopians isoleringskontroll samt historiska runtime-hashar v2–v10 passerar.
