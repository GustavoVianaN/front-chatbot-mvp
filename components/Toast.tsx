'use client';

const TOAST_CONTAINER_ID = 'app-toast-container';

function ensureContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.position = 'fixed';
    container.style.right = '1rem';
    container.style.bottom = '1rem';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '0.75rem';
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message: string) {
  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.padding = '1rem 1.25rem';
  toast.style.borderRadius = '1rem';
  toast.style.background = 'rgba(15, 23, 42, 0.95)';
  toast.style.color = '#e2e8f0';
  toast.style.boxShadow = '0 18px 50px rgba(0,0,0,0.35)';
  toast.style.maxWidth = '320px';
  toast.style.fontSize = '0.95rem';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
  toast.style.transform = 'translateY(10px)';
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    window.setTimeout(() => toast.remove(), 200);
  }, 3200);
}
