import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

@customElement('labrad-grapher-live')
export class LabradGrapherLive extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <style>
        :host {
          display: block;
          height: 100%;
        }
        #plots {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
      </style>
      <div id="plots"></div>
    `;
  }

  @property({type: Array, value: () => []})
  plots: HTMLElement[];

  @property({type: Array})
  path: string[];

  addPlot(plot: HTMLElement): void {
    var plots = this.$.plots;
    if (plots.firstChild) {
      plots.insertBefore(plot, plots.firstChild);
    } else {
      plots.appendChild(plot);
    }
  }

  removePlot(plot: HTMLElement): void {
    this.$.plots.removeChild(plot);
  }

  removeLastPlot(): void {
    var plots = this.$.plots;
    plots.removeChild(plots.lastChild);
  }
}

@customElement('labrad-labeled-plot')
export class LabeledPlot extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <style>
        :host {
          width: 100%;
          height: 100%;
          display: flex;
          flex: 1;
          flex-direction: column;
          min-height: 450px;
        }
        #plot {
          min-height: 400px;
          height: 100%;
          display: flex;
          flex: 1;
        }
      </style>
      <a is="app-link" path="{{url}}" href="{{url}}">{{name}}</a>
      <div id="plot"></div>
    `;
  }

  @property({type: String, value: ''})
  name: string;

  @property({type: String, value: ''})
  url: string;
}
