/* Compact protocol presentation. Reuses live controls; does not change protocol data. */
(() => {
  'use strict';

  function start() {
    const root = document.documentElement, body = document.body;
    if (root.dataset.controlflowUi !== '1' || !body.classList.contains('allInOneApp')) return;
    if (window.ControlflowProtocol549 || typeof buildChecklist !== 'function') return;
    const byId = id => document.getElementById(id);
    const form = byId('secForm'), box = byId('secChecklist');
    const meta = form?.querySelector('.protocolMetaPanel');
    const progress = byId('secProgress'), approve = byId('secApproveAll');
    const edit = byId('secEditChecks'), add = byId('secAddCheck'), remove = byId('secDelete');
    const close = byId('secCloseProtocol');
    if (!form || !box || !meta || !progress || !approve || !edit || !add || !remove || !close) return;

    const supported = new Set(['automation', 'automation_selfcheck', 'lock_revision', 'alarm', 'detector', 'lock', 'access']);
    const current = () => typeof cur === 'function' ? cur() : null;
    const eligible = o => !!o && supported.has(o.type);
    const editing = o => !!o && typeof securityCheckEditUid !== 'undefined' && securityCheckEditUid === o.uid;
    const original = new Map();
    const menuButtons = [add, edit, byId('detectorMove'), byId('detectorSize'), remove].filter(Boolean);
    for (const node of [progress, approve, close, ...menuButtons]) {
      const anchor = document.createComment('protocol549:' + node.id);
      node.before(anchor);
      original.set(node, {anchor, role: node.getAttribute('role'), tabindex: node.getAttribute('tabindex'), label: node.getAttribute('aria-label')});
    }
    const labels = new Map();
    for (const [id, text] of [['secAutomationModel', 'Modell'], ['secAutomationSerial', 'Löpnummer'], ['secLocation', 'Placering'], ['secStatus', 'Bedömning']]) {
      const node = Array.from(byId(id)?.closest('label')?.childNodes || []).find(n => n.nodeType === 3 && n.textContent.trim());
      if (node) labels.set(node, {original: node.textContent, compact: text});
    }

    const shell = document.createElement('div');
    shell.className = 'cfProtocolMetaShell';
    meta.before(shell); shell.append(meta);
    const top = document.createElement('div');
    top.id = 'cfProtocolTopActions'; top.hidden = true;
    const editDock = document.createElement('span'); editDock.className = 'cfProtocolEditDock';
    const launcher = document.createElement('button');
    launcher.id = 'cfProtocolTools'; launcher.type = 'button'; launcher.textContent = 'Verktyg';
    launcher.title = 'Protokollverktyg';
    launcher.setAttribute('aria-label', 'Protokollverktyg');
    launcher.setAttribute('aria-haspopup', 'menu');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'cfProtocolToolsMenu');
    top.append(launcher); shell.append(top);
    const menu = document.createElement('div');
    menu.id = 'cfProtocolToolsMenu'; menu.hidden = true;
    menu.setAttribute('role', 'menu'); menu.setAttribute('aria-labelledby', launcher.id);
    body.append(menu);

    // The header stays outside replaceChildren() in buildChecklist. Its original controls
    // remain addressable by ID, including while the core rebuilds or updates the count.
    const header = document.createElement('div');
    header.id = 'cfProtocolCheckHeader'; header.hidden = true;
    const toggle = document.createElement('button');
    toggle.id = 'cfProtocolCheckToggle'; toggle.type = 'button'; toggle.textContent = 'Kontrollpunkter';
    toggle.setAttribute('aria-controls', 'cfProtocolCheckGroup');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.title = 'Visa eller dölj kontrollpunkterna';
    const resultActions = document.createElement('div'); resultActions.className = 'cfProtocolCheckActions';
    resultActions.append(editDock); header.append(toggle, resultActions); box.before(header);
    const name = document.createElement('span'); name.id = 'cfProtocolName'; name.hidden = true;
    const typeInput = byId('secType'); typeInput?.after(name);
    let active = false, group = null, groupListener = null, groupUid = null;

    function restoreAttribute(node, key, value) {
      if (value === null) node.removeAttribute(key); else node.setAttribute(key, value);
    }
    function restore(node) {
      const saved = original.get(node);
      if (!saved?.anchor.parentNode) return;
      saved.anchor.after(node);
      restoreAttribute(node, 'role', saved.role);
      restoreAttribute(node, 'tabindex', saved.tabindex);
      restoreAttribute(node, 'aria-label', saved.label);
    }
    function put(parent, node) { if (node.parentNode !== parent) parent.append(node); }
    function compactProgress(o) {
      if (!eligible(o) || typeof allChecks !== 'function') return;
      const checks = allChecks(o), done = checks.filter(([id]) => ['na', 'ok', 'remark'].includes(o.checks[id]?.result)).length;
      const text = done + ' / ' + checks.length;
      if (progress.textContent !== text) progress.textContent = text;
      progress.setAttribute('aria-label', done + ' av ' + checks.length + ' kontrollpunkter kontrollerade');
    }
    function fillIcon() {
      if (launcher.querySelector('svg')) return;
      const source = body.querySelector('.serviceToolLauncher svg');
      if (!source) return; // Accessible text remains if the existing icon is not ready.
      const icon = source.cloneNode(true);
      icon.removeAttribute('id');
      for (const node of icon.querySelectorAll('[id]')) node.removeAttribute('id');
      icon.setAttribute('aria-hidden', 'true'); icon.setAttribute('focusable', 'false');
      launcher.replaceChildren(icon);
    }
    function closeMenu(focus) {
      menu.hidden = true; launcher.setAttribute('aria-expanded', 'false');
      if (focus && active && !form.hidden) launcher.focus({preventScroll: true});
    }
    function positionMenu() {
      if (menu.hidden) return;
      const r = launcher.getBoundingClientRect(), width = Math.min(300, Math.max(144, innerWidth - 16));
      const height = Math.min(menu.scrollHeight || 240, Math.max(80, innerHeight - 16));
      const below = innerHeight - r.bottom - 16;
      const topEdge = below >= height ? r.bottom + 6 : Math.max(8, r.top - height - 6);
      Object.assign(menu.style, {left: Math.max(8, Math.min(r.right - width, innerWidth - width - 8)) + 'px', top: topEdge + 'px', width: width + 'px', maxHeight: Math.max(80, innerHeight - topEdge - 8) + 'px'});
    }
    function available() { return menuButtons.filter(n => n.parentNode === menu && !n.hidden && !n.disabled); }
    function openMenu(last = false) {
      if (!active || form.hidden) return;
      menu.hidden = false; launcher.setAttribute('aria-expanded', 'true'); positionMenu();
      const list = available(); (last ? list[list.length - 1] : list[0])?.focus({preventScroll: true});
    }
    function syncGroup(o) {
      const next = box.querySelector('.secCheckGroup');
      if (next !== group) {
        const keepOpen = groupUid === o.uid && group ? group.open : undefined;
        if (group && groupListener) group.removeEventListener('toggle', groupListener);
        group = next;
        if (group) {
          if (keepOpen !== undefined) group.open = keepOpen;
          group.id = 'cfProtocolCheckGroup';
          groupListener = () => toggle.setAttribute('aria-expanded', String(group.open));
          group.addEventListener('toggle', groupListener);
        }
      }
      groupUid = o.uid;
      if (group) toggle.setAttribute('aria-expanded', String(group.open));
      toggle.disabled = !group;
    }
    function sync(o = current()) {
      const enabled = eligible(o);
      if (!enabled) {
        closeMenu(false);
        if (active) {
          for (const node of original.keys()) restore(node);
          for (const [node, values] of labels) node.textContent = values.original;
          progress.removeAttribute('aria-live'); progress.removeAttribute('aria-label');
          if (typeof updateProgress === 'function' && o) updateProgress(o);
        }
        active = false; groupUid = null; body.removeAttribute('data-cf-protocol-compact');
        header.hidden = top.hidden = name.hidden = true;
        typeInput?.classList.remove('cfProtocolReadOnly');
        return;
      }
      active = true; body.setAttribute('data-cf-protocol-compact', '1');
      header.hidden = top.hidden = false;
      for (const [node, values] of labels) node.textContent = values.compact;
      put(resultActions, progress); put(resultActions, approve); put(top, close);
      progress.setAttribute('aria-live', 'polite');
      for (const node of menuButtons) {
        if (node === edit && editing(o)) {
          put(editDock, node); node.textContent = 'Klart';
          node.removeAttribute('role'); node.removeAttribute('tabindex');
          node.setAttribute('aria-label', 'Avsluta redigering av kontrollpunkter');
        } else {
          put(menu, node); node.setAttribute('role', 'menuitem'); node.setAttribute('tabindex', '-1');
          if (node === edit) { node.textContent = 'Redigera kontrollpunkter'; restoreAttribute(node, 'aria-label', original.get(node).label); }
        }
      }
      if (typeInput) {
        const readOnly = typeInput.readOnly;
        typeInput.classList.toggle('cfProtocolReadOnly', readOnly);
        name.hidden = !readOnly;
        if (readOnly) name.textContent = typeInput.value;
      }
      top.classList.toggle('cfProtocolEditing', editing(o));
      compactProgress(o); syncGroup(o); fillIcon();
      if (body.dataset.view !== 'protocol' || form.hidden) closeMenu(false);
    }

    toggle.addEventListener('click', () => {
      if (!group) return; group.open = !group.open;
      toggle.setAttribute('aria-expanded', String(group.open));
    });
    launcher.addEventListener('click', () => menu.hidden ? openMenu() : closeMenu(true));
    launcher.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openMenu(e.key === 'ArrowUp'); }
      else if (e.key === 'Escape') closeMenu(true);
    });
    menu.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true); return; }
      if (e.key === 'Tab') { closeMenu(true); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault(); const list = available(); if (!list.length) return;
      const at = list.indexOf(document.activeElement);
      const index = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (at + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
      list[index].focus({preventScroll: true});
    });
    menu.addEventListener('click', e => { if (e.target.closest('button')) closeMenu(false); });
    edit.addEventListener('click', () => {
      sync();
      if (active) (editing(current()) ? edit : launcher).focus({preventScroll: true});
    });
    document.addEventListener('pointerdown', e => {
      if (!menu.hidden && !menu.contains(e.target) && !launcher.contains(e.target)) closeMenu(false);
    });
    document.addEventListener('focusin', e => {
      if (!menu.hidden && !menu.contains(e.target) && !launcher.contains(e.target)) closeMenu(false);
    });
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    new MutationObserver(() => { if (body.dataset.view !== 'protocol' || form.hidden) closeMenu(false); }).observe(body, {attributes: true, attributeFilter: ['data-view']});

    const buildBefore = buildChecklist;
    buildChecklist = function (...args) { const result = buildBefore.apply(this, args); sync(args[0]); return result; };
    const progressBefore = updateProgress;
    updateProgress = function (...args) { const result = progressBefore.apply(this, args); compactProgress(args[0]); return result; };
    const selectedBefore = showSelected;
    showSelected = function (...args) { const result = selectedBefore.apply(this, args); sync(); return result; };
    window.ControlflowProtocol549 = {refresh: () => sync()};
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
