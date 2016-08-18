import 'd3';
import THREE from 'three';
import {viridisData} from '../scripts/colormaps';
import * as datavault from '../scripts/datavault';
import {fitParabola, fitExponential} from '../scripts/fit';
import {Lifetime} from '../scripts/lifetime';


/**
 * Plot Constants.
 */
const PLOT_MIN_WIDTH = 400;
const PLOT_MIN_HEIGHT = 400;
const PLOT_LEFT_MARGIN = 120;
const PLOT_RIGHT_MARGIN = 10;
const PLOT_TOP_OFFSET = 50;
const PLOT_TOP_MARGIN = 10;
const PLOT_BOTTOM_MARGIN = 50;
const PLOT_LINE_WIDTH = 1.5;
const PLOT_FIT_LINE_WIDTH = 3.0;
const PLOT_POINT_SIZE = 6;
const PLOT_ZOOM_RECTANGLE_BORDER = 2;
const PLOT_FIT_RECTANGLE_BORDER = 1;


/**
 * Mouse Constants.
 */
const MOUSE_MAIN_BUTTON = 0;


/**
 * Colors for traces in 1D plots.
 */
const COLOR_LIST = [
  "#3366cc", // Blue.
  "#dc3912", // Red.
  "#ff9900", // Orange.
  "#109618", // Green.
  "#990099", // Purple.
  "#22aa99", // Teal.
  "#dd4477", // Pink.
  "#0099c6", // Aqua.
  "#aaaa11", // Yellow.
  "#000000", // Black.
];


/**
 * Colors for 2D plots, using viridis colormap from matplotlib.
 */
const COLOR_MAP = viridisData.map((rgb) => {
  const [r, g, b] = rgb;
  return d3.rgb(255 * r, 255 * g, 255 * b);
});


/**
 * Color Bar Constants
 */
const COLOR_BAR_NUM_TICKS = 10;
const COLOR_BAR_WIDTH = 15;
const COLOR_BAR_LEFT_MARGIN = 15;
const COLOR_BAR_RIGHT_MARGIN = 5;
const COLOR_BAR_AXIS_WIDTH = 40;
const COLOR_BAR_STROKE_WIDTH = 0.75;
const COLOR_BAR_OUTER_WIDTH = (
  COLOR_BAR_LEFT_MARGIN + COLOR_BAR_WIDTH + COLOR_BAR_RIGHT_MARGIN
);
const COLOR_BAR_WIDGET_SIZE = (
   COLOR_BAR_OUTER_WIDTH + COLOR_BAR_AXIS_WIDTH
);

type RectangleBound = {
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
};

type Extremum = {
  x: number,
  y: number,
  isMin: boolean,
  isMax: boolean,
};

type ParabolaCoefficient = {
  A: number,
  B: number,
  C: number,
  extremum: Extremum,
  label: string,
  legend: string,
  unit: string,
};

type ExponentialCoefficient = {
  A: number,
  B: number,
  T1: number,
  label: string,
  legend: string,
  unit: string,
};


