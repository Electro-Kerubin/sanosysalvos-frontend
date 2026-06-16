const PWA_ENABLED = typeof window !== 'undefined' && 'serviceWorker' in navigator;

export async function registerServiceWorker() {
  if (!PWA_ENABLED) {
    console.info('[PWA] Service Workers no disponibles en este entorno');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.info('[PWA] Service Worker registrado exitosamente');

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.info('[PWA] Nueva versión de app disponible');
          window.dispatchEvent(new Event('pwa-update-available'));
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Error registrando Service Worker:', error);
  }
}

export function isInstalledAsApp() {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    document.referrer.includes('android-app:
  );
}

export function canInstallPWA() {
  return (
    typeof window !== 'undefined' &&
    'BeforeInstallPromptEvent' in window &&
    !isInstalledAsApp()
  );
}

export async function promptInstallPWA(event) {
  if (!event) {
    console.warn('[PWA] beforeinstallprompt event no disponible');
    return null;
  }

  event.prompt();
  const { outcome } = await event.userChoice;

  console.info(`[PWA] Usuario eligió: ${outcome}`);
  return { outcome };
}

export async function checkAndUpdateSW() {
  if (!PWA_ENABLED) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      console.info('[PWA] No hay Service Worker registrado');
      return false;
    }

    await registration.update();

    if (registration.waiting) {
      console.info('[PWA] Actualización disponible');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('[PWA] Error verificando actualizaciones:', error);
    return false;
  }
}

export async function getSWRegistration() {
  if (!PWA_ENABLED) return null;

  try {
    return await navigator.serviceWorker.getRegistration();
  } catch (error) {
    console.error('[PWA] Error obteniendo SW registration:', error);
    return null;
  }
}

export async function clearAllCache() {
  if (!('caches' in window)) {
    console.warn('[PWA] Caches API no disponible');
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));

    console.info('[PWA] Todo el cache ha sido borrado');
    return true;
  } catch (error) {
    console.error('[PWA] Error limpiando cache:', error);
    return false;
  }
}
