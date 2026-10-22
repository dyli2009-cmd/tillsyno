# Projektering 2.1

Fast adress: `smartmatch-projektering.html`. Versionsarkiv: `smartmatch-projektering-v2-1.html`.

Samma verktyg och projektformat som [Projektering 2](PROJEKTERING_V2.md). Underrevisionen gör helskärmsknappen kompatibel med standard- och WebKit-API:er. Webbläsare utan helskärmsstöd visar ett besked och fortsätter använda den vanliga ritningsvyn utan runtime-fel. Nekad helskärm fångas också upp. Föregående versionsmärkta filer är oförändrade.

Hela browserflödet återanvänds mot den nya entry-sidan. Ett extra verkligt Chromium-prov simulerar att helskärms-API:erna saknas och kontrollerar knapp, besked och fortsatt sidnavigation.
