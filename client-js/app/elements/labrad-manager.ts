/// <reference types="polymer-ts" />

import {Lifetime} from '../scripts/lifetime';
import {ConnectionInfo, ManagerApi} from '../scripts/manager';
import {Places} from "../scripts/places";

@component('labrad-manager')
export class LabradManager extends polymer.Base {

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
