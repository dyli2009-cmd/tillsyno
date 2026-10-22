# Projektering 2.15.2 – DBL / WC högst upp

- Dörrkort har gruppen **DBL / WC** högst upp med DBL, HWC och WC samlade. **GS1–GS100** är en separat grupp. DA-symbolerna ligger under **Övrigt**.
- WC/HWC visas som fullständiga textbeteckningar med löpnummer, exempelvis `WC:1` och `HWC:1`. Toalett- och rullstolsikonerna har tagits bort i menyn, på ritningen och i PDF-exporten.
- WC/HWC har rundare gula standardstämplar: 52 × 34 pt för de korta beteckningarna. Längre nummer får mer textutrymme. Texten i SVG och PDF förblir skarp och sökbar.
- DGS100 ingår inte längre i nya projekts standardutbud. Äldre DGS/DGS100 döljs i stencilväljaren, medan redan använda dörrkort och placeringar bevaras.
- Tidigare DBL-, WC- och HWC-grupper samlas i DBL / WC, inklusive sparade gruppkopplingar. Äldre WC/HWC-grupper fungerar också.
- Gamla standardstämplar på 68 × 34 pt får den smalare formen. Egna färger och storlekar bevaras, liksom kortinnehåll, numrering, placeringar och originalritning.
- Ingångarna för 2.14, 2.15 och den fasta projekteringsadressen använder nu samma aktuella moduler. Förbättringen för skärpa vid zoom behålls.

## Verifiering

Kör:

```sh
node tests/smartmatch-projektering-v2-15-text-cards.cjs
node tests/smartmatch-projektering-v2-14-sharpness.cjs
```

Testerna kontrollerar gruppindelning, standardutbud, migration av sparade data, sökbar WC/HWC-text i exporterad PDF och återöppning med komplett original och kortdata. Renderartestet kontrollerar SVG-text och faktiska PDF-pixlar vid 1600 % zoom, panorering, rotation och skärmtäthet 2×/3×.

Fullständig webbläsar- och Safari-testning har inte körts i denna miljö.
