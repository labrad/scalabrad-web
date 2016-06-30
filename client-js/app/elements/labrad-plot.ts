import 'd3';

import {viridisData} from '../scripts/colormaps';
import * as datavault from "../scripts/datavault";


/**
 * Colors for traces in 1D plots.
 */
const COLOR_LIST = [
  '#0000ff',
  '#ff0000',
  '#00cc00',
  '#dddd00',
  '#dd00dd',
  '#0088dd'
];


/**
 * Colors for 2D plots, using viridis colormap from matplotlib.
 */
const COLOR_MAP = viridisData.map((rgb) => {
  const [r, g, b] = rgb;
  return d3.rgb(255 * r, 255 * g, 255 * b);
});


@component('labrad-plot')
export class Plot extends polymer.Base {

  @property({type: String, value: ''})
  xLabel: string;

  @property({type: String, value: ''})
  yLabel: string;

  @property({type: Number, value: 0})
  numIndeps: number;

  @property({type: String, value: ''})
  currPos: string;

  @property({type: String, value: 'dots'})
  drawMode2D: string;

  @property({type: String, value: 'zoomRect'})
  mouseMode: string;

  @property({type: Array})
  deps: Array<{label: string, legend: string, unit: string}>;

  private data: Array<Array<number>> = []
  private lastData: Array<number> = null;

  private numTraces: number = 0;
  private svg: any;
  private chartBody: any;
  private clip: any;
  private width: number;
  private height: number;
  private xAxis: any;
  private yAxis: any;
  private zAxis: any;
  private xScale: any;
  private yScale: any;
  private zScale: any;
  private line: any;
  private zoom: any;
  private limits = {
    xMin: 0,
    xMax: 1,
    yMin: 0,
    yMax: 1
  };
  private dataLimits = {
    xMin: NaN,
    xMax: NaN,
    yMin: NaN,
    yMax: NaN,
    zMin: NaN,
    zMax: NaN
  };
  private margin = {
    top: 50,
    right: 10,
    bottom: 50,
    left: 40
  };

  // Hack to enforce user defined display of traces.
  private userTraces: boolean = false;

  private xs: Array<number> = [];
  private ys: Array<number> = [];
  private xNext: {[x: number]: number} = {};
  private yNext: {[y: number]: number} = {};
  private dx: number = 1;
  private dy: number = 1;
  private x0: number = null;
  private y0: number = null;
  private dx0: number = -1;
  private dy0: number = -1;
  private displayTraces: Array<number>;
  private allOrNone: boolean = true;
  private is1D: boolean;
  private is2D: boolean;
  private displaySurface: number = 2;


  /**
   * Redraw the plot and attach resize to the window resize event.
   * Fires when the component is attached to the DOM.
   */
  public attached() {
    this.redraw_();
    window.addEventListener('resize', (event) => this.redraw_());
  }


  /**
   * Add new data to the plot and re-zoom.
   * Fires when new data arrives via the socket.
   */
  public addData(data: Array<Array<number>>) {
    if (data.length === 0) return;
    const lastData = (this.data.length > 0) ?
        this.data[this.data.length - 1] : null;
    for (let row of data) {
      this.splice('data', this.data.length, 0, row);
    }
    this.plotData_(data, lastData);
  }


