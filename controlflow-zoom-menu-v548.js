/* Presentation only: keep the existing PDF zoom controls inside the drawing-tools menu. */
(() => {
  'use strict';

  function start() {
    const root = document.documentElement;
    const body = document.body;
    if (root.dataset.controlflowUi !== '1' || !body.classList.contains('allInOneApp')) return;
    if (body.hasAttribute('data-controlflow-zoom-setup')) return;
    body.setAttribute('data-controlflow-zoom-setup', '');

    const ids = ['secZoomOut', 'secZoom', 'secZoomIn'];
    const retained = new Map();
    const relevant = '.serviceToolsMenu, #controlflowPdfZoomControls, #secZoomOut, #secZoom, #secZoomIn';
    let group = null;
    let label = null;
    let pending = false;

    function place() {
      pending = false;
      const menu = body.querySelector('.serviceToolsMenu');
      if (!menu) return;

      // Retain the live nodes if a menu is rebuilt. Never clone controls or rebind zoom handlers.
      const nodes = ids.map(id => {
        const node = document.getElementById(id) || retained.get(id);
        if (node) retained.set(id, node);
        return node;
      });
      if (nodes.some(node => !node)) return;

      if (!group) {
        group = document.createElement('div');
        group.id = 'controlflowPdfZoomControls';
        group.className = 'controlflowPdfZoomControls';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-labelledby', 'controlflowPdfZoomLabel');
        label = document.createElement('span');
        label.id = 'controlflowPdfZoomLabel';
        label.textContent = 'Zooma ritningen';
      }

      const ordered = [label, ...nodes];
      if (group.children.length !== ordered.length || ordered.some((node, i) => group.children[i] !== node)) {
        // replaceChildren moves these exact nodes and preserves their listeners and IDs.
        group.replaceChildren(...ordered);
      }
      if (group.parentNode !== menu) menu.append(group);
      if (!body.hasAttribute('data-controlflow-zoom-menu')) body.setAttribute('data-controlflow-zoom-menu', '');
      // The original workspaceZoomControls wrapper stays in place: v528 uses it as an anchor.
    }

    function schedule() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(place);
    }

    function relevantNode(node) {
      return node.nodeType === 1 && (node.matches(relevant) || node.querySelector(relevant));
    }

    // Ignore text/percentage updates. Reconcile only when the menu or its controls move/reappear.
    new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(relevantNode))) schedule();
    }).observe(body, { childList: true, subtree: true });

    place();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
