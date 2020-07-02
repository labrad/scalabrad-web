import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

import {Lifetime} from '../scripts/lifetime';
import {ConnectionInfo, ManagerApi} from '../scripts/manager';
import {Places} from "../scripts/places";

@customElement('labrad-manager')
export class LabradManager extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <style>
        :host {
        display: block;
        }
        table {
        width: 100%;
        border-collapse: collapse;
        }
        td {
        padding: 0.3em 0.5em;
        font-size: 15px;
        }
        thead th {
        background-color: #673AB7;
        color: white;
        padding: 0.5em;
        }
        tbody tr:nth-child(odd) {
        background-color: #EEEEEE;
        }
        tbody tr:nth-child(odd):hover {
        background-color: #F6F699;
        }
        tbody tr:nth-child(even):hover {
        background-color: #FFFFAA;
        }
        .close {
        text-align: center;
        }
        td.close {
        font-size: 20px;
        }
        .close a {
        text-decoration: none;
        }
        .close a:hover {
        color: #f00;
        }
        p.connection {
        text-align: center;
        font-weight: 800;
        margin-top: 0px;
        }
      </style>
      <table>
        <thead>
          <tr>
            <th>Id</th>
            <th>Type</th>
            <th>Name</th>
            <th>Server Reqs</th>
            <th>Server Reps</th>
            <th>Client Reqs</th>
            <th>Client Reps</th>
            <th>Messages Sent</th>
            <th>Messages Recv</th>
            <th class='close'>Close</th>
          </tr>
        </thead>
        <tbody>
          <template is="dom-repeat" items="{{connections}}">
            <tr>
              <td><span>{{item.id}}</span></td>
              <td>
                <template is="dom-if" if="{{item.server}}">
                  <span>Server</span>
                </template>
                <template is="dom-if" if="{{!item.server}}">
                  <span>Client</span>
                </template>
              </td>
              <td>
                <template is="dom-if" if="{{item.server}}">
                  <a is="app-link" path="{{item.url}}" href="{{item.url}}">
                    <span>{{item.name}}</span>
                  </a>
                </template>
                <template is="dom-if" if="{{!item.server}}">
                  <span>{{item.name}}</span>
                </template>
              </td>
              <td><span>{{item.serverReqCount}}</span></td><!-- TODO: only if server, else '-' -->
              <td><span>{{item.serverRespCount}}</span></td>
              <td><span>{{item.clientReqCount}}</span></td><!-- TODO: only if active, else '-' -->
              <td><span>{{item.clientRespCount}}</span></td>
              <td><span>{{item.msgSendCount}}</span></td>
              <td><span>{{item.msgRecvCount}}</span></td>
              <td class='close'>
                <span>
                  <a href='#closeConnection:{{item.id}}'
                    conn-id='{{item.id}}'
                    conn-name='{{item.name}}'
                    on-tap='closeConnection'>×</a>
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <paper-dialog id="closeConnectionConfirmation" modal>
        <h1>Close Connection</h1>
        <p>Are you sure you want to close the connection?</p>
        <p class='connection'>({{selectedConnection.connId}}) {{selectedConnection.name}}</p>
        <div class="buttons">
          <paper-button on-tap="closeConnectionConfirmed"
                        dialog-confirm autofocus>Yes</paper-button>
          <paper-button dialog-dismiss>No</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  @property({type: Array, notify: true, value: () => []})
  connections: ConnectionInfo[];

  @property({type: Object, notify: true})
  selectedConnection: {connId: number, name: string};

  mgr: ManagerApi;
  places: Places;

  private lifetime: Lifetime = new Lifetime();

  attached() {
    const interval = setInterval(() => this.updateConnections(), 2000);
    this.lifetime.defer(() => clearInterval(interval));
  }

  detached() {
    this.lifetime.close();
  }

  closeConnection(event) {
    this.selectedConnection = {
      connId: event.currentTarget.connId,
      name: event.currentTarget.connName
    };

    const dialog = this.$.closeConnectionConfirmation;
    dialog.open();

    event.preventDefault();
  }

  closeConnectionConfirmed() {
    const id = this.selectedConnection.connId;

    this.mgr.connectionClose(id);
    this.selectedConnection = null;
    this.updateConnections();
  }

  setConnections(connections: ConnectionInfo[]) {
    for (let c of connections) {
      if (c.server) {
        c.url = this.places.serverUrl(c.name);
      }
    }
    this.splice('connections', 0, this.connections.length, ...connections);
  }

  private async updateConnections(): Promise<void> {
    const connections = await this.mgr.connections();
    this.setConnections(connections);
  }
}
