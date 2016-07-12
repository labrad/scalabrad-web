const MOUSE_MAIN_BUTTON = 0;

@component('app-link')
@extend('a')
export class AppLink extends polymer.Base {

  @property({type: Array})
  path: string[];

  isSpecialClick(e): boolean {
    return (e.ctrlKey || e.metaKey || e.button !== MOUSE_MAIN_BUTTON);
  }

  @listen('click')
  onClick(e) {
    if (this.isSpecialClick(e)) return;

    this.fire('app-link-click', {path: this.path});
    e.preventDefault();
    e.stopPropagation();
  }

  @listen('tap')
  onTap(e) {
    if (this.isSpecialClick(e)) { return; }

    e.preventDefault();
    e.stopPropagation();
  }
}
