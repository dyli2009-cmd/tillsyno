/* Projektering 2.6: stable native touch gestures and editable PDF overlay. Original PDF bytes
 * and committed project state are never mutated by pointer interactions. */
(function (root) {
  'use strict';
  const SVG = 'http://www.w3.org/2000/svg';
  const MIN_ZOOM = .04, MAX_ZOOM = 16, MAX_PIXELS = 10000000;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const styleId = 'projektering-v2-6-canvas-style';

  function ensureStyles() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style'); style.id = styleId;
    style.textContent = '.p2-canvas-scroller{position:relative;width:100%;height:100%;overflow:auto;overscroll-behavior:contain;touch-action:none;outline:none;scrollbar-width:thin;user-select:none;-webkit-user-select:none}.p2-canvas-stage{position:relative;min-width:100%;min-height:100%}.p2-canvas-page{position:absolute;flex:none;background:white;box-shadow:0 4px 22px #142b3226;overflow:hidden;transform-origin:0 0}.p2-canvas-page>canvas,.p2-canvas-overlay{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none}.p2-canvas-overlay{overflow:hidden;touch-action:none;stroke:none;fill:none;pointer-events:auto}.p2-canvas-overlay text{stroke:none;font-family:Arial,Helvetica,sans-serif;user-select:none;pointer-events:none}.p2-canvas-overlay .stamp-item{cursor:move;outline:none;touch-action:none}.p2-canvas-overlay .stamp-item[data-locked=true]{cursor:default}.p2-stamp-selection{fill:none;stroke:#167a91;stroke-width:1.4;vector-effect:non-scaling-stroke;pointer-events:none}.p2-stamp-linked{stroke:#3b9a89;stroke-width:1.2;stroke-dasharray:3 2;fill:none;vector-effect:non-scaling-stroke;pointer-events:none}.p2-canvas-overlay .stamp-item:focus-visible .p2-stamp-selection{display:block!important;stroke:#1964b6;stroke-width:2}.p2-canvas-overlay .p2-stamp-hit{fill:transparent;stroke:none;pointer-events:all}.p2-canvas-status{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;max-width:90%;padding:9px 15px;border:1px solid #cadbd6;border-radius:9px;background:#fffef6e8;color:#36524b;font:12px system-ui;box-shadow:0 3px 18px #142b3218;pointer-events:none;text-align:center}.p2-canvas-scroller[data-tool=pan]{cursor:grab}.p2-canvas-scroller[data-panning=true]{cursor:grabbing}.p2-canvas-scroller[data-tool=place]{cursor:crosshair}.p2-canvas-scroller[data-tool=erase]{cursor:crosshair}.p2-canvas-marquee{fill:#2487a01a;stroke:#2487a0;stroke-width:1;stroke-dasharray:4 3;vector-effect:non-scaling-stroke;pointer-events:none}';
    document.head.append(style);
    style.textContent += '.p2-resize-handle{fill:#fff;stroke:#167a91;stroke-width:1.5;vector-effect:non-scaling-stroke;pointer-events:all}.p2-resize-handle[data-resize-handle=n],.p2-resize-handle[data-resize-handle=s]{cursor:ns-resize}.p2-resize-handle[data-resize-handle=e],.p2-resize-handle[data-resize-handle=w]{cursor:ew-resize}';
  }

  function create(options = {}) {
    const host = options.host;
    if (!(host instanceof HTMLElement)) throw Error('Ritningsytan kunde inte hittas.');
    ensureStyles();
    const scroller = document.createElement('div'); scroller.className = 'p2-canvas-scroller';
    scroller.tabIndex = 0; scroller.dataset.tool = 'select';
    scroller.setAttribute('role', 'region'); scroller.setAttribute('aria-label', 'Ritningsyta. Dra en stämpel för att flytta den. Dra på ritningen för att panorera och zooma med mushjulet eller två fingrar.');
    const stage = document.createElement('div'); stage.className = 'p2-canvas-stage';
    const sheet = document.createElement('div'); sheet.className = 'p2-canvas-page'; sheet.hidden = true;
    let bitmap = document.createElement('canvas'); bitmap.setAttribute('aria-hidden', 'true');
    const overlay = document.createElementNS(SVG, 'svg'); overlay.classList.add('p2-canvas-overlay'); overlay.setAttribute('role', 'group'); overlay.setAttribute('aria-label', 'Placerade stämplar');
    const status = document.createElement('div'); status.className = 'p2-canvas-status'; status.setAttribute('role', 'status'); status.textContent = 'Öppna en PDF-ritning för att börja.';
    sheet.append(bitmap, overlay); stage.append(sheet); scroller.append(stage); host.replaceChildren(scroller, status);
    const abort = new AbortController(), touches = new Map();
    let pdf = null, metadata = [], state = null, pageNumber = 1, zoomValue = 1, autoFit = true;
    let selected = [], tool = 'select', stencilId = null, shown = true, destroyed = false;
    let renderTask = null, renderToken = 0, openToken = 0, rendering = false, renderTimer;
    let interaction = null, pinch = null, space = false, suppressClickUntil = 0, lastTap = null;
    let sizePreview = null, overlayPending = false;
    const nativeTouchEnabled = typeof root.TouchEvent === 'function' && ('ontouchstart' in root || (root.navigator?.maxTouchPoints || 0) > 0);
    const nativeTouchIds = new Set();
    let boardLeft = 0, boardTop = 0;

    const listen = (target, name, callback, settings = {}) => target.addEventListener(name, callback, {...settings, signal:abort.signal});
    const currentMeta = () => metadata[pageNumber - 1];
    const currentPlacements = () => (state?.placements || []).filter(item => item.page === pageNumber);
    const findPlacement = id => (state?.placements || []).find(item => item.id === id);
    const emitView = () => options.onView?.({zoom:zoomValue, page:metadata.length ? pageNumber : 0, total:metadata.length, rendering});
    function say(message) { status.textContent = message; status.hidden = !message; }
    function safeCallback(name, value) {
      try {
        const result = options[name]?.(value);
        if (result && typeof result.catch === 'function') result.catch(error => { options.onError?.(error); });
      } catch (error) { options.onError?.(error); }
    }
    function select(ids, notify = true) {
      const next = [...new Set(ids)].filter(id => !!findPlacement(id));
      const changed = next.length !== selected.length || next.some((id,index) => id !== selected[index]);
      selected = next;
      drawOverlay(); if (notify && changed) safeCallback('onSelect', [...selected]);
    }
    function layout() {
      const meta = currentMeta(); if (!meta) return;
      const width = meta.width * zoomValue, height = meta.height * zoomValue;
      const outerWidth = Math.max(scroller.clientWidth, width + 48), outerHeight = Math.max(scroller.clientHeight, height + 48);
      boardLeft = (outerWidth - width) / 2; boardTop = (outerHeight - height) / 2;
      stage.style.width = `${outerWidth}px`; stage.style.height = `${outerHeight}px`;
      sheet.style.left = `${boardLeft}px`; sheet.style.top = `${boardTop}px`; sheet.style.width = `${width}px`; sheet.style.height = `${height}px`;
    }
    function point(clientX, clientY, bounded = false) {
      const rect = sheet.getBoundingClientRect();
      const x = rect.width ? (clientX - rect.left) / rect.width : 0, y = rect.height ? (clientY - rect.top) / rect.height : 0;
      return {x:bounded ? clamp(x, 0, 1) : x, y:bounded ? clamp(y, 0, 1) : y};
    }
    function cancelRender() {
      clearTimeout(renderTimer); renderToken++;
      if (renderTask) { try { renderTask.cancel(); } catch (_) {} renderTask = null; }
      rendering = false;
    }
    async function render() {
      if (!pdf || destroyed) return;
      clearTimeout(renderTimer);
      const token = ++renderToken, expectedPage = pageNumber;
      if (renderTask) { try { renderTask.cancel(); } catch (_) {} renderTask = null; }
      rendering = true; emitView();
      try {
        const page = await pdf.getPage(expectedPage); if (token !== renderToken || destroyed) return;
        const natural = page.getViewport({scale:1});
        const density = Math.min(2, root.devicePixelRatio || 1);
        const maxScale = Math.sqrt(MAX_PIXELS / (natural.width * natural.height));
        const scale = Math.max(.01, Math.min(Math.max(.8, zoomValue * density), maxScale, 8));
        const viewport = page.getViewport({scale});
        const next = document.createElement('canvas'); next.width = Math.max(1, Math.floor(viewport.width)); next.height = Math.max(1, Math.floor(viewport.height)); next.setAttribute('aria-hidden', 'true');
        const task = page.render({canvasContext:next.getContext('2d', {alpha:false}), viewport, background:'#ffffff'}); renderTask = task;
        await task.promise;
        if (token !== renderToken || destroyed || expectedPage !== pageNumber) return;
        bitmap.replaceWith(next); bitmap = next; say('');
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException' && token === renderToken && !destroyed) {
          say('Ritningssidan kunde inte visas. Prova att byta sida eller öppna filen igen.'); safeCallback('onError', error);
        }
      } finally {
        if (token === renderToken) { renderTask = null; rendering = false; emitView(); }
      }
    }
    function queueRender() { clearTimeout(renderTimer); renderTimer = setTimeout(() => void render(), 130); }
    function setZoom(value, anchor, anchorPoint, fit = false) {
      if (!currentMeta() || !finite(value)) return;
      const rect = scroller.getBoundingClientRect(), at = anchor || {clientX:rect.left + rect.width / 2, clientY:rect.top + rect.height / 2};
      const normalized = anchorPoint || point(at.clientX, at.clientY);
      zoomValue = clamp(value, MIN_ZOOM, MAX_ZOOM); autoFit = fit; layout(); drawOverlay();
      const meta = currentMeta();
      scroller.scrollLeft = boardLeft + normalized.x * meta.width * zoomValue - (at.clientX - rect.left);
      scroller.scrollTop = boardTop + normalized.y * meta.height * zoomValue - (at.clientY - rect.top);
      queueRender(); emitView();
    }
    function fit() {
      const meta = currentMeta(); if (!meta) return zoomValue;
      const width = Math.max(70, scroller.clientWidth - 48), height = Math.max(70, scroller.clientHeight - 48);
      setZoom(Math.min(width / meta.width, height / meta.height), null, {x:.5, y:.5}, true);
      return zoomValue;
    }
    function drawOverlay() {
      // iOS retains the touched SVG node as the gesture target. Keep it alive
      // through selection callbacks, pinch frames and app state refreshes.
      if (touches.size) { overlayPending = true; patchOverlay(); return; }
      overlayPending = false;
      const meta = currentMeta(); if (!meta) { overlay.innerHTML = ''; return; }
      overlay.setAttribute('viewBox', `0 0 ${meta.width} ${meta.height}`); overlay.style.visibility = shown ? 'visible' : 'hidden';
      const selectedCodes = new Set(selected.map(id => findPlacement(id)?.code).filter(Boolean));
      overlay.innerHTML = currentPlacements().map(original => {
        const item = sizePreview?.has(original.id) ? {...original, ...sizePreview.get(original.id)} : original;
        const stencil = state.stencils?.[item.stencilId] || {}, width = item.width, height = item.height, isSelected = selected.includes(item.id), linked = !isSelected && selectedCodes.has(item.code);
        const color = value => /^#[0-9a-f]{6}$/i.test(value) ? value : '#f4d35e';
        const fill = color(stencil.fill), stroke = color(stencil.stroke || '#9c7d25'), ink = color(stencil.textColor || '#263b35');
        const size = Math.min(stencil.fontSize || 10, Math.max(3, (width - 8) / Math.max(1, String(item.code).length * .68)));
        const angle = ((item.rotation || 0) % 360 + 360) % 360;
        const glyphTransform = angle > 90 && angle <= 270 ? ' transform="rotate(180)"' : '';
        const glyph = `<text x="0" y="${size*.34}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${ink}"${glyphTransform}>${escape(item.code)}</text>`;
        const shape = stencil.shape === 'oval' ? `<ellipse cx="0" cy="0" rx="${width/2}" ry="${height/2}" fill="${fill}" stroke="${stroke}" stroke-width=".8"/>` : `<rect x="${-width/2}" y="${-height/2}" width="${width}" height="${height}" rx="${stencil.shape === 'square' ? 1 : 3}" fill="${fill}" stroke="${stroke}" stroke-width=".8"/>`;
        const outline = (className, gap, attributes = '') => stencil.shape === 'oval' ? `<ellipse class="${className}" cx="0" cy="0" rx="${width/2+gap}" ry="${height/2+gap}" ${attributes}/>` : `<rect class="${className}" x="${-width/2-gap}" y="${-height/2-gap}" width="${width+gap*2}" height="${height+gap*2}" rx="${stencil.shape === 'square' ? 1 : 3}" ${attributes}/>`;
        // Keep the body available for selection/double tap even when the PDF
        // is fitted so far out that its stamp is smaller than a handle.
        const handleX = Math.max(width/2,9/zoomValue), handleY = Math.max(height/2,9/zoomValue);
        const handles = isSelected && !item.locked ? [['n',0,-handleY],['e',handleX,0],['s',0,handleY],['w',-handleX,0]].map(([direction,x,y]) => `<circle class="p2-resize-handle" data-resize-handle="${direction}" cx="${x}" cy="${y}" r="${4.5/zoomValue}" tabindex="0" role="button" aria-label="Ändra storlek på ${escape(item.code)}, ${({n:'överkant',e:'högerkant',s:'underkant',w:'vänsterkant'})[direction]}. Höger eller upp förstorar, vänster eller ned förminskar." aria-keyshortcuts="ArrowUp ArrowRight ArrowDown ArrowLeft"/>`).join('') : '';
        const lock = item.locked ? `<g transform="translate(${width/2-3} ${-height/2-4})" fill="#46665e" stroke="#ffffff" stroke-width=".5" pointer-events="none"><rect x="-3" y="-1" width="6" height="5" rx="1"/><path d="M-2-1V-3a2 2 0 0 1 4 0v2" fill="none" stroke="#46665e" stroke-width="1.3"/></g>` : '';
        const activationHint = stencil.kind === 'card' ? '. Tryck på pekskärm, dubbelklicka eller tryck Retur för att öppna dörrkort.' : '. Dra för att flytta symbolen.';
        return `<g class="stamp-item${isSelected ? ' is-selected' : ''}${linked ? ' is-linked' : ''}" data-placement-id="${escape(item.id)}" data-locked="${!!item.locked}" tabindex="0" role="button" aria-label="${escape(item.code)}${item.locked ? ', låst' : ''}${activationHint}" aria-pressed="${isSelected}" transform="translate(${item.x*meta.width} ${item.y*meta.height}) rotate(${item.rotation||0})"><title>${escape(item.code)}${item.note ? ' · '+escape(item.note) : ''}</title>${shape}${glyph}${outline('p2-stamp-selection',2/zoomValue,`style="display:${isSelected?'block':'none'}"`)}${linked ? outline('p2-stamp-linked',2/zoomValue) : ''}${lock}${handles}</g>`;
      }).join('');
    }
    function patchOverlay() {
      const meta=currentMeta();if(!meta)return;
      overlay.style.visibility=shown?'visible':'hidden';
      for(const node of overlay.querySelectorAll('.stamp-item')){
        const original=findPlacement(node.dataset.placementId);if(!original)continue;
        const item={...original,...(sizePreview?.get(original.id)||{})},move=interaction?.updates?.find(update=>update.id===item.id);
        if(move){item.x=move.x;item.y=move.y;}
        const width=item.width,height=item.height,stencil=state.stencils[item.stencilId]||{},active=selected.includes(item.id);
        node.setAttribute('transform',`translate(${item.x*meta.width} ${item.y*meta.height}) rotate(${item.rotation||0})`);
        node.classList.toggle('is-selected',active);node.setAttribute('aria-pressed',String(active));
        const body=[...node.children].find(child=>['ellipse','rect'].includes(child.tagName)&&!child.hasAttribute('class'));
        const geometry=(target,gap=0)=>{
          if(!target)return;
          const values=target.tagName==='ellipse'?{rx:width/2+gap,ry:height/2+gap}:{x:-width/2-gap,y:-height/2-gap,width:width+gap*2,height:height+gap*2};
          for(const [key,value]of Object.entries(values))target.setAttribute(key,value);
        };
        geometry(body);const outline=node.querySelector('.p2-stamp-selection');geometry(outline,2/zoomValue);if(outline)outline.style.display=active?'block':'none';geometry(node.querySelector('.p2-stamp-linked'),2/zoomValue);
        const hx=Math.max(width/2,9/zoomValue),hy=Math.max(height/2,9/zoomValue);
        for(const handle of node.querySelectorAll('[data-resize-handle]')){
          const direction=handle.dataset.resizeHandle;handle.setAttribute('cx',direction==='e'?hx:direction==='w'?-hx:0);handle.setAttribute('cy',direction==='s'?hy:direction==='n'?-hy:0);handle.setAttribute('r',4.5/zoomValue);
        }
        if(sizePreview?.has(item.id)){
          const text=[...node.children].find(child=>child.tagName==='text');if(text){const size=Math.min(stencil.fontSize||10,Math.max(3,(width-8)/Math.max(1,String(item.code).length*.68)));text.setAttribute('font-size',size);text.setAttribute('y',size*.34);}
        }
      }
    }
    function flushOverlay(){if(!touches.size&&overlayPending)drawOverlay();}
    function resetInteraction() {
      interaction = null; pinch = null; sizePreview = null; lastTap = null; scroller.dataset.panning = 'false'; drawOverlay();
    }
    function capture(event) { if(event.__nativeTouch)return;try { scroller.setPointerCapture(event.pointerId); } catch (_) {} }
    function release(event) { if(event.__nativeTouch)return;try { scroller.releasePointerCapture(event.pointerId); } catch (_) {} }
    function cancelGesture(){touches.clear();nativeTouchIds.clear();resetInteraction();}
    function notifyErase(ids) {
      if (options.onErase) safeCallback('onErase', ids);
      else { select(ids); safeCallback('onContext', {action:'erase', ids}); }
    }
    function resizeScope() { return ['doors','code','single'].includes(state?.preferences?.sizeScope) ? state.preferences.sizeScope : 'doors'; }
    function resizeTargets(item, scope) {
      if (typeof root.Proj2Data?.resizeTargets === 'function') return root.Proj2Data.resizeTargets(state, item.id, {scope});
      const stencil = state?.stencils?.[item.stencilId];
      return (state?.placements || []).filter(candidate => scope === 'single' ? candidate.id === item.id : scope === 'doors' && stencil?.kind === 'card' ? state.stencils?.[candidate.stencilId]?.kind === 'card' : candidate.code === item.code);
    }
    function beginResize(common, placement, direction) {
      const scope = resizeScope(), targets = resizeTargets(placement, scope).map(item => ({...item}));
      if (targets.some(item => item.locked)) throw Error('Lås upp de berörda stämplarna innan du ändrar deras gemensamma storlek.');
      const minScale = Math.max(6 / placement.width, 6 / placement.height);
      let maxScale = Math.min(500 / placement.width, 500 / placement.height);
      for (const item of targets) {
        const meta = metadata[item.page-1];
        if (!meta) throw Error('Ritningssidan för stämpeln saknas.');
        const angle = (item.rotation || 0) * Math.PI / 180;
        const halfX = (Math.abs(Math.cos(angle))*placement.width + Math.abs(Math.sin(angle))*placement.height)/2;
        const halfY = (Math.abs(Math.sin(angle))*placement.width + Math.abs(Math.cos(angle))*placement.height)/2;
        maxScale = Math.min(maxScale, item.x*meta.width/halfX, (1-item.x)*meta.width/halfX, item.y*meta.height/halfY, (1-item.y)*meta.height/halfY);
      }
      if (maxScale + 1e-8 < minScale) throw Error('Flytta stämplarna längre från sidkanten för att ge dem en gemensam storlek.');
      interaction = {...common,kind:'resize',placement:{...placement},direction,scope,targets,minScale,maxScale,zoom:zoomValue};
      lastTap = null;
    }
    function resizePreview(done, dx, dy) {
      const item = done.placement, angle = (item.rotation || 0)*Math.PI/180;
      const localX = (Math.cos(angle)*dx + Math.sin(angle)*dy)/done.zoom;
      const localY = (-Math.sin(angle)*dx + Math.cos(angle)*dy)/done.zoom;
      const raw = done.direction === 'e' ? 1+localX/(item.width/2) : done.direction === 'w' ? 1-localX/(item.width/2) : done.direction === 's' ? 1+localY/(item.height/2) : 1-localY/(item.height/2);
      const scale = clamp(raw, done.minScale, done.maxScale);
      done.width = item.width*scale; done.height = item.height*scale;
      sizePreview = new Map(done.targets.map(target => [target.id,{width:done.width,height:done.height}]));
      drawOverlay();
    }
    function activateTap(done, event) {
      if (!done.id || state?.stencils?.[findPlacement(done.id)?.stencilId]?.kind !== 'card' || done.moved || performance.now() <= suppressClickUntil) { lastTap = null; return; }
      const now = performance.now(), type = event.pointerType || 'mouse';
      if(type==='touch'&&options.touchTapOpens){lastTap=null;safeCallback('onActivate',{id:done.id});return;}
      if (lastTap && lastTap.id === done.id && lastTap.page === pageNumber && lastTap.type === type && now-lastTap.time < (type==='touch'?500:380) && Math.hypot(event.clientX-lastTap.x,event.clientY-lastTap.y) < 22) {
        lastTap = null; safeCallback('onActivate',{id:done.id});
      } else lastTap = {id:done.id,page:pageNumber,type,time:now,x:event.clientX,y:event.clientY};
    }
    function pointerDown(event) {
      if(nativeTouchEnabled&&event.isTrusted&&event.pointerType==='touch'&&!event.__nativeTouch)return;
      if (!pdf || destroyed || event.button > 1 || event.target.closest('button,input,select,textarea')) return;
      event.preventDefault(); scroller.focus({preventScroll:true}); capture(event);
      if (event.pointerType === 'touch') {
        if(!touches.size)suppressClickUntil=0;
        touches.set(event.pointerId, {x:event.clientX,y:event.clientY});
        if (touches.size >= 2) {
          const [a,b] = [...touches.values()], middle = {clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2};
          interaction = null; sizePreview = null; lastTap = null; drawOverlay(); pinch = {distance:Math.hypot(b.x-a.x,b.y-a.y), zoom:zoomValue, anchor:point(middle.clientX,middle.clientY)};
          scroller.dataset.panning = 'true'; return;
        }
      }
      // Browsers can adjust a touch target toward a nearby larger control.
      // Resolve its actual point so a tiny oval's center cannot turn into a
      // resize merely because one of its handles is easier to touch.
      const hitTarget = event.pointerType === 'touch' ? document.elementFromPoint(event.clientX,event.clientY) : event.target;
      const item = hitTarget?.closest('[data-placement-id]'), placement = item && findPlacement(item.dataset.placementId);
      const start = point(event.clientX, event.clientY), common = {pointerId:event.pointerId,start,clientX:event.clientX,clientY:event.clientY,moved:false,scrollLeft:scroller.scrollLeft,scrollTop:scroller.scrollTop};
      if (space || tool === 'pan' || event.button === 1) {
        lastTap = null;
        interaction = {...common,kind:'pan'}; scroller.dataset.panning = 'true'; return;
      }
      if (placement) {
        const handle = hitTarget?.closest('[data-resize-handle]');
        if (handle && !placement.locked && tool !== 'erase') {
          try { beginResize(common,placement,handle.dataset.resizeHandle); }
          catch (error) { safeCallback('onError',error); interaction = {...common,kind:'select'}; }
          return;
        }
        if (tool === 'erase') {
          if (placement.locked) { select([placement.id]); interaction = {...common,kind:'select',items:[]}; }
          else interaction = {...common,kind:'erase',ids:[placement.id]};
          return;
        }
        let next = selected;
        if (event.shiftKey) next = selected.includes(placement.id) ? selected.filter(id=>id!==placement.id) : selected.concat(placement.id);
        else if (!selected.includes(placement.id)) next = [placement.id];
        select(next);
        const items = next.map(findPlacement).filter(candidate=>candidate && candidate.page === pageNumber && !candidate.locked).map(candidate=>({...candidate}));
        interaction = {...common,id:placement.id,kind:['select','place'].includes(tool) && !placement.locked && next.includes(placement.id) ? 'move' : 'select',items};
        return;
      }
      lastTap = null;
      if (event.shiftKey && ['select','place'].includes(tool)) interaction = {...common,kind:'marquee',base:[...selected]};
      else interaction = {...common,kind:'background',place:tool==='place' && start.x>=0 && start.x<=1 && start.y>=0 && start.y<=1};
    }
    function movePreview(items, dx, dy) {
      const meta = currentMeta(); if (!meta || !items.length) return [];
      let minDx = -Infinity, maxDx = Infinity, minDy = -Infinity, maxDy = Infinity;
      for (const item of items) {
        const angle = (item.rotation||0)*Math.PI/180, extX = (Math.abs(Math.cos(angle))*item.width+Math.abs(Math.sin(angle))*item.height)/2/meta.width, extY = (Math.abs(Math.sin(angle))*item.width+Math.abs(Math.cos(angle))*item.height)/2/meta.height;
        minDx = Math.max(minDx,extX-item.x); maxDx = Math.min(maxDx,1-extX-item.x); minDy = Math.max(minDy,extY-item.y); maxDy = Math.min(maxDy,1-extY-item.y);
      }
      dx = clamp(dx,minDx,maxDx); dy = clamp(dy,minDy,maxDy);
      const updates = items.map(item=>({id:item.id,x:item.x+dx,y:item.y+dy}));
      for (const update of updates) {
        const original = items.find(item=>item.id===update.id), element = [...overlay.querySelectorAll('[data-placement-id]')].find(node=>node.dataset.placementId===update.id);
        element?.setAttribute('transform',`translate(${update.x*meta.width} ${update.y*meta.height}) rotate(${original.rotation||0})`);
      }
      return updates;
    }
    function pointerMove(event) {
      if(nativeTouchEnabled&&event.isTrusted&&event.pointerType==='touch'&&!event.__nativeTouch)return;
      if (touches.has(event.pointerId)) touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if (pinch && touches.size >= 2) {
        event.preventDefault(); const [a,b]=[...touches.values()],distance=Math.hypot(b.x-a.x,b.y-a.y),middle={clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2};
        if (pinch.distance>0) setZoom(pinch.zoom*distance/pinch.distance,middle,pinch.anchor); return;
      }
      if (!interaction || interaction.pointerId !== event.pointerId) return;
      event.preventDefault(); const dx=event.clientX-interaction.clientX,dy=event.clientY-interaction.clientY;
      if (Math.hypot(dx,dy)>4) interaction.moved=true;
      if (interaction.kind === 'pan') { scroller.scrollLeft=interaction.scrollLeft-dx;scroller.scrollTop=interaction.scrollTop-dy;return; }
      if (!interaction.moved) return;
      if (interaction.kind === 'background') { scroller.dataset.panning='true';scroller.scrollLeft=interaction.scrollLeft-dx;scroller.scrollTop=interaction.scrollTop-dy;return; }
      if (interaction.kind === 'resize') { resizePreview(interaction,dx,dy); return; }
      const at=point(event.clientX,event.clientY,true);
      if (interaction.kind === 'move') interaction.updates=movePreview(interaction.items,at.x-interaction.start.x,at.y-interaction.start.y);
      if (interaction.kind === 'marquee') {
        const meta=currentMeta(),x=Math.min(at.x,interaction.start.x),y=Math.min(at.y,interaction.start.y),w=Math.abs(at.x-interaction.start.x),h=Math.abs(at.y-interaction.start.y);
        interaction.rect={x,y,w,h};let rectangle=overlay.querySelector('.p2-canvas-marquee');if(!rectangle){rectangle=document.createElementNS(SVG,'rect');rectangle.classList.add('p2-canvas-marquee');overlay.append(rectangle);}for(const [name,value]of Object.entries({x:x*meta.width,y:y*meta.height,width:w*meta.width,height:h*meta.height}))rectangle.setAttribute(name,value);
      }
    }
    function pointerUp(event) {
      if(nativeTouchEnabled&&event.isTrusted&&event.pointerType==='touch'&&!event.__nativeTouch)return;
      touches.delete(event.pointerId);
      if (pinch) { if(touches.size<2){pinch=null;interaction=null;scroller.dataset.panning='false';suppressClickUntil=performance.now()+350;}release(event);flushOverlay();return; }
      if (!interaction || interaction.pointerId!==event.pointerId) { release(event);flushOverlay();return; }
      const done=interaction;interaction=null;scroller.dataset.panning='false';sizePreview=null;
      // Releasing capture can synchronously emit lostpointercapture in Safari.
      // The completed gesture is already detached from mutable interaction.
      release(event);
      const at=point(event.clientX,event.clientY);
      if (done.kind==='move'&&done.moved&&done.updates?.length){drawOverlay();safeCallback('onMove',done.updates);}
      else if(done.kind==='resize'&&done.moved&&finite(done.width)&&finite(done.height)){drawOverlay();safeCallback('onResize',{id:done.placement.id,width:done.width,height:done.height,scope:done.scope});}
      else if(done.kind==='background'&&!done.moved&&performance.now()>suppressClickUntil){
        if(done.place&&stencilId&&at.x>=0&&at.x<=1&&at.y>=0&&at.y<=1)safeCallback('onPlace',{page:pageNumber,stencilId,x:at.x,y:at.y});
        else if(tool==='select')select([]);
      }
      else if(done.kind==='erase'&&!done.moved)notifyErase(done.ids);
      else if(done.kind==='marquee'){
        const r=done.rect,inside=r?currentPlacements().filter(item=>item.x>=r.x&&item.x<=r.x+r.w&&item.y>=r.y&&item.y<=r.y+r.h).map(item=>item.id):[];
        select([...new Set(done.base.concat(inside))]);
      }
      if (['move','select'].includes(done.kind)) activateTap(done,event); else lastTap=null;
      drawOverlay();
    }
    function onCancel(event) { if(nativeTouchEnabled&&event.isTrusted&&event.pointerType==='touch'&&!event.__nativeTouch)return;cancelGesture();release(event); }
    function touchPointer(touch,event){
      return {__nativeTouch:true,isTrusted:event.isTrusted,pointerType:'touch',pointerId:'touch-'+touch.identifier,button:0,shiftKey:false,clientX:touch.clientX,clientY:touch.clientY,target:document.elementFromPoint(touch.clientX,touch.clientY)||event.target,preventDefault:()=>{if(event.cancelable)event.preventDefault();}};
    }
    function nativeStart(event){
      if(!pdf||destroyed||(!nativeTouchIds.size&&!scroller.contains(event.target)))return;
      if(event.cancelable)event.preventDefault();
      for(const touch of event.changedTouches){nativeTouchIds.add(touch.identifier);pointerDown(touchPointer(touch,event));}
    }
    function nativeMove(event){
      if(!nativeTouchIds.size)return;
      const changed=[...event.changedTouches].filter(touch=>nativeTouchIds.has(touch.identifier));if(!changed.length)return;
      if(event.cancelable)event.preventDefault();
      // A touch frame can move both fingers. Update both before calculating
      // its midpoint/distance, avoiding a jump from a half-updated pinch.
      for(const touch of changed)touches.set('touch-'+touch.identifier,{x:touch.clientX,y:touch.clientY});
      if(pinch)pointerMove(touchPointer(changed[0],event));
      else for(const touch of changed)pointerMove(touchPointer(touch,event));
    }
    function nativeEnd(event){
      const changed=[...event.changedTouches].filter(touch=>nativeTouchIds.has(touch.identifier));if(!changed.length)return;
      if(event.cancelable)event.preventDefault();
      for(const touch of changed){nativeTouchIds.delete(touch.identifier);pointerUp(touchPointer(touch,event));}
      flushOverlay();
    }
    if(nativeTouchEnabled){
      listen(root,'touchstart',nativeStart,{capture:true,passive:false});
      listen(root,'touchmove',nativeMove,{capture:true,passive:false});
      listen(root,'touchend',nativeEnd,{capture:true,passive:false});
      listen(root,'touchcancel',event=>{if(nativeTouchIds.size){if(event.cancelable)event.preventDefault();cancelGesture();}},{capture:true,passive:false});
      listen(scroller,'gesturestart',event=>{if(event.cancelable)event.preventDefault();},{passive:false});
      listen(scroller,'gesturechange',event=>{if(event.cancelable)event.preventDefault();},{passive:false});
    }
    listen(scroller,'pointerdown',pointerDown);
    listen(scroller,'pointermove',pointerMove);
    listen(scroller,'pointerup',pointerUp);
    listen(scroller,'pointercancel',onCancel);
    listen(scroller,'lostpointercapture',event=>{if(interaction?.pointerId===event.pointerId||touches.has(event.pointerId))cancelGesture();});
    listen(scroller,'wheel',event=>{
      if(!pdf||event.target.closest('input,textarea,select'))return;event.preventDefault();const unit=event.deltaMode===1?16:event.deltaMode===2?scroller.clientHeight:1;
      const multiplier=Math.exp(-event.deltaY*unit*(event.ctrlKey?.008:.002));setZoom(zoomValue*multiplier,{clientX:event.clientX,clientY:event.clientY});
    },{passive:false});
    listen(scroller,'contextmenu',event=>{
      if(!pdf || destroyed)return;
      event.preventDefault();cancelGesture();lastTap=null;
      const node=event.target.closest('[data-placement-id]'),placement=node&&findPlacement(node.dataset.placementId),at=point(event.clientX,event.clientY);
      if(placement){if(!selected.includes(placement.id))select([placement.id],false);}
      else select([],false);
      safeCallback('onContext',{ids:placement?[...selected]:[],clientX:event.clientX,clientY:event.clientY,page:pageNumber,x:at.x,y:at.y});
    });
    listen(scroller,'dragover',event=>{if(pdf){event.preventDefault();event.dataTransfer.dropEffect='copy';}});
    listen(scroller,'drop',event=>{
      if(!pdf)return;event.preventDefault();
      const raw=event.dataTransfer.getData('application/x-tillsyno-stencil')||event.dataTransfer.getData('text/plain');let id=raw;
      try{const parsed=JSON.parse(raw);if(typeof parsed==='string')id=parsed;else if(parsed?.stencilId)id=parsed.stencilId;else if(parsed?.id)id=parsed.id;}catch(_){}
      if(!state?.stencils?.[id])return;
      const at=point(event.clientX,event.clientY);if(at.x<0||at.x>1||at.y<0||at.y>1)return;
      safeCallback('onPlace',{page:pageNumber,stencilId:id,x:at.x,y:at.y});
    });
    listen(scroller,'keydown',event=>{
      if(event.target.closest('input,textarea,select'))return;
      if(event.code==='Space'){space=true;event.preventDefault();scroller.dataset.panning='true';}
      if(event.key==='Escape')cancelGesture();
      const target=event.target.closest('[data-placement-id]');
      const handle=event.target.closest('[data-resize-handle]');
      if(handle&&target&&['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(event.key)){
        event.preventDefault();event.stopPropagation();
        const placement=findPlacement(target.dataset.placementId);
        try{
          beginResize({},placement,handle.dataset.resizeHandle);
          const done=interaction,step=(event.shiftKey?10:1)*(['ArrowUp','ArrowRight'].includes(event.key)?1:-1),scale=(placement.width+step)/placement.width;
          const localX=['e','w'].includes(done.direction)?(scale-1)*placement.width/2*zoomValue*(done.direction==='w'?-1:1):0;
          const localY=['n','s'].includes(done.direction)?(scale-1)*placement.height/2*zoomValue*(done.direction==='n'?-1:1):0;
          const angle=(placement.rotation||0)*Math.PI/180,dx=Math.cos(angle)*localX-Math.sin(angle)*localY,dy=Math.sin(angle)*localX+Math.cos(angle)*localY;
          resizePreview(done,dx,dy);resetInteraction();safeCallback('onResize',{id:placement.id,width:done.width,height:done.height,scope:done.scope});
        }catch(error){resetInteraction();safeCallback('onError',error);}
        return;
      }
      if(target&&!handle&&event.key==='Enter'){event.preventDefault();const id=target.dataset.placementId,card=state?.stencils?.[findPlacement(id)?.stencilId]?.kind==='card';select([id],!card);if(card)safeCallback('onActivate',{id});}
    });
    listen(root,'keyup',event=>{if(event.code==='Space'){space=false;if(!interaction)scroller.dataset.panning='false';}});
    listen(root,'blur',()=>{space=false;cancelGesture();});
    listen(document,'visibilitychange',()=>{if(document.hidden){space=false;cancelGesture();}});
    const observer=new ResizeObserver(()=>{
      if(!pdf)return;
      if(!scroller.clientWidth||!scroller.clientHeight){if(interaction||touches.size||pinch)cancelGesture();return;}
      if(autoFit)fit();else{const bounds=scroller.getBoundingClientRect(),at={clientX:bounds.left+bounds.width/2,clientY:bounds.top+bounds.height/2},center=point(at.clientX,at.clientY);layout();setZoom(zoomValue,at,center,false);}
    });observer.observe(scroller);

    async function open(bytes) {
      if(destroyed)throw Error('Ritningsytan är stängd.');
      const token=++openToken,input=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||0);
      if(!input.byteLength){cancelRender();cancelGesture();const previous=pdf;pdf=null;metadata=[];state=null;selected=[];sheet.hidden=true;overlay.innerHTML='';stage.style.width='100%';stage.style.height='100%';say('Öppna en PDF-ritning för att börja.');if(previous)void previous.destroy();emitView();return{pages:[]};}
      if(input.byteLength>50*1024*1024)throw Error('Ritningen får vara högst 50 MB.');
      const engine=root.pdfjsLib;if(!engine)throw Error('PDF-visningen kunde inte laddas. Öppna sidan igen.');
      engine.GlobalWorkerOptions.workerSrc=new URL('vendor/pdf.worker.min.js',document.baseURI).href;
      const loading=engine.getDocument({data:input.slice(),isEvalSupported:false});let candidate;
      say('Öppnar ritningen …');
      try{
        candidate=await loading.promise;
        if(candidate.numPages>200)throw Error('Ritningen får innehålla högst 200 sidor.');
        const pages=[];
        for(let n=1;n<=candidate.numPages;n++){
          const page=await candidate.getPage(n),viewport=page.getViewport({scale:1});
          if(!finite(viewport.width)||!finite(viewport.height)||viewport.width<=0||viewport.height<=0||viewport.width>50000||viewport.height>50000)throw Error('En ritningssida har en storlek som inte stöds.');
          pages.push({width:viewport.width,height:viewport.height,rotation:page.rotate,view:[...page.view],transform:[...viewport.transform]});
          if(token!==openToken||destroyed)throw Error('PDF-öppningen avbröts.');
        }
        cancelRender();cancelGesture();const previous=pdf;pdf=candidate;candidate=null;metadata=pages;state=null;selected=[];pageNumber=1;zoomValue=1;autoFit=true;sheet.hidden=false;
        bitmap.width=1;bitmap.height=1;drawOverlay();fit();await render();
        if(previous)void previous.destroy();
        if(token!==openToken||destroyed)throw Error('PDF-öppningen avbröts.');
        safeCallback('onChangePage',pageNumber);emitView();return{pages:pages.map(page=>({...page,view:[...page.view],transform:[...page.transform]}))};
      }catch(error){
        if(candidate)try{await candidate.destroy();}catch(_){}
        if(token===openToken&&!destroyed)say(pdf?'':'PDF:en kunde inte öppnas. Välj en annan fil.');
        if(error?.name==='PasswordException')throw Error('PDF:en är lösenordsskyddad. Välj en olåst PDF-kopia.');
        if(error?.name==='InvalidPDFException')throw Error('Filen gick inte att läsa som en PDF. Välj en annan ritning.');
        throw error;
      }
    }
    async function page(number) {
      if(!pdf)return;
      const next=Math.trunc(Number(number));if(!Number.isFinite(next)||next<1||next>metadata.length)throw Error('Välj ett sidnummer mellan 1 och '+metadata.length+'.');
      if(next===pageNumber){if(rendering)await render();return;}
      cancelRender();cancelGesture();pageNumber=next;bitmap.width=1;bitmap.height=1;drawOverlay();say('Visar sida '+next+' …');
      if(autoFit)fit();else layout();safeCallback('onChangePage',next);emitView();await render();
    }
    async function focusPlacement(id) {
      const item=findPlacement(id);if(!item)return;
      if(item.page!==pageNumber)await page(item.page);select([id]);
      const bounds=scroller.getBoundingClientRect(),meta=currentMeta();
      if(zoomValue<.7)setZoom(Math.min(2,Math.max(.7,zoomValue)),{clientX:bounds.left+bounds.width/2,clientY:bounds.top+bounds.height/2},{x:item.x,y:item.y});
      else{scroller.scrollLeft=boardLeft+item.x*meta.width*zoomValue-bounds.width/2;scroller.scrollTop=boardTop+item.y*meta.height*zoomValue-bounds.height/2;}
      [...overlay.querySelectorAll('[data-placement-id]')].find(node=>node.dataset.placementId===id)?.focus({preventScroll:true});
    }
    return Object.freeze({
      open,
      setProject(next,settings={}){state=next;if(settings.selectedIds)selected=[...settings.selectedIds];selected=selected.filter(id=>!!findPlacement(id));drawOverlay();},
      setSelection(ids){select(ids||[],false);},
      setTool(value){if(!['select','pan','place','erase'].includes(value))throw Error('Välj ett giltigt ritningsverktyg.');cancelGesture();suppressClickUntil=0;tool=value;scroller.dataset.tool=value;},
      cancelInteraction(){cancelGesture();},
      cancelGesture(){cancelGesture();},
      setStencil(id){if(id!==stencilId)suppressClickUntil=0;stencilId=id;},
      setVisible(value){shown=!!value;overlay.style.visibility=shown?'visible':'hidden';},
      page,
      zoom(factor,anchor){if(!finite(factor)||factor<=0)return;setZoom(zoomValue*factor,anchor);},
      zoomTo(value,anchor){setZoom(Number(value),anchor);},
      fit,
      focusPlacement,
      snapshot(){return{page:metadata.length?pageNumber:0,total:metadata.length,zoom:zoomValue,tool,stencilId,selectedIds:[...selected],rendering,shown,board:{left:boardLeft,top:boardTop,width:currentMeta()?.width*zoomValue||0,height:currentMeta()?.height*zoomValue||0},scroll:{left:scroller.scrollLeft,top:scroller.scrollTop}};},
      destroy(){destroyed=true;openToken++;cancelRender();abort.abort();observer.disconnect();touches.clear();nativeTouchIds.clear();if(pdf)void pdf.destroy();pdf=null;host.replaceChildren();}
    });
  }
  root.Proj2Canvas=Object.freeze({create,MIN_ZOOM,MAX_ZOOM,MAX_PIXELS});
})(typeof window==='object'?window:globalThis);
