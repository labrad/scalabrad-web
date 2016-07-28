import {ConnectionInfo, ManagerApi} from '../scripts/manager';

@component('labrad-manager')
export class LabradManager extends polymer.Base {

  @property({type: Array, notify: true})
  connections: Array<ConnectionInfo>;

  @property({type: Object, notify: true})
  selectedConnection: {connId: number, name: string};

  mgr: ManagerApi;

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

    // Remove the connection from the array to notify the UI
    const numConnections = this.connections.length;
    for (let i = 0; i < numConnections; ++i) {
      if (this.connections[i].id == id) {
        this.splice('connections', i, 1);
        break;
      }
    }
  }
}
