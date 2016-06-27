/**
 * Allows efficient generation of SVG icon nodes.
 *
 * The base iron-icon functionality provides numerous event listeners and data
 * binding properties that make them tremendously slow if you just want them
 * for their artistic merits. Generates SVG and container DOM nodes and caches
 * them so that repeated calls are performant.
 */
export class IronIconBakery {
  private styleNamespace_ = '';
  private icons_: Object = {};



  /**
   * Create a new IronIconBakery for a given namespace. This will be the name
   * of the component making use of the bakery. It will append this name as a
   * class to the icon so that appropriate style-scoping by Polymer continues.
   */
  constructor(styleNamespace: string) {
    this.styleNamespace_ = styleNamespace;
  }


  /**
   * Generates and caches the DOM elements required to render an icon-icon
   * efficiently.
   */
  public get(name: string, className?: string) {
    if (this.icons_.hasOwnProperty(name)) {
      return this.icons_[name].cloneNode(true);
    }

    const container = document.createElement('div');
    container.className = this.styleNamespace_ + ' style-scope iron-icon iron-icon-0 ' + (className || name);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('style', 'width: 24px; height: 24px;');

    const group = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    const path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    path.setAttribute('d', this.paths_(name));
    group.appendChild(path);
    svg.appendChild(group);
    container.appendChild(svg);

    this.icons_[name] = container;
    return container;
  }


  /**
   * Returns the SVG path for a specific icon.
   * Icons taken from iron-icons.
   */
  private paths_(name: string) {
    switch (name) {
      case 'stars':
        return 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z';
      case 'arrow-back':
        return 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z';
      case 'folder':
        return 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z';
      case 'editor:insert-chart':
        return 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z';
      case 'trash':
        return 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z';
    }
    return '';
  }
}
