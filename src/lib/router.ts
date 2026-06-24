export function navigate(path: string): void {
  if (location.pathname + location.search === path) return;
  history.pushState({}, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
}
