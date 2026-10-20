import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';
// No Tillsyno guard, routing, hash manipulation or COOP header on this bridge.
broadcastResponseToMainFrame().catch(()=>{
  document.getElementById('status').textContent='Inloggningssvaret kunde inte skickas tillbaka. Stäng detta fönster och försök från testsidan igen.';
});