  private createPlot_(
      area: HTMLElement, totWidth: number, totHeight: number): void {
    const p = this;

    if (p.numIndeps == 1) {
      p.margin.right = 10;
    }

    const width = totWidth - p.margin.left - p.margin.right;
    const height = totHeight - p.margin.top - p.margin.bottom;

    p.width = width;
    p.height = height;

    p.xScale = d3.scale.linear()
            .domain([p.limits.xMin, p.limits.xMax])
            .range([0, width]);

    p.yScale = d3.scale.linear()
            .domain([p.limits.yMin, p.limits.yMax])
            .range([height, 0]);

    p.zScale = d3.scale.linear()
            .domain([0, 1])
            .range([height, 0]);

    p.xAxis = d3.svg.axis()
            .scale(p.xScale)
            .tickSize(-height);

    p.yAxis = d3.svg.axis()
            .scale(p.yScale)
            .orient('left')
            .ticks(5)
            .tickSize(-width);

    p.line = d3.svg.line()
            .x((d) => p.xScale(d[0]))
            .y((d) => p.yScale(d[1]));

    p.zoom = d3.behavior.zoom()
            .x(p.xScale)
            .y(p.yScale)
            .on('zoom', () => this.handleZoom_());

    // Plot area.
    p.svg = d3.select(area)
            .append('svg')
            .attr('width', width + p.margin.left + p.margin.right)
            .attr('height', height + p. margin.top + p.margin.bottom)

    p.svg = p.svg
            .append('g')
            .attr('transform', `translate(${p.margin.left}, ${p.margin.top})`);

    // Background rectangle.
    p.svg.append('rect')
            .classed('background', true)
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('width', width)
            .attr('height', height)
            .style('fill', '#222222');

    // X-axis ticks and label.
    p.svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0, ${height})`)
            .call(p.xAxis);
    p.svg.append('text')
            .attr('id', 'x-label')
            .attr('transform',
                  `translate(${width / 2}, ${height + p.margin.bottom - 10})`)
            .style('text-anchor', 'middle')
            .text(this.xLabel);

    // Y-axis ticks and label.
    p.svg.append('g')
            .attr('class', 'y axis')
            .call(p.yAxis);
    p.svg.append('text')
            .attr('id', 'y-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - p.margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text(this.yLabel);

    // Draw the graph object (from http://jsfiddle.net/KSAbK/)
    // This keeps the data from exceeding the limits of the plot.
    p.chartBody = p.svg.append('g')
            .attr('clip-path', 'url(#clip)');
    p.clip = p.svg.append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', width)
            .attr('height', height);


    // Color Bar Axis
    if (this.numIndeps == 2) {
      p.zAxis = d3.svg.axis()
              .scale(p.zScale)
              .orient('right')
              .ticks(7)
              .tickSize(5);

      p.svg.append('defs').append("linearGradient")
          .attr("id", "grads")
          .attr("x1", "0%")
          .attr("y1", "0%")
          .attr("x2", "0%")
          .attr("y2", "100%")
          .selectAll("stop")
          .data([
            {offset: "0%", color: COLOR_MAP[0]},
            {offset: "50%", color: COLOR_MAP[128]},
            {offset: "100%", color: COLOR_MAP[255]}
          ])
          .enter().append("stop")
          .attr("offset", function(d) { return d.offset; })
          .attr("stop-color", function(d) { return d.color; })
          .attr("stop-opacity", 1);

      p.svg.append('rect')
          .attr('fill', "url('" + location.href + "#grads')")
          .attr('transform', `translate(${width + 15}, 0)`)
          .attr('width', 15)
          .attr('height', height)
          .attr('stroke-width', .75)
          .attr('stroke', '#000000');

      // z-axis ticks and label
      p.svg.append('g')
              .attr('class', 'z axis')
              .attr('transform', `translate(${width + 15 + 20}, 0)`)
              .call(p.zAxis);
    }
  }


  private plotData_(data: Array<Array<number>>, lastData?: Array<number>) {
    if (data.length === 0) return;

    this.numTraces = data[0].length - 1;
    if (!this.userTraces) {
      this.displayTraces = Array.apply(null, Array(this.numTraces)).map(
        function (x, i) { return i; }
      );
    }

    switch (this.numIndeps) {
      case 1: this.plotData1D_(data, lastData); break;
      case 2: this.plotData2D_(data, lastData); break;
    }

    // Update the last data point we've seen.
    this.lastData = data[data.length - 1];

    // If min and max view limits are the same (e.g. because we have just one
    // datapoint so far), then offset the view limits by a small amount.
    if (this.limits.xMin === this.limits.xMax) {
      this.limits.xMin -= 1;
      this.limits.xMax += 1;
    }
    if (this.limits.yMin === this.limits.yMax) {
      this.limits.yMin -= 1;
      this.limits.yMax += 1;
    }

    // Zoom to fit the data.
    // TODO: Only if the zoom has not changed.
    this.resetZoom();
  }


  private plotData1D_(data: Array<Array<number>>, lastData?: Array<number>) {
    // Update data limits.
    this.dataLimits = {
      xMin: NaN,
      xMax: NaN,
      yMin: NaN,
      yMax: NaN,
      zMin: NaN,
      zMax: NaN
    };

    for (let row of data) {
      let x = row[0];
      this.dataLimits.xMin = safeMin(this.dataLimits.xMin, x);
      this.dataLimits.xMax = safeMax(this.dataLimits.xMax, x);
      for (let i of this.displayTraces) {
        let y = row[i+1];
        this.dataLimits.yMin = safeMin(this.dataLimits.yMin, y);
        this.dataLimits.yMax = safeMax(this.dataLimits.yMax, y);
      }
    }
    this.yLabel = datavault.makeAxisLabel(this.deps[this.displayTraces[0]]);
    // Update view limits.
    this.limits.xMin = isNaN(this.dataLimits.xMin) ? 0 : this.dataLimits.xMin;
    this.limits.xMax = isNaN(this.dataLimits.xMax) ? 0 : this.dataLimits.xMax;
    this.limits.yMin = isNaN(this.dataLimits.yMin) ? 0 : this.dataLimits.yMin;
    this.limits.yMax = isNaN(this.dataLimits.yMax) ? 0 : this.dataLimits.yMax;

    for (let i of this.displayTraces) {
      // Extract data for trace i, starting with the last datapoint to avoid gaps.
      const traceData = [];
      if (lastData) {
        traceData.push([lastData[0], lastData[i+1]]);
      }
      for (let row of data) {
        traceData.push([row[0], row[i+1]]);
      }

      // Add this trace to the plot.
      if (traceData.length > 1) {
        this.chartBody.append('svg:path')
                .datum(traceData)
                .attr('stroke', COLOR_LIST[i % COLOR_LIST.length])
                .attr('fill', 'none')
                .attr('class', `line${i}`)
                .attr('d', this.line);
      }
    }
  }


  private plotData2D_(data: Array<Array<number>>, lastData?: Array<number>) {
    // Update data limits.

    for (let row of data) {
      let x = row[0];
      if (this.x0 === null) {
        this.x0 = x;
      } else if (this.dx0 < 0 && x !== this.x0) {
        this.dx0 = Math.abs(x - this.x0);
      }
      this.dataLimits.xMin = safeMin(this.dataLimits.xMin, x);
      this.dataLimits.xMax = safeMax(this.dataLimits.xMax, x);
      if (!this.xNext.hasOwnProperty(x)) {
        let xi = insertSorted(this.xs, x);
        let len = this.xs.length;
        this.dx = len > 1 ? (this.xs[len-1] - this.xs[0]) / len : 1;
        if (xi > 0) {
          this.xNext[this.xs[xi-1]] = x;
        }
        if (xi < len - 1) {
          this.xNext[x] = this.xs[xi+1];
        } else {
          this.xNext[x] = x + this.dx;
        }
      }

      let y = row[1];
      if (this.y0 === null) {
        this.y0 = y;
      } else if (this.dy0 < 0 && y !== this.y0) {
        this.dy0 = Math.abs(y - this.y0);
      }
      this.dataLimits.yMin = safeMin(this.dataLimits.yMin, y);
      this.dataLimits.yMax = safeMax(this.dataLimits.yMax, y);
      if (!this.yNext.hasOwnProperty(y)) {
        let yi = insertSorted(this.ys, y);
        let len = this.ys.length;
        this.dy = len > 1 ? (this.ys[len-1] - this.ys[0]) / len : 1;
        if (yi > 0) {
          this.yNext[this.ys[yi-1]] = y;
        }
        if (yi < len - 1) {
          this.yNext[y] = this.ys[yi+1];
        } else {
          this.yNext[y] = y + this.dy;
        }
      }

        let z = row[this.displaySurface];
        this.dataLimits.zMin = safeMin(this.dataLimits.zMin, z);
        this.dataLimits.zMax = safeMax(this.dataLimits.zMax, z);
    }

    // Update view limits.
    this.limits.xMin = isNaN(this.dataLimits.xMin) ? 0 : this.dataLimits.xMin;
    this.limits.xMax = isNaN(this.dataLimits.xMax + this.dx) ?
        0 : this.dataLimits.xMax + this.dx;
    this.limits.yMin = isNaN(this.dataLimits.yMin) ? 0 : this.dataLimits.yMin;
    this.limits.yMax = isNaN(this.dataLimits.yMax + this.dy) ?
        0 : this.dataLimits.yMax + this.dy;

    let zMin = this.dataLimits.zMin,
        zMax = this.dataLimits.zMax;
    if (zMin === zMax) {
      zMin -= 1;
      zMax += 1;
    }

    // Add a dot to the plot.
    let w = 0,
        h = 0;
    const p = this;
    switch (this.drawMode2D) {
    case 'dots':
      w = h = 4;
      for (let row of data) {
        this.chartBody
              .append('rect')
              .datum(row)
              .classed('data', true)
              .attr('x', (d) => p.xScale(d[0]))
              .attr('y', (d) => p.yScale(d[1]) - h)
              .attr('width', w)
              .attr('height', h)
              .style('fill', (d) => getColor(d[p.displaySurface], zMin, zMax));
      }
      break;

    case 'rectfill':
      w = Math.abs(p.xScale(this.dx0) - p.xScale(0));
      h = Math.abs(p.yScale(this.dy0) - p.yScale(0));
      for (let row of data) {
        this.chartBody
              .append('rect')
              .datum(row)
              .classed('data', true)
              .attr('x', (d) => p.xScale(d[0]))
              .attr('y', (d) => p.yScale(d[1]) - h)
              .attr('width', w)
              .attr('height', h)
              .style('fill', (d) => getColor(d[p.displaySurface], zMin, zMax));
      }
      break;

    case 'vargrid':
      for (let row of data) {
        this.chartBody
              .append('rect')
              .datum(row)
              .classed('data', true)
              .attr('x', (d) => p.xScale(d[0]))
              .attr('y', (d) => p.yScale(p.yNext[d[1]]))
              .attr('width', (d) => p.xScale(p.xNext[d[0]]) - p.xScale(d[0]))
              .attr('height', (d) => {
                return Math.abs(p.yScale(p.yNext[d[1]]) - p.yScale(d[1]));
              })
              .style('fill', (d) => getColor(d[p.displaySurface], zMin, zMax));
      }
      break;
    }
  }


  private installMouseListeners_() {
    if (!this.svg) return;
    switch (this.mouseMode) {
      case 'pan':
        this.svg.on('mousedown', null);
        this.svg.call(this.zoom);
        this.$.plot.style.cursor = 'auto';
        this.$.plot.style.cursor = 'all-scroll';
        break;

      case 'zoomRect':
        this.svg.on('.zoom', null)
        this.svg.on('mousedown', () => this.zoomRectangle_());
        this.$.plot.style.cursor = 'auto';
        this.$.plot.style.cursor = 'crosshair';
        break;
    }
  }


  private updatePlotStyles_() {
    if (!this.svg) return;
    switch (this.numIndeps) {
      case 1:
        this.$$('rect.background').style.fill = '#ffffff';
        this.$.modes2d.style.visibility = 'hidden';
        this.is1D = true;
        this.is2D = false;
        break;

      case 2:
        this.$$('rect.background').style.fill = '#222222';
        this.is1D = false;
        this.is2D = true;
        break;
    }
  }


  private redraw_() {
    const area = this.$.plot,
        rect = area.getBoundingClientRect();
    while (area.firstChild) {
      area.removeChild(area.firstChild);
    }
    this.createPlot_(area,
                     Math.max(rect.width, 400),
                     Math.max(rect.height, 400));
    this.updatePlotStyles_();
    this.plotData_(this.data);
    this.installMouseListeners_();
  }


  private handleZoom_() {
    // Zoom and pan axes.
    this.svg.select('.x.axis').call(this.xAxis);
    this.svg.select('.y.axis').call(this.yAxis);

    switch (this.numIndeps) {
      case 1: this.zoomData1D_(); break;
      case 2: this.zoomData2D_(); break;
    }
  }


  private zoomData1D_() {
    // Adjust data for each trace.
    for (let k = 0; k < this.numTraces; k++) {
      this.svg.selectAll(`.line${k}`)
          .attr('class', `line${k}`)
          .attr('d', this.line);
    }
  }


  private zoomData2D_() {
    const zMin = this.dataLimits.zMin,
          zMax = this.dataLimits.zMax,
          p = this;

    let w = 0,
        h = 0;

    // Rescale the color bar.
    this.svg.select('.z.axis').call(this.zAxis);

    // Adjust size, position, and color of each data rect.
    switch (this.drawMode2D) {
    case 'dots':
      w = 4;
      h = 4;
      this.svg.selectAll('rect.data')
          .attr('x', (d) => p.xScale(d[0]))
          .attr('y', (d) => p.yScale(d[1]) - h)
          .attr('width', w)
          .attr('height', h)
          .style('fill', (d) => getColor(d[p.displaySurface], zMin, zMax));
      break;

    case 'rectfill':
      w = Math.abs(p.xScale(this.dx0) - p.xScale(0));
      h = Math.abs(p.yScale(this.dy0) - p.yScale(0));
      this.svg.selectAll('rect.data')
          .attr('x', (d) => p.xScale(d[0]))
          .attr('y', (d) => p.yScale(d[1]) - h)
          .attr('width', w)
          .attr('height', h)
          .style('fill', (d) => getColor(d[p.displaySurface], zMin, zMax));
      break;

    case 'vargrid':
      this.svg.selectAll('rect.data')
          .attr('x', (d) => p.xScale(d[0]))
          .attr('y', (d) => p.yScale(p.yNext[d[1]]))
          .attr('width', (d) => p.xScale(p.xNext[d[0]]) - p.xScale(d[0]))
          .attr('height', (d) => {
            return Math.abs(p.yScale(p.yNext[d[1]]) - p.yScale(d[1]));
          })
          .style('fill', (d) => getColor(d[p.displaySurface], zMin, zMax));
      break;
    }
  }


  /**
   * Zoom into a selected rectangular region on the graph.
   */
  private zoomRectangle_() {
    // Helper function to get mouse position in the coordinates of the svg plot
    // area. The d3.mouse function returns coordinates relative to the full html
    // element, so we must account for the margins. We also clip the coordinates
    // to the available plot area.
    const mousePos = () => {
      const [x, y] = d3.mouse(this);
      return [
        clip(x - this.margin.left, 0, this.width),
        clip(y - this.margin.top, 0, this.height)
      ];
    }

    const [originX, originY] = mousePos(),
        rect = this.svg.append('rect')
                       .classed('zoom', true)
                       .attr('stroke', 'red')
                       .attr('fill-opacity', 0.5);

    d3.select(window)
      .on('mousemove', () => {
        const [x, y] = mousePos();
        rect.attr('x', Math.min(originX, x))
            .attr('y', Math.min(originY, y))
            .attr('width', Math.abs(x - originX))
            .attr('height', Math.abs(y - originY));
      })
      .on('mouseup', () => {
        const [x, y] = mousePos();
        d3.select(window)
          .on('mousemove', null)
          .on('mouseup', null);
        if (x !== originX && y !== originY) {
          // Convert box limits from screen to data coordinates and make sure
          // they are in the right order, regardless of which way the user
          // dragged the box.
          const xScale = this.xScale,
                yScale = this.yScale,
                xMin = Math.min(xScale.invert(originX), xScale.invert(x)),
                xMax = Math.max(xScale.invert(originX), xScale.invert(x)),
                yMin = Math.min(yScale.invert(originY), yScale.invert(y)),
                yMax = Math.max(yScale.invert(originY), yScale.invert(y));
          this.zoom.x(xScale.domain([xMin, xMax]))
                   .y(yScale.domain([yMin, yMax]));
        }
        rect.remove();
        this.handleZoom_();
      }, true);
    d3.event.preventDefault();
    d3.event.stopPropagation();
  }


  private mouseToDataX_(x: number): number {
    x = clip(x - this.margin.left, 0, this.width);
    return this.xScale.invert(x);
  }


  private mouseToDataY_(y: number): number {
    y = clip(y - this.margin.top, 0, this.height);
    return this.yScale.invert(y);
  }


  /**
   * Reset to original window size after zoom-in.
   */
  public resetZoom() {
    var zMin = this.dataLimits.zMin,
        zMax = this.dataLimits.zMax;
    if (zMin == zMax) {
      zMin -= 1;
      zMax += 1;
    }

    this.xScale.domain([this.limits.xMin, this.limits.xMax]);
    this.yScale.domain([this.limits.yMin, this.limits.yMax]);
    this.zScale.domain([zMin, zMax]);
    this.xAxis.scale(this.xScale);
    this.yAxis.scale(this.yScale);
    this.zAxis.scale(this.zScale);
    this.zoom.x(this.xScale);
    this.zoom.y(this.yScale);
    this.handleZoom_();
  }


  /**
   * Sets the control mode to pan/zoom.
   */
  public mouseModeSelectorPan() {
    this.mouseMode = 'pan';
  }


  /**
   * Sets the control mode to zoom rectangle.
   */
  public mouseModeSelectorZoomRect() {
    this.mouseMode = 'zoomRect';
  }


  /**
   * Sets the 2D draw mode to dots.
   */
  public drawMode2DSelectorDots() {
    this.drawMode2D = 'dots';
  }


  /**
   * Sets the 2D draw mode to rect fill.
   */
  public drawMode2DSelectorRectfill() {
    this.drawMode2D = 'rectfill';
  }


  /**
   * Sets the 2D draw mode to vargrid.
   */
  public drawMode2DSelectorVargrid() {
    this.drawMode2D = 'vargrid';
  }


  /**
   * Opens the trace selector dialog window.
   */
  public traceSelectorOpen() {
    this.$.traceSelector.open();
  }


  /**
   * Selects all available traces.
   */
  public traceSelectorSelectAll() {
    const selector = Polymer.dom(this.$.traceSelector);
    const checkboxes = selector.querySelectorAll('[name=traces]');
    for (let checkbox of checkboxes) {
      (<HTMLInputElement>checkbox).checked = true;
    }
  }


  /**
   * Selects none of the available traces.
   */
  public traceSelectorSelectNone() {
    const selector = Polymer.dom(this.$.traceSelector);
    const checkboxes = selector.querySelectorAll('[name=traces]');
    for (let checkbox of checkboxes) {
      (<HTMLInputElement>checkbox).checked = false;
    }
  }


  /**
   * Submit the users trace selection. Will not submit if no traces are
   * selected.
   */
  public traceSelectorSubmit() {
    const selected: Array<number> = [];
    const selector = Polymer.dom(this.$.traceSelector);
    const checkboxes = selector.querySelectorAll('[name=traces]');
    const radio = selector.querySelector('[name=radioGroup]');
    switch (this.numIndeps) {
      case 1:
        for (let checkbox of checkboxes) {
          if ((<HTMLInputElement>checkbox).checked) {
            selected.push((<any>checkbox).traceIndex);
          }
        }
        break;

      case 2:
        selected.push(parseInt((<any>radio).selected));
        break;
    }

    if (selected.length > 0) {
      this.displayTraces.splice(0, this.displayTraces.length);
      for (let ent of selected) {
        this.displayTraces.push(ent);
      }
      this.displaySurface = this.displayTraces[0] + 2;
      this.$.traceSelector.close();
      this.userTraces = true;
      this.redraw_();
    }
  }


  @observe('xLabel')
  private observeXLabel_(newLabel: string, oldLabel: string) {
    if (this.svg) {
      this.svg.select('#x-label').text(newLabel);
    }
  }


  @observe('yLabel')
  private observeYLabel_(newLabel: string, oldLabel: string) {
    if (this.svg) {
      this.svg.select('#y-label').text(newLabel);
    }
  }


  @observe('mouseMode')
  private observeMouseMode_(newMode: string, oldMode: string) {
    switch (newMode) {
      case 'pan':
        this.$.pan.style.color = 'black';
        this.$.rect.style.color = '#AAAAAA';
        break;

      case 'zoomRect':
        this.$.pan.style.color = '#AAAAAA';
        this.$.rect.style.color = 'black';
        break;
    }
    this.installMouseListeners_();
  }


  @observe('drawMode2D')
  private observeDrawMode2D_(newMode: string, oldMode: string) {
    switch (newMode) {
      case 'dots':
        this.$.dots.style.color = 'black';
        this.$.rectfill.style.color = '#AAAAAA';
        this.$.vargrid.style.color = '#AAAAAA';
        break;

      case 'rectfill':
        this.$.dots.style.color = '#AAAAAA';
        this.$.rectfill.style.color = 'black';
        this.$.vargrid.style.color = '#AAAAAA';
        break;

      case 'vargrid':
        this.$.dots.style.color = '#AAAAAA';
        this.$.rectfill.style.color = '#AAAAAA';
        this.$.vargrid.style.color = 'black';
        break;
    }
    if (oldMode && newMode !== oldMode) {
      setTimeout(() => this.handleZoom_(), 0);
    }
  }


  @observe('numIndeps')
  private observeNumIndeps_(newNum: number, oldNum: number) {
    this.updatePlotStyles_();
  }


  @listen('plot.mousemove')
  private listenPlotMouseMove_(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const xMin = this.xScale.invert(0),
          xMax = this.xScale.invert(this.width),
          yMin = this.yScale.invert(this.height),
          yMax = this.yScale.invert(0),
          dx = (xMax - xMin) / this.width,
          dy = (yMax - yMin) / this.height,
          x = this.mouseToDataX_(event.pageX - rect.left),
          y = this.mouseToDataY_(event.pageY - rect.top),
          xStr = prettyNumber(x, xMin, xMax, dx),
          yStr = prettyNumber(y, yMin, yMax, dy);

    this.currPos = `(${xStr}, ${yStr})`;
  }
}


/**
 * Digits needed to display a value to the given resolution in fixed-point
 * format.
 */
function fixedDigits(res: number): number {
  return Math.max(0, 1 + Math.ceil(Math.log10(Math.abs(1 / res))));
}


/**
 * Digits needed to display the given value to the given resolution in
 * exponential format.
 */
function expDigits(value: number, res: number): number {
  return Math.max(1, 1 + Math.ceil(Math.log10(Math.abs(value / res))));
}


/**
 * Get a pretty string representation of the given number, taken from the
 * given range and accurate to the given resolution. Computes the number of
 * digits needed to display numbers in this range in fixed point or exponential
 * format, and then chooses the smaller representation. We also limit fixed
 * point format to numbers less than a million in absolute value.
 */
function prettyNumber(
    value: number, min: number, max: number, res: number): string {
  const numFixed = fixedDigits(res),
        numExp = Math.max(expDigits(min, res), expDigits(max, res)),
        fixed = value.toFixed(numFixed),
        exp = value.toExponential(numExp);
  if ((fixed.length < exp.length) && (Math.abs(value) < 1e6)) {
    return fixed;
  } else {
    return exp;
  }
}


/**
 * Get a color for the given value on a scale with the given min and max
 * limits (zMin <= z <= zMax).
 */
function getColor(z: number, zMin: number, zMax: number) {
  if (zMin === zMax) {
    return COLOR_MAP[128];
  }
  if (z === zMax) {
    return COLOR_MAP[255];
  }
  const index = Math.floor(256 * (z - zMin) / (zMax - zMin));
  return COLOR_MAP[index];
}


function safeMin(a: number, b: number): number {
  if (isNaN(a)) return b;
  if (isNaN(b)) return a;
  return Math.min(a, b);
}


function safeMax(a: number, b: number): number {
  if (isNaN(a)) return b;
  if (isNaN(b)) return a;
  return Math.max(a, b);
}


function clip(x: number, xMin: number, xMax: number): number {
  return Math.max(xMin, Math.min(xMax, x));
}


function insertInRange(
    xs: Array<number>, x: number, lh: number, rh: number): number {
  const m = lh + Math.floor((rh - lh)/2);
  if (x > xs[rh]) {
    xs.splice(rh + 1, 0, x);
    return rh + 1;
  }
  if (x < xs[lh]) {
    xs.splice(lh, 0, x);
    return lh;
  }
  if (lh >= rh) {
    return;
  }
  if (x < xs[m]) {
    return insertInRange(xs, x, lh, m - 1);
  }
  if (x > xs[m]) {
    return insertInRange(xs, x, m + 1, rh);
  }
}


function insertSorted(xs: Array<number>, x: number): number {
  const len = xs.length;
  if (len === 0) {
    xs.push(x);
    return 0;
  }
  return insertInRange(xs, x, 0, len - 1);
}
