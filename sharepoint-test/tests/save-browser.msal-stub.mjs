// Browser integration fixture only. No Microsoft authentication or real tokens.
export class InteractionRequiredAuthError extends Error {}

const state = () => window.__saveBrowser.msal;
// Only synthetic state is persisted. A real page reload must model MSAL's
// account cache so the production source-binding restoration is exercised.
const cacheKey='sharepoint-browser-fixture-account';
const consentKey='sharepoint-browser-fixture-write-consent';
const accountsKey='sharepoint-browser-fixture-accounts';
const activeKey='sharepoint-browser-fixture-active';
const cacheAccounts=(accounts,active)=>{
  state().accounts=accounts;state().active=active;state().cached=accounts.length>0;
  sessionStorage.setItem(cacheKey,accounts.length?'1':'0');
  sessionStorage.setItem(accountsKey,JSON.stringify(accounts));
  sessionStorage.setItem(activeKey,JSON.stringify(active));
};
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
  constructor(config) { state().constructorConfig=config;state().cacheAccountsForReload=cacheAccounts; }
  async initialize() {
    record('initialize');
    state().cached=state().cached||sessionStorage.getItem(cacheKey)==='1';
    state().accounts=state().accounts||JSON.parse(sessionStorage.getItem(accountsKey)||'null');
    state().active=state().active||JSON.parse(sessionStorage.getItem(activeKey)||'null');
    if(sessionStorage.getItem(consentKey)==='1')state().requireWritePopup=false;
  }
  getAllAccounts() { return state().cached ? state().accounts||[account()] : []; }
  getActiveAccount() { return state().active || null; }
  setActiveAccount(value) {
    const accounts=state().accounts||[];
    cacheAccounts(value?[...accounts.filter(item=>item.homeAccountId!==value.homeAccountId),value]:accounts,value);
  }
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
    sessionStorage.setItem(consentKey,'1');
    return response(request);
  }
  async clearCache() {
    record('clearCache');state().active=null;state().cached=false;
    sessionStorage.removeItem(cacheKey);sessionStorage.removeItem(consentKey);
    sessionStorage.removeItem(accountsKey);sessionStorage.removeItem(activeKey);state().accounts=[];
  }
}
