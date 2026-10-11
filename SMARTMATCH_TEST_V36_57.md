# SmartMatch TEST v36.57 – skarp ritningstext och flyttbara datorrutor

2026-10-11. Filnamnsfältet i v36.56 publicerat och kvar i denna version.

Mobil: den fasta ritningsrastern från v36.55 behålls. Ett SVG-textlager återanvänder PDF-text, textposition, rotationsvinkel och textbredd; PDF.js registrerade font används när tillgänglig, annars PDF-textens fontfamilj. Mörk visningstext kan avvika från originalets textfärg/font om fonten inte är tillgänglig. Originalbilden och exporten förändras inte. Endast synliga etiketter med marginal visas, högst 2500, senaste sida cachelagras och inaktuella asynkrona svar ignoreras. Panorering uppdaterar etiketter efter 150 ms. Ingen ny PDF-bildrendering vid zoom. Detta skärper endast riktig PDF-text; skannade bilder och vektorgeometri blir inte skarpare. Fysisk Safari-test krävs för faktisk läsbarhet och stabilitet.

Dator: Positioner börjar stängd och öppnas med Positioner-knappen som en fristående ruta ovanpå ritningen, utan sidokolumn. Dra i rubriken för att flytta. Koppla dörrautomatik kan också dras i rubriken. Befintliga kontroller/listeners bevaras; drag från knappar/input ignoreras, pointercancel hanteras och rutans position begränsas till synligt fönster. Telefonens Positioner-layout lämnas kvar.

Verifierat JS-syntax, versionsreferenser och identiska fasta/versionerade HTML. Mocktest av faktiska funktioner: känd GS-text och koordinater, 2x textstorlek/bredd utan PDF-rasterrendering, cacheåteranvändning, offscreen/inaktuella texter uteslutna och fönstergränser för panelplacering. Riktigt musdrag, touch och Safari-rendering ej testade i webbläsare; Chromium saknas i miljön. Endast SmartMatch TEST och dokumentation; tidigare versioner bevarade.
