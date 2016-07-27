import {Lifetime} from '../scripts/lifetime';
import {ConnectionInfo, ManagerApi} from '../scripts/manager';

@component('labrad-manager')
export class LabradManager extends polymer.Base {

  @property({type: Array, notify: true})
  connections: Array<ConnectionInfo>;

  @property({type: Object, notify: true})
  selectedConnection: {connId: number, name: string};

  mgr: ManagerApi;

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

  private async updateConnections(): Promise<void> {
    const connections = await this.mgr.connections();
    this.splice('connections', 0, this.connections.length);
    for (let c of connections) {
      this.push('connections', c);
    }
  }
}
