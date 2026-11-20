import { prefersReducedMotion } from '../dom';

/**
 * Abre un <dialog> como modal (el navegador gestiona el foco y la tecla Esc).
 * Cierra al tocar el fondo y anima la salida.
 */
export function setupDialog(dialog: HTMLDialogElement, onClose?: () => void) {
  let lastFocus: HTMLElement | null = null;

  dialog.addEventListener('click', (e) => {
    // Un clic directamente sobre el <dialog> (no su contenido) es un clic en el fondo.
    if (e.target === dialog) close();
  });
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });

  function open() {
    if (dialog.open) return;
    lastFocus = document.activeElement as HTMLElement | null;
    dialog.classList.remove('is-closing');
    dialog.showModal();
  }

  function close() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    const finish = () => {
      dialog.classList.remove('is-closing');
      dialog.close();
      onClose?.();
      lastFocus?.focus?.({ preventScroll: true });
    };
    if (prefersReducedMotion()) return finish();
    dialog.classList.add('is-closing');
    setTimeout(finish, 220);
  }

  return { open, close, isOpen: () => dialog.open };
}
