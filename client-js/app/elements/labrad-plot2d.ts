import 'd3';

import {Plot} from './labrad-plot1d';

var COLOR_LIST = ['red', 'blue', 'yellow', 'green', 'magenta'];

@component('labrad-plot2d')
export class Plot2D extends polymer.Base implements Plot {

  @property({type: String, value: ''})
  xLabel: string;

  @property({type: String, value: ''})
  yLabel: string;

  private data: Array<Array<number>> = []
  private lastData: Array<number> = null;

  private numTraces: number = 0;
  private svg: any;
  private chartBody: any;
  private clip: any;
  private xAxis: any;
  private yAxis: any;
  private xScale: any;
  private yScale: any;
  private line: any;
  private zoom: any;
  private limits = {xMin: 0, xMax: 1, yMin: 0, yMax: 1, zMin: 0, zMax: 1};
  private dataLimits = {xMin: NaN, xMax: NaN, yMin: NaN, yMax: NaN, zMin: NaN, zMax: NaN};
  private margin: {top: number; right: number; bottom: number; left: number};

  private xs: Array<number> = [];
  private ys: Array<number> = [];
  private xNext: {[x: number]: number} = {};
  private yNext: {[y: number]: number} = {};
  private dx: number = 1;
  private dy: number = 1;

  private plot: any;

  attached() {
    this.redraw();
    window.addEventListener('resize', (event) => this.redraw());
  }

  @observe('xLabel')
  xLabelChanged(newLabel: string, oldLabel: string) {
    if (this.svg) {
      this.svg.select('#x-label').text(newLabel);
    }
  }

  @observe('yLabel')
  yLabelChanged(newLabel: string, oldLabel: string) {
    if (this.svg) {
      this.svg.select('#y-label').text(newLabel);
    }
  }

  private redraw() {
    var rect = this.getBoundingClientRect();
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
    this.createPlot(Math.max(rect.width, 400), Math.max(rect.height, 400));
    this.plotData(this.data);
  }

