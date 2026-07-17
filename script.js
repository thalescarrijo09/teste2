/**
 * Bruno Dib | Quiropraxia - Scripts Principais
 * Arquitetura em Vanilla JavaScript sem dependências externas.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initAccordion();
  initDynamicYear();
});

/**
 * Controle de Menu Mobile com acessibilidade WAI-ARIA
 */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = navMenu.querySelectorAll('.nav-link, .nav-cta');

  if (!toggleBtn || !navMenu) return;

  const toggleMenu = () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', !isExpanded);
    navMenu.classList.toggle('is-open');

    // Animação simples do ícone hamburger
    const hamburger = toggleBtn.querySelector('.hamburger');
    if (hamburger) {
      hamburger.style.backgroundColor = isExpanded ? '' : 'transparent';
    }
  };

  toggleBtn.addEventListener('click', toggleMenu);

  // Fecha o menu ao clicar em qualquer link interno
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navMenu.classList.contains('is-open')) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('is-open');
        const hamburger = toggleBtn.querySelector('.hamburger');
        if (hamburger) hamburger.style.backgroundColor = '';
      }
    });
  });

  // Fecha o menu com a tecla ESC
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navMenu.classList.contains('is-open')) {
      toggleBtn.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('is-open');
      toggleBtn.focus();
    }
  });
}

/**
 * Acordeão de Perguntas Frequentes (FAQ)
 * Mantém apenas um painel aberto por vez e gerencia o atributo 'hidden'.
 */
function initAccordion() {
  const triggers = document.querySelectorAll('.accordion-trigger');

  if (!triggers.length) return;

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const targetId = trigger.getAttribute('aria-controls');
      const targetPanel = document.getElementById(targetId);
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

      // Opcional: Fecha todos os outros itens antes de abrir o atual
      triggers.forEach(otherTrigger => {
        if (otherTrigger !== trigger) {
          otherTrigger.setAttribute('aria-expanded', 'false');
          const otherId = otherTrigger.getAttribute('aria-controls');
          const otherPanel = document.getElementById(otherId);
          if (otherPanel) otherPanel.setAttribute('hidden', '');
        }
      });

      // Alterna o estado do item atual
      if (isExpanded) {
        trigger.setAttribute('aria-expanded', 'false');
        targetPanel.setAttribute('hidden', '');
      } else {
        trigger.setAttribute('aria-expanded', 'true');
        targetPanel.removeAttribute('hidden');
      }
    });
  });
}

/**
 * Atualização Dinâmica do Ano no Rodapé
 * Evita o envelhecimento visual da landing page na virada de ano.
 */
function initDynamicYear() {
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}
