import {PolymerElement} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

const MOUSE_MAIN_BUTTON = 0;

@customElement('app-link')
// @extend('a')  // TODO: https://polymer-library.polymer-project.org/3.0/docs/devguide/custom-elements#extending-elements
export class AppLink extends PolymerElement {

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
    if (this.isSpecialClick(e)) return;

    e.preventDefault();
    e.stopPropagation();
  }
}