  private createPlot(totWidth: number = 1000, totHeight: number = 500): void {
    var p = this;
    p.margin = {top: 50, right: 50, bottom: 50, left: 40};

    var width = totWidth - p.margin.left - p.margin.right;
    var height = totHeight - p.margin.top - p.margin.bottom;

    p.xScale = d3.scale.linear()
            .domain([p.limits.xMin, p.limits.xMax])
            .range([0, width]);

    p.yScale = d3.scale.linear()
            .domain([p.limits.yMin, p.limits.yMax])
            .range([height, 0]);

    p.xAxis = d3.svg.axis()
            .scale(p.xScale)
            .orient('bottom')
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
            .on('zoom', p.handleZoom.bind(p));

    // plot area
    p.svg = d3.select(this)
            .append('svg:svg')
            .attr('width', width + p.margin.left + p.margin.right)
            .attr('height', height + p.margin.top + p.margin.bottom)
            .append('svg:g')
            .attr('transform', `translate(${p.margin.left}, ${p.margin.top})`)
            .call(p.zoom);

    // background rectangle
    p.svg.append('rect')
            .attr('width', width)
            .attr('height', height);

    // x-axis ticks and label
    p.svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0, ${height})`)
            .call(p.xAxis);
    p.svg.append('text')
            .attr('id', 'x-label')
            .attr('transform', `translate(${width / 2}, ${height + p.margin.bottom - 10})`)
            .style('text-anchor', 'middle')
            .text(this.xLabel);

    // y-axis ticks and label
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

    // draw the graph object (from http://jsfiddle.net/KSAbK/)
    // This keeps the data from exceeding the limits of the plot
    p.chartBody = p.svg.append('g')
            .attr('clip-path', 'url(#clip)');
    p.clip = p.svg.append('svg:clipPath')
            .attr('id', 'clip')
            .append('svg:rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', width)
            .attr('height', height);
  }

  addData(data: Array<Array<number>>) {
    if (data.length === 0) return;
    var lastData = this.data.length > 0 ? this.data[this.data.length - 1] : null;
    for (let row of data) {
      this.splice('data', this.data.length, 0, row);
    }
    this.plotData(data, lastData);
  }

  private insertSorted(xs: Array<number>, x: number): number {
    var len = xs.length;
    if (len === 0) {
      xs.push(x);
      return 0;
    }
    function insertInRange(lh: number, rh: number): number {
      var m = lh + Math.floor((rh - lh)/2);
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
        return insertInRange(lh, m - 1);
      }
      if (x > xs[m]) {
        return insertInRange(m + 1, rh);
      }
    }
    return insertInRange(0, len - 1);
  }

  private plotData(data: Array<Array<number>>, lastData?: Array<number>) {
    if (data.length === 0) return;

    // find new limits
    for (let row of data) {
      let x = row[0];
      this.dataLimits.xMin = this.safeMin(this.dataLimits.xMin, x);
      this.dataLimits.xMax = this.safeMax(this.dataLimits.xMax, x);
      if (!this.xNext.hasOwnProperty(x)) {
        let xi = this.insertSorted(this.xs, x);
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
      this.dataLimits.yMin = this.safeMin(this.dataLimits.yMin, y);
      this.dataLimits.yMax = this.safeMax(this.dataLimits.yMax, y);
      if (!this.yNext.hasOwnProperty(y)) {
        let yi = this.insertSorted(this.ys, y);
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

      for (let i = 2; i < row.length; i++) {
        let z = row[i];
        this.dataLimits.zMin = this.safeMin(this.dataLimits.zMin, z);
        this.dataLimits.zMax = this.safeMax(this.dataLimits.zMax, z);
      }
    }
    var zMin = this.dataLimits.zMin,
        zMax = this.dataLimits.zMax;

    // calculate view limits (TODO: only if the zoom has not changed)
    this.limits.xMin = isNaN(this.dataLimits.xMin) ? 0 : this.dataLimits.xMin;
    this.limits.xMax = isNaN(this.dataLimits.xMax + this.dx) ? 0 : this.dataLimits.xMax + this.dx;
    this.limits.yMin = isNaN(this.dataLimits.yMin) ? 0 : this.dataLimits.yMin;
    this.limits.yMax = isNaN(this.dataLimits.yMax + this.dy) ? 0 : this.dataLimits.yMax + this.dy;
    this.limits.zMin = isNaN(this.dataLimits.zMin) ? 0 : this.dataLimits.zMin;
    this.limits.zMax = isNaN(this.dataLimits.zMax) ? 1 : this.dataLimits.zMax;

    // if min and max limits are the same (e.g. because we have just one
    // datapoint so far), then offset the limits by a small amount.
    if (this.limits.xMin === this.limits.xMax) {
      this.limits.xMin -= 1;
      this.limits.xMax += 1;
    }
    if (this.limits.yMin === this.limits.yMax) {
      this.limits.yMin -= 1;
      this.limits.yMax += 1;
    }

    // fit to the data (TODO: only if user has not zoomed or panned somewhere else)
    this.xScale.domain([this.limits.xMin, this.limits.xMax]);
    this.yScale.domain([this.limits.yMin, this.limits.yMax]);
    this.xAxis.scale(this.xScale);
    this.yAxis.scale(this.yScale);
    this.zoom.x(this.xScale);
    this.zoom.y(this.yScale);

    // add a dot to the plot
    var p = this;
    for (let row of data) {
      this.chartBody
            .append('rect')
            .datum(row)
            .classed('data', true)
            .attr('x', (d) => p.xScale(d[0]))
            .attr('y', (d) => p.yScale(this.yNext[d[1]]))
            .attr('width', (d) => p.xScale(this.xNext[d[0]]) - p.xScale(d[0]))
            .attr('height', (d) => Math.abs(p.yScale(this.yNext[d[1]]) - p.yScale(d[1])))
            .style('fill', (d) => d3.rgb(255 * (d[2] - zMin) / (zMax - zMin),
                                         255 - 255 * (d[2] - zMin) / (zMax - zMin),
                                         255));
    }

    this.handleZoom();
  }

  private safeMin(a: number, b: number): number {
    if (isNaN(a)) return b;
    if (isNaN(b)) return a;
    return Math.min(a, b);
  }

  private safeMax(a: number, b: number): number {
    if (isNaN(a)) return b;
    if (isNaN(b)) return a;
    return Math.max(a, b);
  }

  private handleZoom() {
    var svg = this.svg,
        xAxis = this.xAxis,
        yAxis = this.yAxis,
        zMin = this.dataLimits.zMin,
        zMax = this.dataLimits.zMax,
        p = this;

    // zoom and pan axes
    svg.select('.x.axis').call(xAxis);
    svg.select('.y.axis').call(yAxis);

    // zoom and pan data
    svg.selectAll('rect.data')
        .attr('x', (d) => this.xScale(d[0]))
        .attr('y', (d) => this.yScale(this.yNext[d[1]]))
        .attr('width', (d) => p.xScale(this.xNext[d[0]]) - p.xScale(d[0]))
        .attr('height', (d) => Math.abs(p.yScale(this.yNext[d[1]]) - p.yScale(d[1])))
        .style('fill', (d) => d3.rgb(255 * (d[2] - zMin) / (zMax - zMin),
                                     255 - 255 * (d[2] - zMin) / (zMax - zMin),
                                     255));
  }
}