const FIT_OPTION_NONE = 0;
const FIT_OPTION_PARABOLA = 1;
const FIT_OPTION_EXPONENTIAL = 2;

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
  deps: {label: string, legend: string, unit: string}[];

  @property({type: String})
  backUrl: string;

  private lifetime = new Lifetime();

  private data: number[][] = []
  private lastData: number[] = null;

  private numTraces: number = 0;
  private svg: any;
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
    top: PLOT_TOP_MARGIN,
    right: PLOT_RIGHT_MARGIN,
    bottom: PLOT_BOTTOM_MARGIN,
    left: PLOT_LEFT_MARGIN
  };

  private fitBounds = {
    xMin: NaN,
    xMax: NaN,
    yMin: NaN,
    yMax: NaN
  };

  // Hack to enforce user defined display of traces.
  private userTraces: boolean = false;

  private xs: number[] = [];
  private ys: number[] = [];
  private xNext: {[x: number]: number} = {};
  private yNext: {[y: number]: number} = {};
  private dx: number = 1;
  private dy: number = 1;
  private x0: number = null;
  private y0: number = null;
  private dx0: number = -1;
  private dy0: number = -1;
  private displayTraces: number[];
  private allOrNone: boolean = true;
  private is1D: boolean;
  private is2D: boolean;
  private displaySurface: number = 2;

  private fitMode: number = FIT_OPTION_NONE;

  private lines: THREE.Line[] = [];
  private linesFitParabolas: THREE.Line[] = [];
  private linesFitExponentials: THREE.Line[] = [];

  private fitParabolaCoefficients: ParabolaCoefficient[] = [];
  private fitExponentialCoefficients: ExponentialCoefficient[] = [];


  /**
   * A matrix for the use in transforming geometries.
   */
  private transformMatrix = new THREE.Matrix4();


  /**
   * A non-indexed plane unit geometry one world unit in size.
   * Used to render rectangular data points.
   */
  private planeUnitGeometry =
      new THREE.PlaneBufferGeometry(1, 1).toNonIndexed();


  /**
   * A short-hand to access the positions array in a unit plane.
   */
  private planeVertexPositions =
      this.planeUnitGeometry.getAttribute('position').array;


  /**
   * The number of vertices in a plane geometry.
   */
  private planeVertexCount = this.planeVertexPositions.length / 3;


  /**
   * The default options for the plotting camera.
   */
  private cameraOpts = {
    /** The field of view of the camera. */
    fov: 45,

    /** The initial aspect ratio of the camera. */
    aspect: 1,

    /** The near plane of the camera. */
    near: -500,

    /** The far plane of the camera. */
    far: 500,

    /** The starting position of the camera. */
    startingPosition: new THREE.Vector3(0, 0, 1000)
  };


  /**
   * A perspective camera to view the graph.
   *
   * The camera is currently only used for the sake of being able to observe
   * the scene. Zooming/Panning is handled by `d3` rather than physically
   * moving the camera around the 3D space provided by `THREE.js`. Aspect ratio
   * modified if the plot is resized, otherwise camera properties (such as
   * position and zoom level) do not change.
   */
  private camera = new THREE.PerspectiveCamera(
    this.cameraOpts.fov,
    this.cameraOpts.aspect,
    this.cameraOpts.near,
    this.cameraOpts.far);

  private scene = new THREE.Scene();
  private renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});

  /** The objects currently in the scene. */
  private sceneObjects = [];

  /** If the scene render loop has been started. */
  private isRendering: boolean = false;

  /** If the graph data or camera has changed, requiring reprojection. */
  private graphUpdateRequired = false;

  private resetZoomRequired = false;
  private updateZoomRequired = false;
  private updateScalesRequired = false;
  private updateColorBarScaleRequired = false;

  /** If we have ever zoomed since last resetting the zoom level. */
  private haveZoomed: boolean = false;

  /** If the render loop should stop. */
  private finishRender: boolean = false;

  /** Store the canvas' bounding rectangle for performance. */
  private canvasBoundingRect = null;

  target: HTMLElement = document.body;


  /**
   * Navigate back to the directory listing.
   */
  cursorBack(e) {
    this.fire('app-link-click', {path: this.backUrl});
  }


  /**
   * Add new data to the plot and re-zoom.
   * Fires when new data arrives via the socket.
   */
  addData(data: number[][]): void {
    if (data.length === 0) {
      return;
    }
    const lastData = (this.data.length > 0) ?
        this.data[this.data.length - 1] : null;
    for (let row of data) {
      this.data.splice(this.data.length, 0, row);
    }

    this.plotData(data);

    // If there is no custom zoom level, then we want to automatically adjust
    // to keep all the data in frame.
    if (!this.haveZoomed) {
      this.resetZoomRequired = true;
      this.updateScalesRequired = true;
    }

    // New data may have changed the zAxis scale, so we need to update the
    // display independent of the other axes.
    this.updateColorBarScaleRequired = true;
    this.graphUpdateRequired = true;
  }


  /**
   * Redraw the plot and attach resize to the window resize event.
   * Fires when the component is attached to the DOM.
   */
  attached(): void {
    this.render();
    this.lifetime.defer(() => { this.finishRender = true; });
    const resizeListener = (e) => this.resizePlot();
    window.addEventListener('resize', resizeListener);
    this.lifetime.defer(() => {
      window.removeEventListener('resize', resizeListener);
    });
  }


  detached(): void {
    this.lifetime.close();
  }


  /**
   * Initializes the plot and begins the scene rendering loop.
   *
   */
  private render(): void {
    if (this.isRendering) {
      return;
    }

    this.isRendering = true;
    this.initializeSVGPlot();
    this.initializeWebGLPlot();
    this.resizePlot();
    this.renderPlot();
  }


  /**
   * Renders the plot on each animation frame until the `finishRender`
   * flag is set.
   */
  private renderPlot(): void {
    // If signaled to stop rendering, end the cycle.
    if (this.finishRender) {
      this.isRendering = false;
      this.finishRender = false;
      return;
    }

    if (this.updateZoomRequired) {
      this.updateZoom();
    }

    if (this.updateScalesRequired) {
      this.updateScales();
    }

    if (this.updateColorBarScaleRequired) {
      this.updateColorBarScale();
    }

    if (this.resetZoomRequired) {
      this.resetZoom();
    }

    if (this.graphUpdateRequired) {
      this.projectGraphPositions();
      this.renderer.render(this.scene, this.camera);
    }

    requestAnimationFrame(() => this.renderPlot());
  }


  /**
   * Resizes the SVG and WebGL portions of the plots and reprojects the data
   * according to the new aspect ratio.
   */
  private resizePlot(): void {
    this.resizeSVGPlot();
    this.resizeWebGLPlot();
    this.graphUpdateRequired = true;
  }


  /**
   * Deletes all objects from the scene and re-plots the data.
   */
  redrawScene(): void {
    for (let obj of this.sceneObjects) {
      this.scene.remove(obj);
    }
    this.sceneObjects = [];

    if (this.is1D) {
      this.lines = [];
      this.linesFitParabolas = [];
      this.linesFitExponentials = [];
    }

    this.lastData = null;

    this.dataLimits.xMin = NaN;
    this.dataLimits.xMax = NaN;
    this.dataLimits.yMin = NaN;
    this.dataLimits.yMax = NaN;
    this.dataLimits.zMin = NaN;
    this.dataLimits.zMax = NaN;

    this.plotData(this.data);

    if (!this.haveZoomed) {
      this.resetZoomRequired = true;
      this.updateScalesRequired = true;
    }

    this.updateColorBarScaleRequired = true;
    this.graphUpdateRequired = true;
  }


  /**
   * Initializes the WebGL portion of the plot.
   */
  private initializeWebGLPlot(): void {
    this.scene.add(this.camera);
    this.scene.add(new THREE.AmbientLight(0xffffff));
    this.camera.position.copy(this.cameraOpts.startingPosition);
    this.$.canvas.appendChild(this.renderer.domElement);
  }


  /**
   * Initializes the SVG portion of the plot.
   */
  private initializeSVGPlot(): void {
    const p = this;

    // Make room for the color bar if necessary.
    if (p.numIndeps === 2) {
      p.margin.right = PLOT_RIGHT_MARGIN + COLOR_BAR_WIDGET_SIZE;
    }

    p.xScale = d3.scale.linear()
            .domain([p.limits.xMin, p.limits.xMax]);

    p.yScale = d3.scale.linear()
            .domain([p.limits.yMin, p.limits.yMax]);

    p.zScale = d3.scale.linear()
            .domain([0, 1]);

    p.xAxis = d3.svg.axis()
            .orient('bottom');

    const yAxisFormatter = d3.format('.5g');
    p.yAxis = d3.svg.axis()
            .orient('left')
            .ticks(5)
            .tickSize(-p.width)
            .tickFormat((d) => yAxisFormatter(d));

    p.line = d3.svg.line()
            .x((d) => p.xScale(d[0]))
            .y((d) => p.yScale(d[1]));

    p.zoom = d3.behavior.zoom()
            .x(p.xScale)
            .y(p.yScale)
            .on('zoom', () => p.handleZoom());

    // Plot area.
    const marginLeft = p.margin.left;
    const marginTop = p.margin.top;
    p.svg = d3.select(p.$.plot)
              .append('svg:svg')
                .attr('id', 'svgplot')
                .attr('class', 'flex')
                .append('g')
                  .attr('id', 'svgplotgroup')
                  .attr('transform', `translate(${marginLeft}, ${marginTop})`);

    // Background rectangle.
    p.svg.append('rect')
            .classed('background', true)
            .attr('id', 'rect')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .style('fill', '#222222');

    // X-axis ticks and label.
    p.svg.append('g')
            .attr('id', 'x-axis')
            .attr('class', 'x axis');
    p.svg.append('text')
            .attr('id', 'x-label')
            .style('text-anchor', 'middle')
            .text(p.xLabel);

    // Y-axis ticks and label.
    p.svg.append('g')
            .attr('id', 'y-axis')
            .attr('class', 'y axis');
    p.svg.append('text')
            .attr('id', 'y-label')
            .attr('transform', 'rotate(-90)')
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text(p.yLabel);

    // Color Bar Axis.
    if (p.numIndeps === 2) {
      p.zAxis = d3.svg.axis();
      p.zAxis.orient('right')
             .ticks(COLOR_BAR_NUM_TICKS)
             .tickSize(5);

      // Create accurate gradient stops of the viridis colormap.
      const gradientTicks = [];
      for (let i = 0; i <= 255; ++i) {
        const index = i / 255 * 100;
        gradientTicks.push({
          offset: `${index}%`,
          color: COLOR_MAP[i]
        })
      }

      // The Color Bar Gradient.
      p.svg.append('defs')
             .append("linearGradient")
             .attr("id", "ColorBarGradient")
             .attr("x1", "0%")
             .attr("y1", "100%")
             .attr("x2", "0%")
             .attr("y2", "0%")
             .selectAll("stop")
             .data(gradientTicks)
             .enter()
               .append("stop")
                 .attr("offset", (d) => d.offset)
                 .attr("stop-color", (d) => d.color)
                 .attr("stop-opacity", 1);

      // Appending the location href is necessary due to the use of `base href`
      // for the overall app to make Polymer paths work.
      const gradientFill = `url('${location.href}#ColorBarGradient')`;

      // Color Bar Rectangle.
      p.svg.append('rect')
             .attr('id', 'color-bar')
             .attr('fill', gradientFill)
             .attr('width', COLOR_BAR_WIDTH)
             .attr('stroke', '#000000')
             .attr('stroke-width', COLOR_BAR_STROKE_WIDTH);

      // Z-axis ticks and label.
      p.svg.append('g')
             .attr('id', 'color-bar-ticks')
             .attr('class', 'z axis');
    }

    p.updatePlotStyles();
    p.updateControlEventListeners();
  }


  /**
   * Resizes the WebGL renderer and camera.
   */
  private resizeWebGLPlot(): void {
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.$.canvas.style.top = `${this.margin.top}px`;
    this.$.canvas.style.left = `${this.margin.left}px`;
    this.canvasBoundingRect = this.$.canvas.getBoundingClientRect();
  }


  /**
   * Resize the SVG portion of the plot.
   */
  private resizeSVGPlot(): void {
    const plot = this.$.plot;
    const plotBounds = plot.getBoundingClientRect();
    const plotWidth = Math.max(plotBounds.width, PLOT_MIN_WIDTH);
    const plotHeight = Math.max(plotBounds.height, PLOT_MIN_HEIGHT);

    // The inner dimensions of the plot, sans margins.
    this.width = plotWidth - this.margin.left - this.margin.right;
    this.height = plotHeight - this.margin.top - this.margin.bottom;

    this.xScale.range([0, this.width]);
    this.yScale.range([this.height, 0]);
    this.zScale.range([this.height, 0]);

    this.xAxis.scale(this.xScale)
              .tickSize(-this.height);

    this.yAxis.scale(this.yScale)
              .tickSize(-this.width);

    this.line.x((d) => this.xScale(d[0]))
             .y((d) => this.yScale(d[1]));

    this.zoom.x(this.xScale)
             .y(this.yScale);

    this.svg.select('#rect')
              .attr('width', this.width)
              .attr('height', this.height);

    this.svg.select('#x-axis')
              .attr('transform', `translate(0, ${this.height})`)
              .call(this.xAxis);

    const xLabelXOffset = this.width / 2;
    const xLabelYOffset = this.height + this.margin.bottom - 10;
    this.svg.select('#x-label')
              .attr('transform',
                    `translate(${xLabelXOffset}, ${xLabelYOffset})`);

    this.svg.select("#y-axis")
              .call(this.yAxis);

    this.svg.select('#y-label')
              .attr('x', -(this.height / 2))
              .attr('y', -this.margin.left);

    if (this.numIndeps === 2) {
      this.zAxis.scale(this.zScale);

      // Color Bar Rectangle.
      const colorBarOffset = this.width + COLOR_BAR_LEFT_MARGIN;
      this.svg.select('#color-bar')
                .attr('height', this.height)
                .attr('transform', `translate(${colorBarOffset}, 0)`);

      // Color Bar Ticks and Label.
      const zAxisXOffset = (this.width
                          + COLOR_BAR_LEFT_MARGIN
                          + COLOR_BAR_WIDTH
                          + COLOR_BAR_RIGHT_MARGIN);
      this.svg.select('#color-bar-ticks')
                .attr('transform', `translate(${zAxisXOffset}, 0)`)
                .call(this.zAxis);
    }
  }


  /**
   * Filter the traces and then generate the data appropriate for the given
   * plot type.
   */
  private plotData(data: number[][]): void {
    if (data.length === 0) {
      return;
    }

    this.numTraces = data[0].length - 1;
    if (!this.userTraces) {
      this.displayTraces = Array.apply(null, Array(this.numTraces)).map(
        function (x, i) { return i; }
      );
    }

    switch (this.numIndeps) {
      case 1: this.plotData1D(data); break;
      case 2: this.plotData2D(data); break;
      default: break; // Nothing to do.
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
  }


  /**
   * Helper method to get the scene object, or create it if it doesn't already
   * exist.
   */
  private getSceneObject() {
    if (this.sceneObjects.length === 0) {
      const ob = new THREE.Object3D();
      this.sceneObjects.push(ob);
      this.scene.add(ob);
    }

    return this.sceneObjects[0];
  }


  /**
   * Creates a line given a set of data.
   */
  private createLine(data: number[][], yColumn: number = 1,
                     color: string = "#000", lineWidth: number = 1): THREE.Line {
    if (data.length < 2) {
      return null;
    }

    const dataLength = data.length;

    // The positions array is initialized in the geometry here, but positions
    // are set withing projectGraphPositions. See plotData2D for more info.
    const positions = new Float32Array(dataLength * 3);

    // Raw data is stored inside the geometry for more efficient
    // reprojection.
    const dataPoints = new Float64Array(dataLength * 3);

    let offset = 0;
    for (let row of data) {
      dataPoints[offset] = row[0];
      dataPoints[offset + 1] = row[yColumn];
      offset += 3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('data', new THREE.BufferAttribute(dataPoints, 3));

    const material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: lineWidth
    });

    const line = new THREE.Line(geometry, material);

    return line;
  }


  /**
   * Returns an array filtering the data for each trace to only the points
   * within the current fit bounds. The array splits the data so that each
   * trace has its own array of data points, where each point is a single x/y
   * pair.
   *
   * Example:
   *
   * traceData = traceDataWithinFitBounds(data);
   * for (const points of traceData[tradeId]) {
   *   for (const point of points) {
   *     const [x, y] = pointId;
   *   }
   * }
   */
  private traceDataWithinFitBounds(data: number[][]): number[][][] {
    const dataInFitBounds = [];

    if (!data) {
      return dataInFitBounds;
    }

    const d = data[0];
    for (let i = 0; i < d.length - 1; ++i) {
      dataInFitBounds.push([]);
    }

    if (isNaN(this.fitBounds.xMin)) {
      return dataInFitBounds;
    }

    for (const d of this.data) {
      const x = d[0];
      if (x < this.fitBounds.xMin || x > this.fitBounds.xMax) {
        continue;
      }

      for (let i = 1; i < d.length; ++i) {
        const y = d[i];
        if (y < this.fitBounds.yMin || y > this.fitBounds.yMax) {
          continue;
        }

        dataInFitBounds[i - 1].push([x, y]);
      }
    }
    return dataInFitBounds;
  }


  /**
   * Calculates the extremum of a parabola given the coefficients A, B and
   * C from an equation of the form Ax^2 + Bx + C.
   */
  private getExtremum(A: number, B: number, C: number) {
    const x: number = (A) ? -B / (2 * A) : 0;
    const y: number = A * Math.pow(x, 2) + B * x + C
    return {
      x: x.toFixed(6),
      y: y.toFixed(6),
      isMin: (A > 0),
      isMax: (A < 0),
    }
  }


  /**
   * Generate the geometries and materials for a 1D plot.
   */
  private plotData1D(data: number[][]): void {
    this.dataLimits1D(data);

    if (this.lastData) {
      data.splice(0, 0, this.lastData);
    }

    const ob = this.getSceneObject();

    // Reset fit lines by removing them from the scene. They are fit to the
    // total data, so they are not incrementally built like the data lines.
    for (const line of this.linesFitParabolas) {
      ob.remove(line);
    }
    for (const line of this.linesFitExponentials) {
      ob.remove(line);
    }
    this.linesFitParabolas = [];
    this.linesFitExponentials = [];
    this.set('fitParabolaCoefficients', []);
    this.set('fitExponentialCoefficients', []);

    const dataInFitBounds = this.traceDataWithinFitBounds(this.data);

    const coefficientsPar = [];
    const coefficientsExp = [];

    const lines = [];
    for (const i of this.displayTraces) {
      const color = COLOR_LIST[i % COLOR_LIST.length];

      // Plot the regular data line.
      const line = this.createLine(data, i+1, color, PLOT_LINE_WIDTH);
      lines.push(line);

      const fitData = dataInFitBounds[i];
      const xMin = this.dataLimits.xMin;
      const xMax = this.dataLimits.xMax;
      const trace = this.deps[i];
      const fitLineWidth = PLOT_FIT_LINE_WIDTH;
      let A, B, C;

      // Render any fitted Parabolas
      if (this.fitMode === FIT_OPTION_PARABOLA) {
        const {coefficients: coEff, data: fit} = fitParabola(fitData, xMin, xMax);
        A = coEff.A;
        B = coEff.B;
        C = coEff.C;

        if (isNaN(A) || isNaN(B) || isNaN(C)) {
          continue;
        }

        this.push('fitParabolaCoefficients', {
          A: A.toFixed(6),
          B: B.toFixed(6),
          C: C.toFixed(6),
          extremum: this.getExtremum(A, B, C),
          label: trace.label,
          legend: trace.legend,
          unit: trace.unit
        });

        const fitLine = this.createLine(fit, 1, color, fitLineWidth);
        if (fitLine) {
          this.linesFitParabolas.push(fitLine);
          ob.add(fitLine);
        }
      }

      // Render any fitted Exponentials
      else if (this.fitMode === FIT_OPTION_EXPONENTIAL) {
        const {coefficients: coEff, data: fit} = fitExponential(fitData, xMin, xMax);
        A = coEff.A;
        B = coEff.B;

        if (isNaN(A) || isNaN(B)) {
          continue;
        }

        this.push('fitExponentialCoefficients', {
          A: A.toFixed(6),
          B: B.toFixed(6),
          T1: (B) ? (-1 / B).toFixed(6) : 0,
          label: trace.label,
          legend: trace.legend,
          unit: trace.unit
        });

        const fitLine = this.createLine(fit, 1, color, fitLineWidth);
        if (fitLine) {
          ob.add(fitLine);
          this.linesFitExponentials.push(fitLine);
        }
      }
    }

    for (const line of lines) {
      ob.add(line);
    }
  }


  /**
   * Generate the geometries and materials for a 2D plot.
   */
  private plotData2D(data: number[][]): void {
    this.dataLimits2D(data);

    const numVertices = (this.drawMode2D === 'dots') ?
        1 : this.planeVertexCount;

    // Each vertex of a data point uses three Float32 to place it in 3D space.
    // These positions are set by projectGraphPositions as they change
    // depending on zoom/pan.
    const positions = new Float32Array(data.length * numVertices * 3);

    // Each data point consists of two Float64 representing its x and y
    // coordinate in the 2D space. The data are stored in the geometry so they
    // can be easily reprojected when the zoom/pan changes. These are fixed for
    // the duration of the plot as they exist in Graph Space.
    const dataPoints = new Float64Array(data.length * 3);

    // Each vertex in a data point needs a color associated with it, every
    // vertex in a single data point is the same color.
    // The color is represented by three Float32 representing the red, blue and
    // green as a value between 0 and 1. These are fixed.
    const colors = new Float32Array(data.length * numVertices * 3);

    for (let i = 0, len = data.length; i < len; ++i) {
      const row = data[i];
      dataPoints[i * 3] = row[0];
      dataPoints[i * 3 + 1] = row[1];
      dataPoints[i * 3 + 2] = row[this.displaySurface];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('data', new THREE.BufferAttribute(dataPoints, 3));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

    let material, mesh;
    if (this.drawMode2D === 'dots') {
      material = new THREE.PointsMaterial({
        sizeAttenuation: false,
        size: PLOT_POINT_SIZE,
        vertexColors: THREE.VertexColors
      });
      mesh = new THREE.Points(geometry, material);
    } else {
      material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors});
      mesh = new THREE.Mesh(geometry, material);
    }

    const ob = this.getSceneObject();
    ob.add(mesh);
  }


  /**
   * Set the bounds for a 1D plot.
   */
  private dataLimits1D(data: number[][]): void {
    // Update data limits.
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
  }


  /**
   * Set the bounds for a 2D plot.
   */
  private dataLimits2D(data: number[][]): void {
    for (let row of data) {
      let x = row[0];
      let y = row[1];

      this.dataLimits.xMin = safeMin(this.dataLimits.xMin, x);
      this.dataLimits.xMax = safeMax(this.dataLimits.xMax, x);

      this.dataLimits.yMin = safeMin(this.dataLimits.yMin, y);
      this.dataLimits.yMax = safeMax(this.dataLimits.yMax, y);

      if (this.x0 === null) {
        this.x0 = x;
      } else if (this.dx0 < 0 && x !== this.x0) {
        this.dx0 = Math.abs(x - this.x0);
      }

      if (this.y0 === null) {
        this.y0 = y;
      } else if (this.dy0 < 0 && y !== this.y0) {
        this.dy0 = Math.abs(y - this.y0);
      }

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

    if (this.dataLimits.zMin === this.dataLimits.zMax) {
      this.dataLimits.zMin -= 1;
      this.dataLimits.zMax += 1;
    }
  }


  /**
   * Projects all graph data according to the latest zoom level.
   *
   * Due to the separation of each plot into a WebGL and SVG component, the
   * zoom/pan of the d3 axes needs to lead to the updating of the WebGL
   * display.
   *
   * Each object in the scene is iterated, its original graph data position is
   * extracted and then reprojected to the correct position in WebGL (world)
   * space.
   *
   * There are three primary coordinate systems:
   * 1) Graph Space. The position of the data to be plotted in the graph.
   * 2) Screen Space. The position relative to the plot on screen.
   * 3) World Space. The position of the item in the 3D WebGL projected world.
   */
  private projectGraphPositions(): void {
    this.graphUpdateRequired = false;

    // When plotting lines or single points, we only need one vertex to
    // represent the data.
    const numVertices = (this.numIndeps === 1 || this.drawMode2D === 'dots') ?
        1 : this.planeVertexCount;

    // A reusable buffer for manipulating the coordinates of each point.
    const positionBuffer = new Float32Array(numVertices * 3);

    // Reuse the same vector and object for all coordinate conversions to avoid
    // generating a large amount of garbage causing GC stalls.
    const vector = new THREE.Vector3();
    const screenRect = {x: 0, y: 0, w: 0, h: 0};

    // Project the (0, 0) screen position to world coordinates so that widths
    // and heights in world space can be calculated from the delta.
    this.projectScreenCoordToWorldCoord(0, 0, vector);
    const xWorldZero = vector.x,
          yWorldZero = vector.y;

    const zMin = this.dataLimits.zMin;
    const zMax = this.dataLimits.zMax;

    for (let obj of this.sceneObjects) {
      for (let child of obj.children) {
        const positions = child.geometry.getAttribute('position').array;
        const colorAttr = child.geometry.getAttribute('color');
        const colors = (this.numIndeps === 2) ? colorAttr.array
                                              : [];
        const data = child.geometry.getAttribute('data').array;

        for (let i = 0, len = data.length / 3; i < len; ++i) {
          const positionOffset = i * numVertices * 3;
          const dataOffset = i * 3;

          // Convert the graph (x, y) coordinate to screen coordinates.
          this.projectGraphCoordToScreenRect(data[dataOffset],
                                             data[dataOffset + 1],
                                             screenRect);
          const xScreen = screenRect.x,
                yScreen = screenRect.y,
                wScreen = screenRect.w,
                hScreen = screenRect.h;

          // Convert screen coordinates into world (3D) coordinates.
          this.projectScreenCoordToWorldCoord(xScreen, yScreen, vector);
          const xWorld = vector.x,
                yWorld = vector.y;

          if (this.numIndeps === 1 || this.drawMode2D === 'dots') {
            // When dealing with dots, simply copy the world coordinates
            // into the position array at the correct offset.
            positions[positionOffset] = xWorld;
            positions[positionOffset + 1] = yWorld;
            positions[positionOffset + 2] = 0;
          } else {
            // Project the width and height in screen space to world space,
            // then calculate the size as a delta from world zero.
            this.projectScreenCoordToWorldCoord(wScreen, -hScreen, vector);

            const wWorldEnd = vector.x,
                  hWorldEnd = vector.y;

            const wWorld = wWorldEnd - xWorldZero,
                  hWorld = hWorldEnd - yWorldZero;

            // Copy the plane vertex positions into the buffer for
            // manipulation.
            positionBuffer.set(this.planeVertexPositions);

            // Scale the plane to world width and height.
            this.transformMatrix.makeScale(wWorld, hWorld, 0);
            this.transformMatrix.applyToVector3Array(positionBuffer);

            // Move plane to the appropriate position.
            this.transformMatrix.makeTranslation(xWorld, yWorld, 0);
            this.transformMatrix.applyToVector3Array(positionBuffer);

            // Copy the buffer into the buffer geometry at the correct offset.
            positions.set(positionBuffer, positionOffset);
          }

          if (this.numIndeps === 2) {
            // Update the colors of each point to reflect the latest scaling of
            // the zAxis.
            const color = getColor(data[dataOffset + 2], zMin, zMax);

            // Insert the color of the vertex into the colors array once for each
            // vertex in the data point.
            const numColorVals = numVertices * 3;
            const index = i * numColorVals;
            for (let j = 0; j < numColorVals; j += 3) {
              colors[index + j] = color.r / 255;
              colors[index + j + 1] = color.g / 255;
              colors[index + j + 2] = color.b / 255;
            }
          }
        }
        child.geometry.getAttribute('position').needsUpdate = true;
        child.geometry.computeBoundingSphere();

        if (this.numIndeps === 2) {
          child.geometry.getAttribute('color').needsUpdate = true;
        }

      }
    }
  }


  /**
   * Projects a coordinate in graph coordinates (relative to the axes of the
   * data) to screen coordinates (relative to the canvas). Additionally
   * determines the width and height of the coordinate based on its type.
   *
   * Mutates `outputObject` by setting the projected `x` and `y` coordinate as
   * well as `w` and `h` for the projected width and height.
   */
  private projectGraphCoordToScreenRect(
      x: number, y: number,
      outputObject: {x: number, y: number, w: number, h: number}): void {
    let xScreen, yScreen, wScreen, hScreen;

    if (this.numIndeps === 2) {
      switch (this.drawMode2D) {
        case 'dots':
          // Points have a fixed width relative to the screen regardless of zoom.
          wScreen = PLOT_POINT_SIZE;
          hScreen = wScreen;
          break;

        case 'rectfill':
          wScreen = Math.abs(this.xScale(this.dx0) - this.xScale(0));
          hScreen = Math.abs(this.yScale(this.dy0) - this.yScale(0));
          y += this.dy0;
          break;

        case 'vargrid':
          wScreen = this.xScale(this.xNext[x]) - this.xScale(x),
          hScreen = Math.abs(this.yScale(this.yNext[y]) - this.yScale(y));
          y = this.yNext[y];
          break;

        default:
          // Nothing to do.
          break;
      }

      xScreen = this.xScale(x) + (wScreen / 2);
      yScreen = this.yScale(y) + (hScreen / 2);

      if (this.drawMode2D === 'dots') {
        yScreen = this.yScale(y) - (hScreen / 2);
      }
    } else {
      wScreen = 0;
      hScreen = 0;
      xScreen = this.xScale(x);
      yScreen = this.yScale(y);
    }

    outputObject.x = xScreen;
    outputObject.y = yScreen;
    outputObject.w = wScreen;
    outputObject.h = hScreen;
  }


  /**
   * Projects a coordinate in screen coordinates (relative to the canvas) to
   * world coordinates (relative to the 3D projection of the scene).
   *
   * Mutates `outputVector` to return the projected `x`, `y` and `z`
   * coordinate.
   */
  private projectScreenCoordToWorldCoord(x: number,
                                         y: number,
                                         outputVector: THREE.Vector3) {
    outputVector.set((x / this.width) * 2 - 1,
                     -(y / this.height) * 2 + 1,
                     0.5);
    outputVector.unproject(this.camera);
  }


  private updateZoom() {
    this.updateZoomRequired = false;
    this.graphUpdateRequired = true;
    this.svg.select('.x.axis').call(this.xAxis);
    this.svg.select('.y.axis').call(this.yAxis);
    this.updateFitRectangle();
  }


  /**
   * Updates the Fit Rectangle to be the correct size and position based on the
   * current zoom level of the plot.
   */
  private updateFitRectangle() {
    const fit = this.fitBounds;

    if (isNaN(fit.xMin)) {
      return;
    }

    const [limXMin, limXMax] = this.xScale.domain();
    const [limYMin, limYMax] = this.yScale.domain();

    // If the rectangle moves out of bounds, hide it.
    if (fit.xMin > limXMax || fit.xMax < limXMin ||
        fit.yMax < limYMin || fit.yMin > limYMax) {
      this.$.fitRectangle.style.display = 'none';
      return;
    }

    const borderSize = PLOT_FIT_RECTANGLE_BORDER * 2;
    const xMin = this.xScale(Math.max(fit.xMin, limXMin));
    const xMax = this.xScale(Math.min(fit.xMax, limXMax)) - borderSize;
    const yMin = this.yScale(Math.max(fit.yMin, limYMin)) - borderSize;
    const yMax = this.yScale(Math.min(fit.yMax, limYMax));

    this.$.fitRectangle.style.top = `${yMax + this.margin.top}px`;
    this.$.fitRectangle.style.left = `${xMin + this.margin.left}px`;
    this.$.fitRectangle.style.width = `${xMax - xMin}px`;
    this.$.fitRectangle.style.height = `${yMin - yMax}px`;
    this.$.fitRectangle.style.display = 'block';
  }


  private updateColorBarScale() {
    this.updateColorBarScaleRequired = false;

    if (this.numIndeps === 2) {
      this.zScale.domain([this.dataLimits.zMin, this.dataLimits.zMax]);
      this.zAxis.scale(this.zScale);
      this.svg.select('.z.axis').call(this.zAxis);
    }
  }


  /**
   * Updates the axis scales to reflect the latest data limits.
   */
  private updateScales() {
    this.updateScalesRequired = false;

    this.xScale.domain([this.limits.xMin, this.limits.xMax]);
    this.yScale.domain([this.limits.yMin, this.limits.yMax]);
    this.xAxis.scale(this.xScale);
    this.yAxis.scale(this.yScale);

    this.updateColorBarScale();
  }


  /**
   * Initiates zooming to be handled by the render loop.
   */
  private handleZoom() {
    this.haveZoomed = true;
    this.updateZoomRequired = true;
  }


  /**
   * Reset to original window size after zoom-in.
   */
  private resetZoom() {
    this.haveZoomed = false;
    this.resetZoomRequired = false;

    this.updateScales();

    this.zoom.x(this.xScale);
    this.zoom.y(this.yScale);
    this.updateZoomRequired = true;
  }


  /**
   * Helper function to get mouse position in the coordinates of the svg plot
   * area. The d3.mouse function returns coordinates relative to the full html
   * element, so we must account for the margins. We also clip the coordinates
   * to the available plot area.
   */
  private mousePositionClipped(offset: number): number[] {
    const [x, y] = d3.mouse(this);
    return [
      clip(x - this.margin.left, 0, this.width + offset),
      clip(y - this.margin.top - PLOT_TOP_OFFSET, 0, this.height + offset)
    ];
  }


  /**
   * Zoom into a selected rectangular region on the graph.
   */
  private drawRectangle(rect: HTMLElement): Promise<RectangleBound> {
    // Only trigger zoom rectangle on left click.
    if (d3.event.button !== MOUSE_MAIN_BUTTON) {
      return;
    }

    const [originX, originY] = this.mousePositionClipped(0);

    const promise = new Promise<RectangleBound>((resolve, reject) => {
      d3.select(window)
        .on('mousemove', () => {
          const [x, y] = this.mousePositionClipped(-2 * PLOT_ZOOM_RECTANGLE_BORDER);
          const posX = Math.min(originX, x) + this.margin.left;
          const posY = Math.min(originY, y) + this.margin.top;
          const width = Math.abs(x - originX);
          const height = Math.abs(y - originY);
          rect.style.left = `${posX}px`;
          rect.style.top = `${posY}px`;
          rect.style.width = `${width}px`;
          rect.style.height = `${height}px`;
          rect.style.display = 'block';
        })
        .on('mouseup', () => {
          const [x, y] = this.mousePositionClipped(0);
          d3.select(window)
            .on('mousemove', null)
            .on('mouseup', null);

          if (x === originX || y === originY) {
            reject();
            return;
          }

          // Convert box limits from screen to data coordinates and make sure
          // they are in the right order, regardless of which way the user
          // dragged the box.
          const xScale = this.xScale,
                yScale = this.yScale,
                xMin = Math.min(xScale.invert(originX), xScale.invert(x)),
                xMax = Math.max(xScale.invert(originX), xScale.invert(x)),
                yMin = Math.min(yScale.invert(originY), yScale.invert(y)),
                yMax = Math.max(yScale.invert(originY), yScale.invert(y));

          resolve({xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax});
        }, true);
      d3.event.preventDefault();
      d3.event.stopPropagation();
    });

    return promise;
  }


  /**
   * Hooks the mouse to draw a rectangle for setting the zoom bounds.
   * Sets a callback to set the zoom bounds and zoom on mouse up.
   */
  private async drawZoomRectangle() {
    const rect = this.$.zoomRectangle;
    try {
      const {xMin, xMax, yMin, yMax} = await this.drawRectangle(rect);
      this.zoom.x(this.xScale.domain([xMin, xMax]))
               .y(this.yScale.domain([yMin, yMax]));
    } catch (e) {
      rect.style.display = 'none';
      return;
    }

    rect.style.display = 'none';
    this.handleZoom();
  }


  /**
   * Hooks the mouse to draw a rectangle for bounding the fit on the data.
   * Sets a callback to fit the appropriate function on mouse up.
   */
  private async drawFitRectangle() {
    const rect = this.$.fitRectangle;
    try {
      this.fitBounds = await this.drawRectangle(rect);
    } catch (e) {
      this.fitBounds = {xMin: NaN, xMax: NaN, yMin: NaN, yMax: NaN};
      rect.style.display = 'none';
      return;
    }

    this.redrawScene();
  }


  /**
   * Updates the control event listeners depending on mode.
   */
  private updateControlEventListeners(): void {
    if (!this.isRendering) {
      return;
    }
    const canvas = d3.select(this.renderer.domElement);
    switch (this.mouseMode) {
      case 'pan':
        canvas.call(this.zoom);
        canvas.on('mousedown', null);
        this.$.canvas.style.cursor = 'all-scroll';
        break;

      case 'zoomRect':
        canvas.on('.zoom', null)
        canvas.on('mousedown', () => this.drawZoomRectangle());
        this.$.canvas.style.cursor = 'crosshair';
        break;

      case 'fitRect':
        canvas.on('.zoom', null)
        canvas.on('mousedown', () => this.drawFitRectangle());
        this.$.canvas.style.cursor = 'crosshair';
        break;

      default:
        // Do nothing.
        break;
    }
  }


  /**
   * Update plot style depending on number of variables plotted.
   */
  private updatePlotStyles(): void {
    if (!this.svg) {
      return;
    }

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

      default:
        // Do nothing.
        break;
    }
  }


  /**
   * Resets the current zoom level to fit the data.
   */
  resetZoomControl(): void {
    this.resetZoom();
  }


  /**
   * Sets the control mode to pan/zoom.
   */
  mouseModeSelectorPan(): void {
    this.mouseMode = 'pan';
  }


  /**
   * Sets the control mode to zoom rectangle.
   */
  mouseModeSelectorZoomRect(): void {
    this.mouseMode = 'zoomRect';
  }


  /**
   * Sets the control mode to fit rectangle.
   */
  mouseModeSelectorFitRect(): void {
    this.mouseMode = 'fitRect';
  }


  /**
   * Sets the 2D draw mode to dots.
   */
  drawMode2DSelectorDots(): void {
    this.drawMode2D = 'dots';
  }


  /**
   * Sets the 2D draw mode to rect fill.
   */
  drawMode2DSelectorRectfill(): void {
    this.drawMode2D = 'rectfill';
  }


  /**
   * Sets the 2D draw mode to vargrid.
   */
  drawMode2DSelectorVargrid(): void {
    this.drawMode2D = 'vargrid';
  }


  /**
   * Open the dialog to allow the selection of fitting functions.
   */
  fitFunctionSelectorOpen(): void {
    this.$.fitFunctionSelector.open();
  }


  /**
   * Opens the trace selector dialog window.
   */
  traceSelectorOpen(): void {
    this.$.traceSelector.open();
  }


  /**
   * Selects all available traces.
   */
  traceSelectorSelectAll(): void {
    const selector = Polymer.dom(this.$.traceSelector);
    const checkboxes = selector.querySelectorAll('[name=traces]');
    for (let checkbox of checkboxes) {
      (<HTMLInputElement>checkbox).checked = true;
    }
  }


  /**
   * Selects none of the available traces.
   */
  traceSelectorSelectNone(): void {
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
  traceSelectorSubmit(): void {
    const selected: number[] = [];
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

      default:
        // Nothing to do.
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
      this.redrawScene();
    }
  }


  @observe('xLabel')
  private observeXLabel(newLabel: string, oldLabel: string): void {
    if (this.svg) {
      this.svg.select('#x-label').text(newLabel);
    }
  }


  @observe('yLabel')
  private observeYLabel(newLabel: string, oldLabel: string): void {
    if (this.svg) {
      this.svg.select('#y-label').text(newLabel);
    }
  }


  @observe('mouseMode')
  private observeMouseMode(newMode: string, oldMode: string): void {
    switch (newMode) {
      case 'pan':
        this.$.pan.style.color = 'black';
        this.$.rect.style.color = '#AAAAAA';
        // 2D plots do not have fit functionality.
        if (this.$.fitRect) {
          this.$.fitRect.style.color = '#AAAAAA';
        }
        break;

      case 'zoomRect':
        this.$.pan.style.color = '#AAAAAA';
        this.$.rect.style.color = 'black';
        if (this.$.fitRect) {
          this.$.fitRect.style.color = '#AAAAAA';
        }
        break;

      case 'fitRect':
        this.$.pan.style.color = '#AAAAAA';
        this.$.rect.style.color = '#AAAAAA';
        this.$.fitRect.style.color = 'black';
        break;

      default:
        // Nothing to do.
        break;
    }
    this.updateControlEventListeners();
  }


  @observe('drawMode2D')
  private observeDrawMode2D(newMode: string): void {
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

      default:
        // Nothing to do.
        break;
    }

    // Points and square differences require a complete recreation of the data.
    if (this.isRendering) {
      this.redrawScene();
    }
  }


  @observe('fitMode')
  private observeFitMode() {
    if (this.isRendering) {
      // Hide the fit rectangle if no fit option is selected, otherwise show it
      // as long as a fit box has been drawn.
      if (this.fitMode === FIT_OPTION_NONE) {
        this.$.fitRectangle.style.display = 'none';
      } else if (!isNaN(this.fitBounds.xMin)) {
        this.$.fitRectangle.style.display = 'block';
      }

      this.redrawScene();
    }
  }


  @observe('numIndeps')
  private observeNumIndeps(newNum: number, oldNum: number): void {
    this.updatePlotStyles();
  }


  @listen('mousemove')
  private onCanvasMouseMove(e): void {
    const rect = this.canvasBoundingRect;

    const xMouseScreen = e.pageX - rect.left,
          yMouseScreen = e.pageY - rect.top,
          xMouseGraph = this.xScale.invert(clip(xMouseScreen, 0, this.width)),
          yMouseGraph = this.yScale.invert(clip(yMouseScreen, 0, this.height));

    const xMin = this.xScale.invert(0),
          xMax = this.xScale.invert(this.width),
          yMin = this.yScale.invert(this.height),
          yMax = this.yScale.invert(0),
          dx = (xMax - xMin) / this.width,
          dy = (yMax - yMin) / this.height;

    const xStr = prettyNumber(xMouseGraph, xMin, xMax, dx),
          yStr = prettyNumber(yMouseGraph, yMin, yMax, dy);

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
    xs: number[], x: number, lh: number, rh: number): number {
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


function insertSorted(xs: number[], x: number): number {
  const len = xs.length;
  if (len === 0) {
    xs.push(x);
    return 0;
  }
  return insertInRange(xs, x, 0, len - 1);
}
