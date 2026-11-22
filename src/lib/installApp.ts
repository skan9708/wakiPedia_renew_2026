type InstallChoice = { outcome: 'accepted' | 'dismissed' };

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

let pendingPrompt: InstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingPrompt = event as InstallPromptEvent;
    window.dispatchEvent(new Event('waki-install-available'));
  });
  window.addEventListener('appinstalled', () => {
    pendingPrompt = null;
    window.dispatchEvent(new Event('waki-app-installed'));
  });
}

export function canPromptInstall() {
  return pendingPrompt !== null;
}

export function isAppInstalled() {
  if (typeof window === 'undefined') return false;
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || iosNavigator.standalone === true;
}

export async function promptInstall(): Promise<InstallChoice['outcome'] | null> {
  const prompt = pendingPrompt;
  if (!prompt) return null;
  pendingPrompt = null;
  await prompt.prompt();
  return (await prompt.userChoice).outcome;
}
