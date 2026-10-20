# Microsoft Entra – returadress för SharePoint-piloten

Datum: 2026-10-20.

## Vald returadress

Plattform: **Ensidesprogram / Single-page application (SPA)**.

```text
https://dyli2009-cmd.github.io/tillsyno/sharepoint-test/auth-callback.html
```

GitHub-repots metadata anger `https://dyli2009-cmd.github.io/tillsyno/` som webbappens hemsida och `has_pages: true`. Under den adressen väljs den separata sökvägen `sharepoint-test/auth-callback.html` för pilotens Microsoft-inloggning.

Detta är en **fastställd, planerad callback-adress**, inte en verifierad publicerad inloggningssida. Callback-filen, Microsoft-inloggningen och kopplingen till Avläsning är ännu inte implementerade eller publicerade. Denna ändring dokumenterar endast adressvalet på testgrenen; `main` och den fungerande appen ändras inte.

## Registrering

I appregistreringen **Tillsyno SharePoint Test**, under Autentisering, lägg till adressen ovan som **SPA**. Behåll registreringen begränsad till den egna testorganisationen. Använd inte SharePoint-mappens adress som returadress.

Den senare MSAL-konfigurationen måste använda exakt samma adress. Skapa ingen klienthemlighet för webbläsarappen. Aktivera inte implicit tokenflöde för denna pilot; den planerade lösningen använder authorization code med PKCE.

## Före första riktiga inloggningstestet

- Bygg och publicera den särskilda callbacksidan och pilotens inloggningskod på avsedd adress utan att ändra befintliga modulers beteende.
- Kontrollera att callbacksidan använder rätt hantering för den valda MSAL-versionen och inte omdirigeras av Tillsynos vanliga inloggningssida.
- Verifiera program-ID och katalog-ID, konfigurera endast nödvändiga Graph-behörigheter och kontrollera faktisk registrerad SPA-adress i Entra.
- Testa Microsoft-inloggning och åtkomst till en testfil. Registrerad returadress betyder inte att SharePoint-kopplingen redan fungerar.

## Referenser

- https://learn.microsoft.com/entra/identity-platform/how-to-add-redirect-uri
- https://learn.microsoft.com/entra/identity-platform/reply-url
