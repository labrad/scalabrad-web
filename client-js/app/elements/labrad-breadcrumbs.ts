import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

export interface BreadcrumbItem {
  name: string;
  isLink: boolean;
  url?: string;
}

@customElement('labrad-breadcrumbs')
export class LabradBreadcrumbs extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <style>
        ul {
          padding-left: 0.5em;
          display: inline;
          white-space: nowrap;
          list-style-type: none;
        }
        li {
          display: inline;
        }
        ul.path {
          padding: 0;
        }
        li.dir:before {
          content: "/";
        }
        li.extra {
          margin-left: 0.5em;
        }
        a {
          color: white;
        }
      </style>
      <ul class="path">
        <template is="dom-repeat" items="{{breadcrumbs}}">
          <li class="dir">
            <template is="dom-if" if="{{item.isLink}}">
              <a is="app-link" path="{{item.url}}" href="{{item.url}}"><span>{{item.name}}</span></a>
            </template>
            <template is="dom-if" if="{{!item.isLink}}">
              <span>{{item.name}}</span>
            </template>
          </li>
        </template>
        <template is="dom-if" if="{{extras}}">
          <li class="extra">|</li>
        </template>
        <template is="dom-repeat" items="{{extras}}">
          <li class="extra">
            <template is="dom-if" if="{{item.isLink}}">
              <a is="app-link" path="{{item.url}}" href="{{item.url}}"><span>{{item.name}}</span></a>
            </template>
            <template is="dom-if" if="{{!item.isLink}}">
              <span>{{item.name}}</span>
            </template>
          </li>
        </template>
      </ul>
    `;
  }

  @property({type: Array, notify: true})
  breadcrumbs: BreadcrumbItem[];

  @property({type: Array, notify: true})
  extras: BreadcrumbItem[];
}
