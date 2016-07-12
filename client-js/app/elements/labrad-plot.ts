import 'd3';
import * as three from 'three';
import {viridisData} from '../scripts/colormaps';
import * as datavault from "../scripts/datavault";

/**
 * Import the THREE namespace from the module.
 */
const THREE = three.default;


/**
 * Mouse Constants
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

const PLOT_LEFT_MARGIN = 120;
const PLOT_RIGHT_MARGIN = 10;
const PLOT_TOP_MARGIN = 50;
const PLOT_BOTTOM_MARGIN = 50;

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


  /**
   * The base size of a point of data when in `dots` viewing mode.
   */
  private dotBaseSize: number = 4;


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
      this.planeUnitGeometry.attributes.position.array;


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
   * moving the camera around the 3D space provided by `THREE.js`. As such,
   * camera properties such as position and zoom never change.
   */
  private camera = new THREE.PerspectiveCamera(
    this.cameraOpts.fov,
    this.cameraOpts.aspect,
    this.cameraOpts.near,
    this.cameraOpts.far);

  /** The scene to render graphs to. */
  private scene = new THREE.Scene();

  /** A WebGL renderer for the scene. */
  private renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});

  /** A list of objects in the scene. */
  private sceneObjects = [];

  /** If the scene render loop has been started. */
  private isRendering: boolean = false;

  /** If a zoom in or out is taking place. */
  private isZooming = false;

  /** If we have ever zoomed since last resetting the zoom level. */
  private haveZoomed: boolean = false;


  /**
   * Add new data to the plot and re-zoom.
   * Fires when new data arrives via the socket.
   */
  addData(data: number[][]) {
    if (data.length === 0) return;
    const lastData = (this.data.length > 0) ?
        this.data[this.data.length - 1] : null;
    for (let row of data) {
      this.splice('data', this.data.length, 0, row);
    }
    this.plotData(data);

    if (!this.haveZoomed) {
      this.resetZoom();
    } else {
      this.projectGraphPositions();
    }
  }


  /**
   * Redraw the plot and attach resize to the window resize event.
   * Fires when the component is attached to the DOM.
   */
  attached() {
    this.render();
    window.addEventListener('resize', (e) => this.resizePlot());
  }


  /**
   * Resets the current zoom level to fit the data.
   */
  resetZoomControl() {
    this.resetZoom();
  }


  /**
   * Creates and renders the SVG and WebGL portions of the graph.
   */
  private render(): void {
    if (this.isRendering) {
      return;
    }

    this.isRendering = true;

    // Initialize SVG portions of plot.
    this.initializeSVGPlot();

    // Initialize WebGL portions of plot.
    this.initializeWebGLPlot();

    // Resize the plot to be the correct dimensions.
    this.resizePlot();
  }


  /**
   * Resizes the SVG and WebGL portions of the plots.
   */
  private resizePlot() {
    this.resizeSVGPlot();
    this.resizeWebGLPlot();
    this.projectGraphPositions();
  }


  /**
   * Begins the scene rendering loop.
   */
  private renderScene(): void {
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.renderScene());
  }


  /**
   * Deletes all objects from the scene and re-plots the data.
   */
  redrawScene(): void {
    for (let obj of this.sceneObjects) {
      this.scene.remove(obj);
    }
    this.sceneObjects = [];

    this.lastData = null;
    this.plotData(this.data);
    this.projectGraphPositions();
  }


  /**
   * Initializes the WebGL portion of the plot.
   */
  private initializeWebGLPlot(): void {
    this.scene.add(this.camera);
    this.scene.add(new THREE.AmbientLight(0xffffff));
    this.camera.position.copy(this.cameraOpts.startingPosition);
    this.$.canvas.appendChild(this.renderer.domElement);
    this.renderScene();
  }


  /**
   * Initializes the SVG portion of the plot.
   */
  private initializeSVGPlot(): void {
    const p = this;

    // Make room for the color bar if necessary.
    if (p.numIndeps == 2) {
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
            .on('zoom', () => p.zoomEventHandler());

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

    // Color Bar Axis
    if (p.numIndeps == 2) {
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

      // The Color Bar Gradient
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

      // Color Bar Rectangle
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
  private resizeWebGLPlot() {
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.$.canvas.style.top = `${this.margin.top}px`;
    this.$.canvas.style.left = `${this.margin.left}px`;
  }


  /**
   * Resize the SVG portion of the plot.
   */
  private resizeSVGPlot(): void {
    const plot = this.$.plot;
    const plotBounds = plot.getBoundingClientRect();
    const plotWidth = Math.max(plotBounds.width, 400);
    const plotHeight = Math.max(plotBounds.height, 400);

    // The inner dimensions of the plot, sans margins
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

    const xLabXOffset = this.width / 2;
    const xLabYOffset = this.height + this.margin.bottom - 10;
    this.svg.select('#x-label')
              .attr('transform', `translate(${xLabXOffset}, ${xLabYOffset})`);

    this.svg.select("#y-axis")
              .call(this.yAxis);

    this.svg.select('#y-label')
              .attr('x', -(this.height / 2))
              .attr('y', -this.margin.left);

    if (this.numIndeps == 2) {
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
  private plotData(data: number[][]) {
    if (data.length === 0) return;

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
   * Generate the geometries and materials for a 1D plot.
   */
  private plotData1D(data: number[][]) {
    this.dataLimits1D(data);

    const ob = new THREE.Object3D();

    for (let i of this.displayTraces) {
      const length = (this.lastData) ? data.length + 1 : data.length;
      const positions = new Float32Array(length * 3);
      const dataPoints = new Float64Array(length * 2);

      let offset = 0;

      // Add the last point of data if it exists to avoid gaps.
      if (this.lastData) {
        dataPoints[offset] = this.lastData[0];
        dataPoints[offset + 1] = this.lastData[i+1];
        offset += 2;
      }

      for (let row of data) {
        dataPoints[offset] = row[0];
        dataPoints[offset + 1] = row[i + 1];
        offset += 2;
      }

      if (dataPoints.length > 1) {
        const geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.addAttribute('data', new THREE.BufferAttribute(dataPoints, 2));

        let material = new THREE.LineBasicMaterial({
          color: COLOR_LIST[i % COLOR_LIST.length],
          linewidth: 1.5
        });
        let mesh = new THREE.Line(geometry, material);
        ob.add(mesh);
      }
    }

    this.sceneObjects.push(ob);
    this.scene.add(ob);
  }


  /**
   * Generate the geometries and materials for a 2D plot.
   */
  private plotData2D(data: number[][]) {
    this.dataLimits2D(data);

    const zMin = this.dataLimits.zMin;
    const zMax = this.dataLimits.zMax;
    const numVertices = (this.drawMode2D == 'dots') ?
        1 : this.planeVertexCount;

    const positions = new Float32Array(data.length * numVertices * 3);
    const dataPoints = new Float64Array(data.length * 2);
    const colors = new Float32Array(data.length * numVertices * 3);

    for (let i = 0, len = data.length; i < len; ++i) {
      const row = data[i];
      const color = getColor(row[this.displaySurface], zMin, zMax);

      dataPoints[i * 2] = row[0];
      dataPoints[i * 2 + 1] = row[1];

      const numColorVals = numVertices * 3;
      const index = i * numColorVals;
      for (let j = 0; j < numColorVals; j += 3) {
        colors[index + j] = color.r / 255;
        colors[index + j + 1] = color.g / 255;
        colors[index + j + 2] = color.b / 255;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('data', new THREE.BufferAttribute(dataPoints, 2));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

    let material, mesh;
    if (this.drawMode2D == 'dots') {
      material = new THREE.PointsMaterial({size: 1, vertexColors: THREE.VertexColors});
      mesh = new THREE.Points(geometry, material);
    } else {
      material = new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors});
      mesh = new THREE.Mesh(geometry, material);
    }

    const ob = new THREE.Object3D();
    ob.add(mesh);

    this.sceneObjects.push(ob);
    this.scene.add(ob);
  }


  /**
   * Set the bounds for a 1D plot.
   */
  private dataLimits1D(data: number[][]) {
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
  }


  /**
   * Set the bounds for a 2D plot.
   */
  private dataLimits2D(data: number[][]) {
    console.info("dataLimits2D", data.length);
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
  }


  /**
   * Projects a coordinate in graph coordinates (relative to the axes of the
   * data) to screen coordinates (relative to the canvas). Additionally
   * determines the width and height of the coordinate based on its type.
   */
  private projectGraphCoordToScreenRect(
      x: number, y: number,
      outputObject: {x: number, y: number, w: number, h: number}) {
    let wScreen, hScreen;

    switch (this.drawMode2D) {
    case 'dots':
      wScreen = this.dotBaseSize;
      hScreen = wScreen;
      break;

    case 'rectfill':
      wScreen = Math.abs(this.xScale(this.dx0) - this.xScale(0));
      hScreen = Math.abs(this.yScale(this.dy0) - this.yScale(0));
      break;

    case 'vargrid':
      wScreen = this.xScale(this.xNext[x]) - this.xScale(x),
      hScreen = Math.abs(this.yScale(this.yNext[y]) - this.yScale(y));
      y = this.yNext[y];
      break;
    }

    const xScreen = this.xScale(x) + (wScreen / 2);
    const yScreen = this.yScale(y) + (hScreen / 2);

    outputObject.x = xScreen;
    outputObject.y = yScreen;
    outputObject.w = wScreen;
    outputObject.h = hScreen;
  }


  /**
   * Projects a coordinate in screen coordinates (relative to the canvas) to
   * world coordinates (relative to the 3D projection of the scene).
   */
  private projectScreenCoordToWorldCoord(x: number, y: number, outputVector: THREE.Vector3) {
    outputVector.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1, 0.5);
    outputVector.unproject(this.camera);
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
  private projectGraphPositions() {
    // When plotting lines or single points, we only need one vertex to
    // represent the data.
    const numVertices = (this.numIndeps == 1 || this.drawMode2D == 'dots') ?
        1 : this.planeVertexCount;

    // A reusable buffer for manipulating the coordinates of each point.
    const positionBuffer = new Float32Array(numVertices * 3);

    // Reuse the same vector and object for all coordinate conversions to avoid
    // generating a large amount of garbage causing GC stalls.
    const vector = new THREE.Vector3();
    const screenRect = { x: 0, y: 0, w: 0, h: 0 };

    // Project the (0, 0) screen position to world coordinates so that widths
    // and heights in world space can be calculated from the delta.
    this.projectScreenCoordToWorldCoord(0, 0, vector);
    const {
      x: xWorldZero,
      y: yWorldZero
    } = vector;

    for (let obj of this.sceneObjects) {
      for (let child of obj.children) {
        let array = child.geometry.attributes.position.array;
        let data = child.geometry.attributes.data.array;

        for (let i = 0, len = data.length / 2; i < len; ++i) {
          const positionOffset = i * numVertices * 3;

          // Convert the graph (x, y) coordinate to screen coordinates.
          this.projectGraphCoordToScreenRect(data[i * 2], data[i*2+1], screenRect);
          const {
            x: xScreen,
            y: yScreen,
            w: wScreen,
            h: hScreen
          } = screenRect;

          // Convert screen coordinates into world (3D) coordinates.
          this.projectScreenCoordToWorldCoord(xScreen, yScreen, vector);
          const {
            x: xWorld,
            y: yWorld
          } = vector;

          if (this.numIndeps == 1 || this.drawMode2D == 'dots') {
            // When dealing with dots, simply copy the world coordinates
            // into the position array at the correct offset.
            array[positionOffset] = xWorld;
            array[positionOffset + 1] = yWorld;
          } else {
            // Project the width and height in screen space to world space,
            // then calculate the size as a delta from world zero.
            this.projectScreenCoordToWorldCoord(wScreen, -hScreen, vector);
            const {
              x: wWorldEnd,
              y: hWorldEnd
            } = vector;
            const wWorld = wWorldEnd - xWorldZero;
            const hWorld = hWorldEnd - yWorldZero;

            // Copy the plane vertex positions into the buffer for manipulation
            positionBuffer.set(this.planeVertexPositions);

            // Scale the plane to world width and height
            this.transformMatrix.makeScale(wWorld, hWorld, 0);
            this.transformMatrix.applyToVector3Array(positionBuffer);

            // Move plane to the appropriate position
            this.transformMatrix.makeTranslation(xWorld, yWorld, 0);
            this.transformMatrix.applyToVector3Array(positionBuffer);

            // Copy the buffer into the buffer geometry at the correct offset
            array.set(positionBuffer, positionOffset);
          }
        }
        child.geometry.attributes.position.needsUpdate = true;

        // If we are drawing dots, we need to scale them so they are a constant
        // size relative to the screen regardless of zoom level.
        if (this.drawMode2D == 'dots') {
          this.projectGraphCoordToScreenRect(0, 0, screenRect);
          const {w: wScreen} = screenRect;
          this.projectScreenCoordToWorldCoord(wScreen, 0, vector);
          const {x: wWorldEnd} = vector;
          const wWorld = wWorldEnd - xWorldZero;
          child.material.size = wWorld;
        }
      }
    }
  }


  /**
   * Updates axes and reprojects all data to reflect the new zoom level.
   */
  private handleZoom() {
    this.svg.select('.x.axis').call(this.xAxis);
    this.svg.select('.y.axis').call(this.yAxis);
    this.projectGraphPositions();
    this.isZooming = false;
  }


  /**
   * Queues zoom handling on the next animation frame.
   */
  private zoomEventHandler(): void {
    if (!this.isZooming) {
      requestAnimationFrame(() => this.handleZoom());
      this.isZooming = true;
      this.haveZoomed = true;
    }
  }


  /**
   * Zoom into a selected rectangular region on the graph.
   */
  private zoomRectangle() {
    // Only trigger zoom rectangle on left click
    if (d3.event.button !== MOUSE_MAIN_BUTTON) {
      return;
    }

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
                       .attr('fill', '#eee')
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
        this.handleZoom();
      }, true);
    d3.event.preventDefault();
    d3.event.stopPropagation();
  }


  /**
   * Updates the control event listeners depeding on mode.
   */
  private updateControlEventListeners() {
    if (!this.isRendering) {
      return;
    }
    const canvas = d3.select(this.renderer.domElement);
    switch (this.mouseMode) {
      case 'pan':
        canvas.on('mousedown', null);
        canvas.call(this.zoom);
        this.$.canvas.style.cursor = 'all-scroll';
        break;

      case 'zoomRect':
        canvas.on('.zoom', null)
        canvas.on('mousedown', () => this.zoomRectangle());
        this.$.canvas.style.cursor = 'crosshair';
        break;
    }
  }


  /**
   * Update plot style depending on number of variables plotted.
   */
  private updatePlotStyles() {
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


  /**
   * Reset to original window size after zoom-in.
   */
  resetZoom() {
    this.haveZoomed = false;
    this.xScale.domain([this.limits.xMin, this.limits.xMax]);
    this.yScale.domain([this.limits.yMin, this.limits.yMax]);
    this.zScale.domain([this.dataLimits.zMin, this.dataLimits.zMax]);
    this.xAxis.scale(this.xScale);
    this.yAxis.scale(this.yScale);
    this.zoom.x(this.xScale);
    this.zoom.y(this.yScale);

    if (this.numIndeps == 2) {
      this.zAxis.scale(this.zScale);
    }

    this.handleZoom();
  }


  /**
   * Sets the control mode to pan/zoom.
   */
  mouseModeSelectorPan() {
    this.mouseMode = 'pan';
  }


  /**
   * Sets the control mode to zoom rectangle.
   */
  mouseModeSelectorZoomRect() {
    this.mouseMode = 'zoomRect';
  }


  /**
   * Sets the 2D draw mode to dots.
   */
  drawMode2DSelectorDots() {
    this.drawMode2D = 'dots';
  }


  /**
   * Sets the 2D draw mode to rect fill.
   */
  drawMode2DSelectorRectfill() {
    this.drawMode2D = 'rectfill';
  }


  /**
   * Sets the 2D draw mode to vargrid.
   */
  drawMode2DSelectorVargrid() {
    this.drawMode2D = 'vargrid';
  }


  /**
   * Opens the trace selector dialog window.
   */
  traceSelectorOpen() {
    this.$.traceSelector.open();
  }


  /**
   * Selects all available traces.
   */
  traceSelectorSelectAll() {
    const selector = Polymer.dom(this.$.traceSelector);
    const checkboxes = selector.querySelectorAll('[name=traces]');
    for (let checkbox of checkboxes) {
      (<HTMLInputElement>checkbox).checked = true;
    }
  }


  /**
   * Selects none of the available traces.
   */
  traceSelectorSelectNone() {
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
  traceSelectorSubmit() {
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
  private observeXLabel(newLabel: string, oldLabel: string) {
    if (this.svg) {
      this.svg.select('#x-label').text(newLabel);
    }
  }


  @observe('yLabel')
  private observeYLabel(newLabel: string, oldLabel: string) {
    if (this.svg) {
      this.svg.select('#y-label').text(newLabel);
    }
  }


  @observe('mouseMode')
  private observeMouseMode(newMode: string, oldMode: string) {
    switch (newMode) {
      case 'pan':
        this.$.pan.style.color = 'black';
        this.$.rect.style.color = '#AAAAAA';
        break;

      case 'zoomRect':
        this.$.pan.style.color = '#AAAAAA';
        this.$.rect.style.color = 'black';
        break;

      default:
        // Nothing to do.
        break;
    }
    this.updateControlEventListeners();
  }


  @observe('drawMode2D')
  private observeDrawMode2D(newMode: string) {
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


  @observe('numIndeps')
  private observeNumIndeps(newNum: number, oldNum: number) {
    this.updatePlotStyles();
  }


  @listen('canvas.mousemove')
  private listenPlotMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();

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
