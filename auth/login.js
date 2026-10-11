(() => {
  'use strict';
  const message = document.getElementById('message');
  const form = document.getElementById('login');
  const config = window.TILLSYNO_AUTH_CONFIG;
  if (!window.supabase || !config) {
    message.textContent = 'Inloggningen kunde inte laddas. Kontrollera internetanslutningen och ladda om sidan.';
    form.hidden = true;
    return;
  }
  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  async function checkMember() {
    const userResult = await client.auth.getUser();
    if (userResult.error || !userResult.data.user) {
      throw new Error('Din session kunde inte verifieras.');
    }
    const result = await client.from('tillsyno_access')
      .select('access_role')
      .eq('user_id', userResult.data.user.id)
      .maybeSingle();
    if (result.error) throw new Error('Kunde inte kontrollera din behörighet.');
    if (!result.data || !['admin', 'member'].includes(result.data.access_role)) {
      throw new Error('Kontot saknar behörighet till Tillsyno.');
    }
    return result.data.access_role;
  }
  async function showAuthorized() {
    const role = await checkMember();
    form.hidden = true;
    message.textContent = role === 'admin'
      ? 'Inloggning godkänd. Du har administratörsbehörighet.'
      : 'Inloggning godkänd. Du har användarbehörighet.';
    const note = document.createElement('p');
    note.textContent = 'Det här är ett separat inloggningstest. Resten av webbappen är ännu inte låst.';
    message.after(note);
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    message.textContent = 'Kontrollerar inloggning…';
    try {
      const fields = new FormData(form);
      const { error } = await client.auth.signInWithPassword({
        email: String(fields.get('email') || '').trim(),
        password: String(fields.get('password') || '')
      });
      if (error) throw new Error('Fel e-postadress eller lösenord.');
      await showAuthorized();
    } catch (error) {
      await client.auth.signOut({ scope: 'local' });
      message.textContent = error.message || 'Det gick inte att logga in.';
    } finally {
      button.disabled = false;
    }
  });
  client.auth.getUser().then(({data}) => {
    if (data.user) return showAuthorized().catch(async () => {
      await client.auth.signOut({ scope: 'local' });
    });
  });
})();