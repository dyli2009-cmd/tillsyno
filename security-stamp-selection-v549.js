/* Shared Controlflow stamp selection. Position locks reuse saved object data. */
(function (root) {
  'use strict';

  const TYPES = new Set(['detector', 'alarm', 'lock', 'access', 'automation', 'automation_selfcheck', 'lock_revision']);
  const isStamp = object => !!object && TYPES.has(object.type);
  const isLocked = object => isStamp(object) && object.positionLocked === true;
  const intersects = (a, b) => !!a && !!b &&
    [a.left, a.top, a.right, a.bottom, b.left, b.top, b.right, b.bottom].every(Number.isFinite) &&
    a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;

  /* The selection is transient. Only the explicit object mutations below are saved. */
  function createModel(adapter) {
    const chosen = new Set();
    let documentScope = adapter.document();
    function eligible() {
      return adapter.items().filter(object => isStamp(object) && (adapter.eligible ? adapter.eligible(object) : adapter.visible(object)));
    }
    function pageItems() {
      return eligible().filter(object => object.page === adapter.page());
    }
    function visible() {
      return pageItems().filter(object => adapter.visible(object));
    }
    function sync() {
      const changed = documentScope !== adapter.document();
      if (changed) {
        chosen.clear();
        documentScope = adapter.document();
      }
      // Paging or hiding a layer does not lose the file-wide selection.
      // Removed objects and inactive protocols are still pruned immediately.
      const available = new Set(eligible().map(object => object.uid));
      for (const uid of chosen) if (!available.has(uid)) chosen.delete(uid);
      return changed;
    }
    function selected() {
      sync();
      return eligible().filter(object => chosen.has(object.uid));
    }
    function toggle(uid) {
      sync();
      if (!visible().some(object => object.uid === uid)) return false;
      if (chosen.has(uid)) chosen.delete(uid); else chosen.add(uid);
      return true;
    }
    function all() {
      sync();
      chosen.clear();
      for (const object of eligible()) chosen.add(object.uid);
    }
    function onlyPage() {
      sync();
      chosen.clear();
      for (const object of pageItems()) chosen.add(object.uid);
    }
    function rectangle(rect, bounds) {
      sync();
      // Region selection adds to the current set, like successive individual taps.
      for (const object of visible()) {
        if ((bounds(object) || []).some(box => intersects(rect, box))) chosen.add(object.uid);
      }
    }
    function apply(action) {
      const result = { objects: 0, points: 0, preservedRemarks: 0 };
      if (action === 'delete') {
        const targets = selected();
        if (!targets.length || typeof adapter.remove !== 'function') return result;
        adapter.remove(targets);
        const remaining = new Set(adapter.items());
        result.objects = targets.filter(object => !remaining.has(object)).length;
        chosen.clear();
        return result;
      }
      if (!['lock', 'unlock', 'approve', 'reset'].includes(action)) return result;
      for (const object of selected()) {
        let changed = false;
        if (action === 'lock' || action === 'unlock') {
          const locked = action === 'lock';
          if (isLocked(object) !== locked) { object.positionLocked = locked; changed = true; }
        } else {
          const checks = adapter.checks(object);
          object.checks = object.checks || {};
          for (const [key] of checks) {
            const current = object.checks[key];
            if (current?.result === 'remark') result.preservedRemarks++;
            if (action === 'approve' && !current?.result) {
              // An inactive remark draft is kept; existing answers are never replaced.
              const value = current || { result: '', note: '' };
              value.result = 'ok'; object.checks[key] = value;
              result.points++; changed = true;
            } else if (action === 'reset' && current?.result) {
              current.result = ''; result.points++; changed = true;
            }
          }
          if (action === 'reset') {
            for (const key of ['remediationDate', 'remediationSignature']) {
              if (object[key]) { object[key] = ''; changed = true; }
            }
            if (object.manualFail) { object.manualFail = false; changed = true; }
          }
          if (changed) adapter.syncStatus(object);
        }
        if (changed) result.objects++;
      }
      return result;
    }
    return { eligible, pageItems, visible, sync, selected, toggle, all, onlyPage, rectangle, apply,
      clear() { chosen.clear(); }, has(uid) { sync(); return chosen.has(uid); } };
  }

  /* A second finger cancels an unfinished selection. It never commits a rectangle. */
  function createPointerSession() {
    let draft = null, multi = false;
    const touches = new Set();
    function cancel() { const previous = draft; draft = null; return previous; }
    return {
      down(event, uid) {
        if (event.pointerType === 'touch') {
          touches.add(event.pointerId);
          if (event.isPrimary === false || touches.size > 1) { multi = true; cancel(); return null; }
        }
        if (multi || event.button !== 0) return null;
        draft = { id: event.pointerId, x: event.clientX, y: event.clientY,
          lastX: event.clientX, lastY: event.clientY, uid: uid || null, moved: false };
        return draft;
      },
      move(event) {
        if (!draft || multi || draft.id !== event.pointerId) return null;
        draft.lastX = event.clientX; draft.lastY = event.clientY;
        if (Math.hypot(draft.lastX - draft.x, draft.lastY - draft.y) > 5) draft.moved = true;
        return draft;
      },
      up(event) {
        touches.delete(event.pointerId);
        if (!draft || multi || draft.id !== event.pointerId) return null;
        if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
          draft.lastX = event.clientX; draft.lastY = event.clientY;
          if (Math.hypot(draft.lastX - draft.x, draft.lastY - draft.y) > 5) draft.moved = true;
        }
        const result = draft; draft = null; return result;
      },
      cancel,
      cancelPointer(id) { touches.delete(id); return draft?.id === id ? cancel() : null; },
      multiTouch() { multi = true; return cancel(); },
      endTouches(count) { if (!count) { multi = false; touches.clear(); } },
      reset() { cancel(); multi = false; touches.clear(); },
      current: () => draft, isMulti: () => multi
    };
  }

  const core = { createModel, createPointerSession, isStamp, isLocked, intersects };
  if (typeof module === 'object' && module.exports) module.exports = core;
  if (!root?.document) return;

  function install() {
    const document = root.document, body = document.body;
    if (root.SecurityStampSelection || document.documentElement.dataset.controlflowUi !== '1' ||
        !['security', 'revision'].includes(document.documentElement.dataset.cfStampMode) ||
        !body.classList.contains('allInOneApp')) return;
    const viewer = document.getElementById('secViewer'), stage = document.getElementById('secStage');
    const menu = document.querySelector('.serviceToolsMenu'), choices = menu?.querySelector('.serviceToolChoices');
    if (!viewer || !stage || !choices || typeof items === 'undefined') return;
    const selector = '[data-security-stamp-uid],[data-detector-uid],[data-object-uid]';
    let active = false, clickUntil = 0, lockedPan = null, actionBusy = false;
    let documentScope = pdf, pageScope = page;
    const pointer = createPointerSession(), originalTitles = new WeakMap(), originalPressed = new WeakMap();
    const model = createModel({ document: () => pdf, page: () => page, items: () => items,
      eligible: object => !!pdf && allInOneProtocolActive(object.type),
      visible: object => !drawingOverlaysHidden && !hiddenDrawingProtocols.has(object.type),
      checks: object => allChecks(object), syncStatus: object => syncStatus(object),
      remove: objects => {
        const removed = new Set(objects);
        items = items.filter(object => !removed.has(object));
        if (!items.some(object => object.uid === selected)) selected = null;
      } });
    const byId = uid => items.find(object => object.uid === uid && isStamp(object));
    function fromNode(target) {
      const node = target?.closest?.(selector);
      return node ? byId(node.dataset.securityStampUid || node.dataset.detectorUid || node.dataset.objectUid) : null;
    }
    function workspaceBusy() {
      return (typeof drawingFileLoading !== 'undefined' && drawingFileLoading) ||
        body.classList.contains('exporting') || viewer.getAttribute('aria-busy') === 'true';
    }
    function busy() { return actionBusy || workspaceBusy(); }
    function suppressClick(duration = 700) { clickUntil = Math.max(clickUntil, Date.now() + duration); }
    function button(id, text) {
      const node = document.createElement('button'); node.id = id; node.type = 'button'; node.textContent = text; return node;
    }

    const launcher = button('securitySelectStamps', '');
    launcher.className = 'serviceIconButton securitySelectStamps';
    launcher.title = 'Markera, justera, lås eller ta bort stämplar'; launcher.setAttribute('aria-label', 'Justera, lås eller ta bort stämplar');
    launcher.setAttribute('aria-controls', 'securityStampSelectionPanel'); launcher.setAttribute('aria-pressed', 'false');
    // Use the same small line-icon family without depending on a detector scanner.
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor'); icon.setAttribute('stroke-width', '1.8');
    icon.setAttribute('stroke-linecap', 'round'); icon.setAttribute('stroke-linejoin', 'round'); icon.setAttribute('aria-hidden', 'true');
    const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    iconPath.setAttribute('d', 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M9 11V9a3 3 0 0 1 6 0v2M8 11h8v6H8Z');
    icon.append(iconPath); launcher.append(icon);
    const launcherText = document.createElement('span'); launcherText.textContent = 'Justera / lås stämplar'; launcher.append(launcherText);
    choices.append(launcher);

    const panel = document.createElement('section'); panel.id = 'securityStampSelectionPanel'; panel.hidden = true;
    panel.setAttribute('aria-label', 'Justera, lås eller ta bort markerade stämplar');
    const head = document.createElement('div'); head.className = 'securityStampSelectionHead';
    const count = document.createElement('output'); count.id = 'securityStampSelectionCount'; count.setAttribute('aria-live', 'polite');
    const all = button('securityStampSelectAll', 'Alla i ritningen'), onlyPage = button('securityStampSelectPage', 'Endast denna sida'), done = button('securityStampSelectionDone', 'Klart');
    all.title = 'Markera alla aktiva protokolls stämplar på alla sidor'; all.setAttribute('aria-pressed', 'false');
    onlyPage.title = 'Ersätt urvalet med alla aktiva protokolls stämplar på aktuell sida'; onlyPage.setAttribute('aria-pressed', 'false');
    head.append(count, all, onlyPage, done);
    const lockActions = document.createElement('div'); lockActions.className = 'securityStampSelectionLockActions';
    lockActions.setAttribute('role', 'group'); lockActions.setAttribute('aria-label', 'Placering och borttagning av valda stämplar');
    const lock = button('securityStampSelectionLock', 'Lås placering'), unlock = button('securityStampSelectionUnlock', 'Lås upp');
    const remove = button('securityStampSelectionDelete', 'Ta bort markerade');
    remove.title = 'Ta bort valda objekt och deras protokoll. Åtgärden kan ångras.';
    lockActions.append(lock, unlock, remove);
    const actions = document.createElement('div'); actions.className = 'securityStampSelectionActions';
    const action = document.createElement('select'); action.id = 'securityStampSelectionAction'; action.setAttribute('aria-label', 'Åtgärd för valda stämplar');
    for (const [value, text] of [['', 'Kontrollåtgärd…'], ['approve', 'Godkänn otestade'], ['reset', 'Återställ kontroller']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = text; action.append(option);
    }
    const apply = button('securityStampSelectionApply', 'Utför'); apply.className = 'primary';
    actions.append(action, apply);
    const message = document.createElement('p'); message.id = 'securityStampSelectionMessage'; message.setAttribute('role', 'status');
    panel.append(head, lockActions, actions, message); viewer.before(panel);
    const marquee = document.createElement('div'); marquee.className = 'securityStampSelectionRegion'; marquee.hidden = true;
    marquee.setAttribute('aria-hidden', 'true'); viewer.append(marquee);

    function clearDraft() {
      const draft = pointer.cancel(); marquee.hidden = true;
      if (draft) { try { if (viewer.hasPointerCapture(draft.id)) viewer.releasePointerCapture(draft.id); } catch (_) {} }
    }
    function paint() {
      const selectedItems = model.selected(), selectedIds = new Set(selectedItems.map(object => object.uid));
      for (const node of stage.querySelectorAll(selector)) {
        const object = fromNode(node); if (!object) continue;
        node.classList.toggle('securityStampChosen', active && selectedIds.has(object.uid));
        node.classList.toggle('securityStampLocked', isLocked(object));
        if (!originalTitles.has(node)) originalTitles.set(node, node.getAttribute('title'));
        const original = originalTitles.get(node) || '';
        const suffix = isLocked(object) ? 'Placering låst. Protokollet kan fortfarande öppnas.' : '';
        node.title = active ? (selectedIds.has(object.uid) ? 'Vald. Tryck för att avmarkera.' : 'Tryck för att markera.') + (suffix ? ' ' + suffix : '') : original + (suffix ? ' ' + suffix : '');
        if (active) {
          if (!originalPressed.has(node)) originalPressed.set(node, node.getAttribute('aria-pressed'));
          node.setAttribute('aria-pressed', String(selectedIds.has(object.uid)));
        } else if (originalPressed.has(node)) {
          const previous = originalPressed.get(node);
          if (previous === null) node.removeAttribute('aria-pressed'); else node.setAttribute('aria-pressed', previous);
          originalPressed.delete(node);
        }
      }
      const locked = selectedItems.filter(isLocked).length;
      const pages = new Set(selectedItems.map(object => object.page)).size;
      const available = model.eligible(), currentPageItems = model.pageItems();
      const allChosen = available.length > 0 && selectedItems.length === available.length;
      const pageChosen = !allChosen && currentPageItems.length > 0 && selectedItems.length === currentPageItems.length && selectedItems.every(object => object.page === page);
      count.textContent = selectedItems.length + ' valda' + (pages > 1 ? ' · ' + pages + ' sidor' : '') + (locked ? ' · ' + locked + ' låsta' : '');
      all.setAttribute('aria-pressed', String(allChosen)); onlyPage.setAttribute('aria-pressed', String(pageChosen));
      const blocked = busy();
      all.disabled = blocked || !available.length;
      onlyPage.disabled = blocked || !currentPageItems.length;
      lock.disabled = blocked || !selectedItems.length || locked === selectedItems.length;
      unlock.disabled = blocked || !locked;
      remove.disabled = blocked || !selectedItems.length;
      done.disabled = blocked;
      action.disabled = blocked || !selectedItems.length;
      apply.disabled = blocked || !selectedItems.length || !action.value;
      launcher.hidden = ![...TYPES].some(allInOneProtocolActive);
      launcher.disabled = !pdf || blocked;
      launcher.setAttribute('aria-pressed', String(active));
      root.dispatchEvent(new root.CustomEvent('controlflow-stamp-selection-change', {
        detail: { active, selectedIds: [...selectedIds], locked, busy: blocked }
      }));
    }
    function refresh() {
      const changedDocument = documentScope !== pdf, changedPage = pageScope !== page;
      if (changedDocument || changedPage) { clearDraft(); pointer.reset(); }
      if (changedDocument) model.clear();
      documentScope = pdf; pageScope = page; model.sync();
      if (active && (changedDocument || !pdf || body.dataset.view !== 'drawing' ||
          ![...TYPES].some(allInOneProtocolActive))) stop(false);
      else {
        if (active && changedPage) message.textContent = model.selected().length ? 'Urvalet är kvar när du byter sida.' : 'Markera stämplar eller välj Alla i ritningen.';
        paint();
      }
    }
    function stop(restoreFocus = true) {
      active = false; clearDraft(); pointer.reset(); model.clear(); panel.hidden = true;
      body.classList.remove('securityStampSelecting'); action.value = ''; message.textContent = '';
      paint();
      if (restoreFocus) document.querySelector('.serviceToolLauncher')?.focus();
    }
    function start() {
      if (!pdf || busy() || launcher.hidden) return;
      const scanner = document.getElementById('securityDetectorScanPanel');
      if (scanner && !scanner.hidden) document.getElementById('detectorClose')?.click();
      securityDrawingTools?.stop(); securityDrawingTools?.deselect();
      addType = null; textMode = false; selected = null; lastObjectTap = null; panTouch = null; panMouse = null;
      body.classList.remove('secAdding', 'secTextAdding'); document.getElementById('secHint').hidden = true;
      go('drawing'); active = true; model.clear(); pointer.reset(); action.value = '';
      panel.hidden = false; menu.hidden = true; body.classList.add('securityStampSelecting');
      message.textContent = 'Välj alla sidor, denna sida eller enskilda stämplar. Två fingrar zoomar.';
      drawMarkers(); paint(); all.focus();
    }
    async function runAction(operation) {
      if (busy() || !active || !['lock', 'unlock', 'approve', 'reset', 'delete'].includes(operation) || !model.selected().length) return;
      const targetDocument = pdf, targets = new Map(model.selected().map(object => [object.uid, object]));
      let deleted = false;
      clearDraft(); actionBusy = true; paint();
      try {
        if (operation === 'delete') {
          const dialogs = root.ControlflowDialogs;
          if (!dialogs?.enabled?.()) {
            message.textContent = 'Kunde inte öppna bekräftelsen. Ladda om appen och försök igen.';
            return;
          }
          const pages = new Set([...targets.values()].map(object => object.page)).size;
          let confirmed;
          try {
            confirmed = await dialogs.confirm({
              title: 'Ta bort ' + targets.size + (targets.size === 1 ? ' markerat objekt?' : ' markerade objekt?'),
              description: (pages > 1 ? 'Urvalet omfattar ' + pages + ' sidor. ' : '') +
                'De markerade objekten och deras protokoll med kontrollpunkter och anmärkningar tas bort. Du kan återställa hela raderingen med Ångra.',
              confirmLabel: 'Ta bort'
            });
          } catch (_) {
            message.textContent = 'Kunde inte öppna bekräftelsen. Försök igen.';
            return;
          }
          if (!confirmed) return;
          const current = model.selected();
          // Confirmation belongs to exactly this document and these object instances.
          // An import, undo or changed protocol selection must never delete new data.
          if (!active || pdf !== targetDocument || workspaceBusy() || current.length !== targets.size ||
              current.some(object => targets.get(object.uid) !== object)) {
            if (active) message.textContent = 'Ritningen eller urvalet har ändrats. Markera objekten igen innan du tar bort dem.';
            return;
          }
        }
        securitySessionHistory.endGroup(); securitySessionHistory.record();
        const result = model.apply(operation);
        if (result.objects) {
          save(); securitySessionHistory.endGroup(); drawMarkers(); showSelected(); showOverview();
        }
        if (operation === 'delete') {
          deleted = result.objects > 0;
          message.textContent = result.objects + ' objekt har tagits bort. Ångra återställer objekten och deras protokoll.';
        } else if (operation === 'lock') message.textContent = result.objects ? result.objects + ' stämplar har låst placering. Ångra finns i ritningsraden.' : 'De valda stämplarna är redan låsta.';
        else if (operation === 'unlock') message.textContent = result.objects ? result.objects + ' stämplar är upplåsta.' : 'De valda stämplarna är redan upplåsta.';
        else if (operation === 'approve') message.textContent = result.points ? result.points + ' otestade punkter godkända. Befintliga svar och anmärkningar är kvar.' : 'Inga otestade kontrollpunkter bland de valda stämplarna.';
        else message.textContent = result.objects ? 'Kontroller återställda på ' + result.objects + ' stämplar. Anmärkningstext finns kvar som utkast.' : 'De valda kontrollerna är redan återställda.';
      } finally {
        actionBusy = false; paint();
        if (operation === 'delete' && active && !busy()) {
          (deleted ? (all.disabled ? done : all) : (remove.disabled ? done : remove)).focus();
        }
      }
    }
    launcher.onclick = () => active ? stop() : start();
    done.onclick = () => stop();
    all.onclick = () => { if (busy()) return; const total = model.eligible().length; if (total && model.selected().length === total) model.clear(); else model.all(); message.textContent = ''; paint(); };
    onlyPage.onclick = () => { if (busy()) return; model.onlyPage(); message.textContent = ''; paint(); };
    lock.onclick = () => runAction('lock'); unlock.onclick = () => runAction('unlock');
    remove.onclick = () => runAction('delete');
    action.onchange = paint; apply.onclick = () => runAction(action.value);

    function showRegion(draft) {
      if (!draft?.moved) return;
      const rect = viewer.getBoundingClientRect(); marquee.hidden = false;
      Object.assign(marquee.style, { left: Math.min(draft.x, draft.lastX) - rect.left + viewer.scrollLeft + 'px',
        top: Math.min(draft.y, draft.lastY) - rect.top + viewer.scrollTop + 'px',
        width: Math.abs(draft.lastX - draft.x) + 'px', height: Math.abs(draft.lastY - draft.y) + 'px' });
    }
    function inViewer(target) { return target === viewer || viewer.contains(target); }
    function swallow(event) { event.preventDefault(); event.stopImmediatePropagation(); }
    document.addEventListener('pointerdown', event => {
      if (!inViewer(event.target)) return;
      if (!active) {
        if (isLocked(fromNode(event.target)) && event.button === 0) lockedPan = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        return;
      }
      if (busy()) { swallow(event); return; }
      const previous = pointer.current();
      const draft = pointer.down(event, fromNode(event.target)?.uid);
      if (!draft) {
        if (previous) { try { viewer.releasePointerCapture(previous.id); } catch (_) {} }
        marquee.hidden = true; suppressClick(); return;
      }
      swallow(event);
      try { viewer.setPointerCapture(event.pointerId); } catch (_) {}
    }, true);
    document.addEventListener('pointermove', event => {
      if (!active) {
        if (lockedPan?.id === event.pointerId && Math.hypot(event.clientX - lockedPan.x, event.clientY - lockedPan.y) > 6) lockedPan.moved = true;
        return;
      }
      const draft = pointer.move(event); if (!draft) return;
      swallow(event); showRegion(draft);
    }, true);
    document.addEventListener('pointerup', event => {
      if (!active) { if (lockedPan?.id === event.pointerId) { if (lockedPan.moved) suppressClick(); lockedPan = null; } return; }
      const draft = pointer.up(event); if (!draft) return;
      swallow(event); suppressClick(); marquee.hidden = true;
      try { viewer.releasePointerCapture(event.pointerId); } catch (_) {}
      if (draft.moved) {
        const rect = { left: Math.min(draft.x, draft.lastX), top: Math.min(draft.y, draft.lastY), right: Math.max(draft.x, draft.lastX), bottom: Math.max(draft.y, draft.lastY) };
        const bounds = new Map();
        for (const node of stage.querySelectorAll(selector)) {
          if (node.classList.contains('precisionPointGrab')) continue;
          const object = fromNode(node), r = node.getBoundingClientRect(); if (!object || !r.width || !r.height) continue;
          if (!bounds.has(object.uid)) bounds.set(object.uid, []); bounds.get(object.uid).push(r);
        }
        model.rectangle(rect, object => bounds.get(object.uid));
      } else if (draft.uid) model.toggle(draft.uid); else model.clear();
      message.textContent = ''; paint();
    }, true);
    document.addEventListener('pointercancel', event => {
      if (lockedPan?.id === event.pointerId) { suppressClick(); lockedPan = null; }
      if (active && pointer.current()?.id === event.pointerId) { clearDraft(); suppressClick(); }
      pointer.cancelPointer(event.pointerId);
    }, true);
    document.addEventListener('lostpointercapture', event => {
      if (active && pointer.current()?.id === event.pointerId) { clearDraft(); suppressClick(); }
    }, true);
    document.addEventListener('touchstart', event => {
      if (!active || !inViewer(event.target)) return;
      if (event.touches.length >= 2) {
        clearDraft(); pointer.multiTouch(); suppressClick();
        // Do not stop the event: the existing PDF viewport owns pinch and pan.
      } else if (!pointer.isMulti()) swallow(event);
    }, { capture: true, passive: false });
    document.addEventListener('touchmove', event => {
      if (active && inViewer(event.target) && event.touches.length < 2 && !pointer.isMulti()) swallow(event);
    }, { capture: true, passive: false });
    for (const type of ['touchend', 'touchcancel']) document.addEventListener(type, event => {
      if (!active || !inViewer(event.target)) return;
      if (pointer.isMulti()) {
        suppressClick(); if (!event.touches.length) queueMicrotask(() => pointer.endTouches(0));
      } else if (!event.touches.length) pointer.endTouches(0);
    }, { capture: true, passive: true });
    document.addEventListener('wheel', event => { if (active && inViewer(event.target)) { clearDraft(); pointer.reset(); suppressClick(); } }, { capture: true, passive: true });
    document.addEventListener('click', event => {
      if (inViewer(event.target)) {
        if (Date.now() < clickUntil) { swallow(event); return; }
        if (active) { swallow(event); if (busy()) return; const object = fromNode(event.target); if (object) model.toggle(object.uid); else model.clear(); paint(); }
        return;
      }
      if (active && event.target.closest?.('.serviceToolChoices button,[data-add],#secNavOverview,#securityPreview,#securityExport') && !launcher.contains(event.target)) stop(false);
    }, true);
    document.addEventListener('dblclick', event => { if (active && inViewer(event.target)) swallow(event); }, true);
    document.addEventListener('keydown', event => {
      if (!active || event.key !== 'Escape' || actionBusy || event.target.closest?.('#controlflowAppDialog')) return;
      event.preventDefault(); event.stopPropagation(); stop();
    }, true);
    document.addEventListener('change', event => { if (event.target.id === 'securityFile') stop(false); }, true);

    const previousDraw = drawMarkers;
    drawMarkers = function (...args) { const result = previousDraw.apply(this, args); refresh(); return result; };
    const previousGo = go;
    go = function (view, ...args) { if (view !== 'drawing' && active) stop(false); return previousGo.call(this, view, ...args); };
    new MutationObserver(refresh).observe(body, { attributes: true, attributeFilter: ['data-view', 'data-security-project-layout'] });
    root.SecurityStampSelection = {
      isLocked, canMove: object => !isStamp(object) || !isLocked(object) && !active,
      panFrom: target => !active && isLocked(fromNode(target)), isActive: () => active,
      start, stop, refresh, suppressClick,
      selectedObjects: () => model.selected(), eligibleObjects: () => model.eligible(), isBusy: busy,
      selectedIds: () => model.selected().map(object => object.uid)
    };
    refresh();
  }
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(typeof window === 'object' ? window : null);
