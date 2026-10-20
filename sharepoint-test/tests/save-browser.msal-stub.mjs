// Browser integration fixture only. No Microsoft authentication or real tokens.
export class InteractionRequiredAuthError extends Error {}

const state = () => window.__saveBrowser.msal;
const record = (method, request = {}) => state().calls.push({method, scopes: request.scopes || [], prompt: request.prompt || ''});
const account = () => ({
  username: 'browser-test@example.invalid',
  tenantId: window.__saveBrowser.tenantId,
  homeAccountId: 'browser-test.' + window.__saveBrowser.tenantId,
  localAccountId: 'browser-test',
});
const response = request => {
  const write = request.scopes?.some(scope => /Write/i.test(scope));
  const value = account();
  if (state().wrongTenant) value.tenantId = '00000000-0000-0000-0000-000000000000';
  if (write && state().changedWriteAccount) value.homeAccountId = 'different-test-user';
  return {account: value, accessToken: write ? 'stub-write-token' : 'stub-read-token', scopes: request.scopes || []};
};

export class PublicClientApplication {
  constructor(config) { state().constructorConfig = config; }
  async initialize() { record('initialize'); }
  getAllAccounts() { return state().cached ? [account()] : []; }
  getActiveAccount() { return state().active || null; }
  setActiveAccount(value) { state().active = value; }
  async loginPopup(request) { record('loginPopup', request); return response(request); }
  async acquireTokenSilent(request) {
    record('acquireTokenSilent', request);
    if (state().requireWritePopup && request.scopes?.some(scope => /Write/i.test(scope))) {
      throw new InteractionRequiredAuthError('Explicit write consent is required in this fixture.');
    }
    return response(request);
  }
  async acquireTokenPopup(request) {
    record('acquireTokenPopup', request);
    if (state().denyConsent) {
      const error = new Error('Fixture: write consent was denied.');
      error.errorCode = 'access_denied';
      throw error;
    }
    state().requireWritePopup = false;
    return response(request);
  }
  async clearCache() { record('clearCache'); state().active = null; state().cached = false; }
}
