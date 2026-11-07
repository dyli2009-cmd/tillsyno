/* Shared project presentation. Move existing cards without replacing fields or data handlers. */
(() => {
  'use strict';

  function start() {
    if (document.documentElement.dataset.controlflowUi !== '1' ||
        !document.body.classList.contains('allInOneApp')) return;

    const project = document.getElementById('securityProject');
    if (!project || project.dataset.controlflowProject === '1') return;
    const sections = Array.from(project.children).find(node => node.classList.contains('projectSections'));
    if (!sections) return;

    const columns = Array.from(sections.children).filter(node => node.classList.contains('revisionProjectColumn'));
    if (!columns.length) {
      const cardFor = id => {
        const card = document.getElementById(id)?.closest('.projectCard');
        return card?.parentElement === sections ? card : null;
      };
      const service = cardFor('secCompany');
      const technician = cardFor('secTechnician');
      const newService = cardFor('secNewServiceBtn');
      const facility = cardFor('secProjectName');
      const customer = cardFor('secCustomer');
      const cards = [service, technician, newService, facility, customer];
      if (cards.some(card => !card) || new Set(cards).size !== cards.length) return;

      function column(id, title, description, contents) {
        const section = document.createElement('section');
        section.className = 'revisionProjectColumn';
        section.setAttribute('aria-labelledby', id);
        const heading = document.createElement('div');
        heading.className = 'revisionColumnHead';
        const label = document.createElement('h2');
        label.id = id;
        label.textContent = title;
        const detail = document.createElement('p');
        detail.textContent = description;
        heading.append(label, detail);
        section.append(heading, ...contents);
        return section;
      }

      sections.append(
        column('revisionServiceTitle', 'Service', 'Utförare, signatur och logotyp', [service, technician, newService]),
        column('revisionProjectTitle', 'Projekt', 'Anläggning, jobb och beställare', [facility, customer])
      );
    }

    project.classList.add('revisionProjectLayout');
    sections.classList.add('revisionProjectColumns');
    project.dataset.controlflowProject = '1';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
