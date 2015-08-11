import {RegistryApi, RegistryListing} from '../scripts/registry';

@component('labrad-registry')
export class LabradRegistry extends polymer.Base {

  @property({type: Array, notify: true})
  dirs: Array<any>;

  @property({type: Array, notify: true})
  keys: Array<any>;

  @property({type: Array, notify: true})
  path: Array<string>;

  @property({type: Object})
  socket: RegistryApi;

  @property({type: String, notify: true})
  notify: string;

  selDir: any;
  selKey: any;
  selectType: string;

  clickHandler(e) {
    console.log('clickhandler', e);
    var button = e.target;
    while (!button.hasAttribute('data-dialog') && button !== document.body) {
      button = button.parentElement;
    }

    if (!button.hasAttribute('data-dialog')) {
      return;
    }

    var id = button.getAttribute('data-dialog');
    var dialog = this.$[id];
    if (dialog) {
      dialog.open();
      console.log('opening dialog');
    }
  }

  //Helper Functions
  selectKey() {
    this.selDir = null;
    this.selectType = 'key';
  }

  selectDir() {
    this.selKey = null;
    this.selectType = 'dir';
  }

  incrementSelector() {
    console.log(this.selKey);
    //TODO increment selected key on tab
  }

  repopulateList(resp: RegistryListing) {
    this.selDir = null;
    this.splice('dirs', 0, this.dirs.length);
    this.splice('keys', 0, this.keys.length);

    for (var i in resp.dirs) {
      this.push('dirs', {name: resp.dirs[i], url: this.createUrl(resp.path, resp.dirs[i])});
    }
    for (var j in resp.keys) {
      this.push('keys', {name: resp.keys[j], value: resp.vals[j]});
    }
  }

  createUrl(path: Array<string>, dir: string): string {
    var pathUrl = '/registry/';
    if (path.length === 0) {
      return pathUrl + dir;
    }//not sure if this is the best way to handle this edge case
    for (var i in path) {
      pathUrl += path[i] + '/';
    }
    console.log(pathUrl + dir);
    return pathUrl + dir;
  }

  pathToString(path) {
    return JSON.stringify(path);
  }

  handleError(error) {
    //we can add a more creative way of displaying errors here
    console.log(error);
  }

  /////////////////////
  //Interface Functions
  ////////////////////
  doDelete() {
    var self = this;

    if (this.selectType === 'dir') {
      this.socket.rmDir({path: this.path, dir: this.selDir}).then(
        (resp) => self.repopulateList(resp),
        (reason) => self.handleError(reason) // Error!
      );
    }
    else if (this.selectType === 'key') {
      this.socket.del({path: this.path, key: this.selKey}).then(
        (resp) => self.repopulateList(resp),
        (reason) => self.handleError(reason) // Error!
      );
    }
  }

  doRename() {
    var self = this;

    if (this.selectType === 'dir') {
      this.socket.renameDir({path: this.path, dir: this.selDir, newDir: this.$.newNameInput.value}).then(
        (resp) => self.repopulateList(resp),
        (reason) => self.handleError(reason)
      );
    }
    else if (this.selectType === 'key') {
      this.socket.rename({path: this.path, key: this.selKey, newKey: this.$.newNameInput.value}).then(
        (resp) => self.repopulateList(resp),
        (reason) => self.handleError(reason)
      );
    }
  }

  doCopy() {
    var self = this;
    var newName =  this.$.copyNameInput.value;
    var newPath = JSON.parse(this.$.copyPathInput.value);

    if (this.selectType === 'dir') {
      this.socket.copyDir({path: this.path, dir: this.selDir, newPath: newPath, newDir: newName}).then(
        (resp) => self.repopulateList(resp),
        (reason) => self.handleError(reason)
      );
    }
    else if (this.selectType === 'key') {
      this.socket.copy({path: this.path, key: this.selKey, newPath: newPath, newKey: newName}).then(
        (resp) => self.repopulateList(resp),
        (reason) => self.handleError(reason)
      );
    }
  }

  createNewKey() {
    var self = this;
    var newKey = this.$.newKeyInput.value;
    var newVal = this.$.newValueInput.value;

    if (newKey) {
      this.socket.set({path: this.path, key: newKey, value: newVal}).then(
        (resp) => self.repopulateList(resp),
        (reason) => self.handleError(reason)
      );
    }
    else {
      this.handleError('Cannot create key');
    }
  }

  createNewFolder() {
    var self = this;
    var newName = this.$.nameInput.value;

    if (this.$.nameInput.value) {
      this.socket.mkDir({path: this.path, dir: newName}).then(
        (resp) => self.repopulateList(resp),
        (reason) => self.handleError(reason)
      );
    }
    else {
      this.handleError('Cannot create folder named empty string');
    }
  }

  @listen('iron-form-submit')
  updateKey(event) {
    console.log('iron-form-submit', event);
    var self = this;
    var selKey = Object.keys(event.detail)[0];
    var newVal = event.detail[selKey];
    this.socket.set({path: this.path, key: selKey, value: newVal}).then(
      (resp) => {
        self.repopulateList(resp);
        self.selKey = null;
      },
      (reason) => self.handleError(reason)
    );
  }
}
