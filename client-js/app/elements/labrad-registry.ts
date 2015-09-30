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

  @property({type: String, notify: true, value: null})
  selDir: string;

  @property({type: String, notify: true, value: null})
  selKey: string;

  @property({type: String, notify: true, value: null})
  selectType: string;

  @property({type: String, notify: true, value: ''})
  filterText: string;

  regex: RegExp; //regular expression for string comparison

  //Helper Functions
  @observe('path')
  pathChanged(newPath: string[], oldPath: string[]) {
    // on a path change, we deselect everything, empty filterText
    this.selDir = null;
    this.selKey = null;
    this.selectType = null;
    this.filterText = '';
  }

  @observe('filterText')
  reloadMenu() {
    //triggers re-render of dir, key lists when filterText is changed
    this.regex = new RegExp(this.filterText, 'i');
    this.$.dirList.render();
    this.$.keyList.render();
  }

  filterFunc(item) {
    // called when dir, key lists are populated. Returns entries that contain
    // substring in filterText
    return item.name.match(this.regex);
  }

  selectKey() {
    this.selDir = null;
    this.selectType = 'key';
  }

  selectDir() {
    this.selKey = null;
    this.selectType = 'dir';
  }

  @computed()
  selected(selectType: string, selDir: string, selKey: string): boolean {
    console.log('selectType', selectType, 'selDir', selDir, 'selKey', selKey);
    return (selectType === 'dir' && selDir != null) || (selectType === 'key' && selKey != null);
  }

  incrementSelector() {
    console.log(this.selKey);
    //TODO increment selected key on tab
  }

  repopulateList(): Promise<void> {
    return this.socket.dir({path: this.path}).then((resp) => {
      this.selKey = null;
      this.selDir = null;
      this.splice('dirs', 0, this.dirs.length);
      this.splice('keys', 0, this.keys.length);

      for (var i in resp.dirs) {
        this.push('dirs', {name: resp.dirs[i], url: this.createUrl(resp.path, resp.dirs[i])});
      }
      for (var j in resp.keys) {
        this.push('keys', {name: resp.keys[j], value: resp.vals[j]});
      }
    });
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


  /**
   * Update a key in response to change in the inline form submission.
   */
  @listen('iron-form-submit')
  updateKey(event) {
    var selKey = event.detail.key;
    var newVal = event.detail.value;
    this.socket.set({path: this.path, key: selKey, value: newVal})
      .then(() => this.repopulateList())
      .catch((reason) => this.handleError(reason));
  }

  //Drag and drop
  @listen('dragenter')
  @listen('dragover')
  suppressBehaviour(event) {
    //change colors of cells to indicate target
    event.preventDefault(); //I don't understand this.
    event.target.closest('td').classList.add('over');
  }

  @listen('dragleave')
  leaveDrag(event) {
    //change colors of cells back to normal
    event.preventDefault(); //I don't understand this.
    event.target.closest('td').classList.remove('over');
  }

  @listen('dragstart')
  startDrag(event) {
    //detect start of drag event, grab info about target
    var data: any; //I tried enum, but kept getting errors...
    data = {path: this.path, name: event.target.name};
    //console.log('drag started', this.path);
    event.dataTransfer.setData('text', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'move';
    if (event.ctrlKey) {
      this.$.toastText.text = "copy item...";
      this.$.toastText.show();
    }
    else {
      this.$.toastText.text = "move... not implemented yet :/ ctrl+click to copy";
      this.$.toastText.show();
    }
  }

  @listen('dragend')
  endDrag(event) {
    console.log('drag ended',event);
  }

  @listen('drop')
  handleDrop(event) {
    event.preventDefault();
    var data: any;
    data = JSON.parse(event.dataTransfer.getData('text'));
    event.target.closest('td').classList.remove('over');

    if (event.ctrlKey) {
      //console.log('dropped on', event.target.closest('td').name, 'with data', data ); 
      if (event.target.closest('td').className.includes('dir')) {
        //place folder into new folder
        //I don't know if .closest('td') is too fragile but it works
        var newPath: string[] = this.path.splice(0);
        var oldFullPath: string[] = data.path;
        newPath.push(event.target.closest('td').name);
        var dialog = this.$.dragCopyDialog,
            copyOriginName = this.$.originName,
            copyOriginPath = this.$.originPath,
            copyNameElem = this.$.dragCopyNameInput,
            copyPathElem = this.$.dragCopyPathInput;
        copyNameElem.value = data.name;
        copyOriginName.textContent = data.name;
        copyOriginPath.textContent = JSON.stringify(data.path);
        copyPathElem.value = this.pathToString(newPath);
        dialog.open();
        window.setTimeout(() => copyNameElem.$.input.focus(), 0);
      }
      else if (JSON.stringify(this.path) != JSON.stringify(data.path)){
        //copying into window by dropping not on a folder, but 
        //can't copy into the same path
        console.log('copying into window', this.path, data.path);
        var newPath: string[] = this.path.splice(0);
        var oldFullPath: string[] = data.path;

        var dialog = this.$.dragCopyDialog,
            copyOriginName = this.$.originName,
            copyOriginPath = this.$.originPath,
            copyNameElem = this.$.dragCopyNameInput,
            copyPathElem = this.$.dragCopyPathInput;
        copyNameElem.value = data.name;
        copyOriginName.textContent = data.name;
        copyOriginPath.textContent = JSON.stringify(data.path);
        copyPathElem.value = this.pathToString(newPath);
        dialog.open();
        window.setTimeout(() => copyNameElem.$.input.focus(), 0);
      }
    }
  }


  /**
   * Launch new key dialog.
   */
  newKeyClicked(event) {
    var dialog = this.$.newKeyDialog,
        newKeyElem = this.$.newKeyInput,
        newValueElem = this.$.newValueInput;
    newKeyElem.value = '';
    newValueElem.value = '';
    dialog.open();
    window.setTimeout(() => newKeyElem.$.input.focus(), 0);
  }

  /**
   * Create new key.
   */
  doNewKey() {
    var newKey = this.$.newKeyInput.value;
    var newVal = this.$.newValueInput.value;

    if (newKey) {
      this.socket.set({path: this.path, key: newKey, value: newVal})
        .then(() => this.repopulateList())
        .catch((reason) => this.handleError(reason));
    }
    else {
      this.handleError('Cannot create key with empty name');
    }
  }

  /**
   * Launch the value edit dialog.
   */
  editValueClicked(event) {
    var dialog = this.$.editValueDialog,
        editValueElem = this.$.editValueInput,
        name = event.target.keyName,
        value: string = null,
        found = false;
    for (let item of this.keys) {
      if (item.name == name) {
        value = item.value;
        found = true;
        break;
      }
    }
    if (!found) {
      return;
    }
    editValueElem.value = value;
    dialog.keyName = name;
    dialog.open();
    window.setTimeout(() => editValueElem.$.input.$.textarea.focus(), 0);
  }

  /**
   * Submit the edited value to the server.
   */
  doEditValue() {
    var key = this.$.editValueDialog.keyName,
        newVal = this.$.editValueInput.value;
    this.socket.set({path: this.path, key: key, value: newVal})
      .then(() => this.repopulateList())
      .catch((reason) => this.handleError(reason));
  }

  /**
   * Launch new folder dialog.
   */
  newFolderClicked() {
    var dialog = this.$.newFolderDialog,
        newFolderElem = this.$.newFolderInput;
    newFolderElem.value = '';
    dialog.open();
    window.setTimeout(() => newFolderElem.$.input.focus(), 0);
  }

  /**
   * Create new folder.
   */
  doNewFolder() {
    var newFolder = this.$.newFolderInput.value;

    if (newFolder) {
      this.socket.mkDir({path: this.path, dir: newFolder})
        .then(() => this.repopulateList())
        .catch((reason) => this.handleError(reason));
    }
    else {
      this.handleError('Cannot create folder with empty name');
    }
  }


  /**
   * Launch copy dialog.
   */
  copyClicked() {
    var dialog = this.$.copyDialog,
        copyNameElem = this.$.copyNameInput,
        copyPathElem = this.$.copyPathInput;
    copyNameElem.value = this.selDir || this.selKey;
    copyPathElem.value = this.pathToString(this.path);
    dialog.open();
    window.setTimeout(() => copyNameElem.$.input.focus(), 0);
  }

  /**
   * Copy the selected key or folder.
   */
  doCopy() {
    var newName =  this.$.copyNameInput.value;
    var newPath = JSON.parse(this.$.copyPathInput.value);

    if (this.selectType === 'dir') {
      this.socket.copyDir({path: this.path, dir: this.selDir, newPath: newPath, newDir: newName})
        .then(() => this.repopulateList())
        .catch((reason) => this.handleError(reason));
    }
    else if (this.selectType === 'key') {
      this.socket.copy({path: this.path, key: this.selKey, newPath: newPath, newKey: newName})
        .then(() => this.repopulateList())
        .catch((reason) => this.handleError(reason));
    }
  }

  doDragCopy() {
    var self = this;
    var newName =  this.$.dragCopyNameInput.value;
    var newPath = JSON.parse(this.$.dragCopyPathInput.value);
    var oldPath = JSON.parse(this.$.originPath.textContent);
    var oldName = this.$.originName.textContent;

    this.socket.copyDir({path: oldPath, dir: oldName, newPath: newPath, newDir: newName}).then(
      (resp) => {
        self.repopulateList(resp);
        this.$.toastText.text = "Directory Copied Successfully!";
        this.$.toastText.show();
      },
      (reason) => self.handleError(reason)
    );

  }


  /**
   * Launch rename dialog.
   */
  renameClicked() {
    var dialog = this.$.renameDialog,
        renameElem = this.$.renameInput;

    var name: string;
    switch (this.selectType) {
      case 'dir': name = this.selDir; break;
      case 'key': name = this.selKey; break;
      default: return;
    }

    renameElem.value = name;
    dialog.open();
    window.setTimeout(() => renameElem.$.input.focus(), 0);
  }

  /**
   * Rename the selected key or folder.
   */
  doRename() {
    var newName = this.$.renameInput.value;

    var name: string;
    switch (this.selectType) {
      case 'dir': name = this.selDir; break;
      case 'key': name = this.selKey; break;
      default: return;
    }

    if (newName === null || newName === name) return;
    if (newName) {
      if (this.selectType === 'dir') {
        this.socket.renameDir({path: this.path, dir: name, newDir: newName})
          .then(() => this.repopulateList())
          .catch((reason) => this.handleError(reason));
      }
      else if (this.selectType === 'key') {
        this.socket.rename({path: this.path, key: name, newKey: newName})
          .then(() => this.repopulateList())
          .catch((reason) => this.handleError(reason));
      }
    }
    else {
      this.handleError(`Cannot rename ${this.selectType} to empty string`);
    }
  }


  /**
   * Launch the delete confirmation dialog.
   */
  deleteClicked() {
    this.$.deleteDialog.open();
  }

  /**
   * Delete the selected key or folder.
   */
  doDelete() {
    if (this.selectType === 'dir') {
      this.socket.rmDir({path: this.path, dir: this.selDir})
        .then(() => this.repopulateList())
        .catch((reason) => this.handleError(reason));
    }
    else if (this.selectType === 'key') {
      this.socket.del({path: this.path, key: this.selKey})
        .then(() => this.repopulateList())
        .catch((reason) => this.handleError(reason));
    }
  }
}
