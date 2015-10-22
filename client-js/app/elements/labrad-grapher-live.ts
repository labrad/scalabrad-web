@component('labrad-grapher-live')
export class LabradGrapherLive extends polymer.Base {
  @property({type: Array})
  plots: Array<HTMLElement> = [];

  @property({type: Array})
  path: Array<string>;

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

@component('labrad-labeled-plot')
export class LabeledPlot extends polymer.Base {
  @property({type: String, value: ''})
  name: string;

  @property({type: String, value: ''})
  url: string;
}
