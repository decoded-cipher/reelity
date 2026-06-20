interface TurnstileApi {
  render: (el: string | HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoad?: () => void;
  }
}

const SITEKEY = import.meta.env.DEV ? "1x00000000000000000000AA" : "0x4AAAAAADoFk2CcklITJMqb";

let widgetId: string | undefined;
let token: string | null = null;
let waiters: ((t: string) => void)[] = [];

function resolveAll(t: string) {
  token = t || null;
  waiters.splice(0).forEach((w) => w(t));
}

export function initTurnstile(container: HTMLElement): void {
  const render = () => {
    if (!window.turnstile || widgetId !== undefined) return;
    widgetId = window.turnstile.render(container, {
      sitekey: SITEKEY,
      appearance: "interaction-only",
      callback: (t: string) => resolveAll(t),
      "error-callback": () => resolveAll(""),
      "expired-callback": () => {
        token = null;
        if (widgetId) window.turnstile?.reset(widgetId);
      },
    });
  };
  if (window.turnstile) render();
  else window.onTurnstileLoad = render;
}

// One token per call (Turnstile tokens are single-use); pre-fetches the next.
export function getTurnstileToken(timeoutMs = 12000): Promise<string> {
  if (!window.turnstile || widgetId === undefined) return Promise.resolve("");
  if (token) {
    const t = token;
    token = null;
    window.turnstile.reset(widgetId);
    return Promise.resolve(t);
  }
  return new Promise((resolve) => {
    const done = (t: string) => {
      clearTimeout(timer);
      resolve(t);
    };
    const timer = setTimeout(() => {
      waiters = waiters.filter((w) => w !== done);
      resolve("");
    }, timeoutMs);
    waiters.push(done);
  });
}
