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

  /**
   * on a path change, we deselect everything, empty filterText
   */
  @observe('path')
  pathChanged(newPath: string[], oldPath: string[]) {
    this.selDir = null;
    this.selKey = null;
    this.selectType = null;
    this.filterText = '';
  }

  /**
   * triggers re-render of dir, key lists when filterText is changed
   */
  @observe('filterText')
  reloadMenu() {
    this.regex = new RegExp(this.filterText, 'i');
    this.$.dirList.render();
    this.$.keyList.render();
  }

  /**
   * called when dir, key lists are populated. Returns entries 
   * that contain substring in filterText
   */
  filterFunc(item) {
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

  async repopulateList(): Promise<void> {
    var resp = await this.socket.dir({path: this.path});
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
    this.$.pendingDialog.close()
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
  async updateKey(event) {
    var selKey = event.detail.key;
    var newVal = event.detail.value;
    try {
      await this.socket.set({path: this.path, key: selKey, value: newVal});
      this.repopulateList();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Drag and drop logic
   */
  @listen('dragenter')
  onDragEnter(event) {
    event.preventDefault(); //I don't understand this.
  }

  @listen('dragleave')
  onDragLeave(event) {
    event.preventDefault(); //I don't understand this. But it needs to be here
  }

  /**
   * allows the ctrl key to be pressed to change cursor between copy/move
   */
  @listen('dragover')
  onDragOver(event) {
    event.preventDefault(); //I don't understand this. But needs to be here
    if (event.ctrlKey) {
      event.dataTransfer.dropEffect = "copy";
    }
    else {
      event.dataTransfer.dropEffect = "move";
    }
  }

  @listen('dragstart')
  startDrag(event) {
    //detect start of drag event, grab info about target
    var data: any; //I tried enum, but kept getting errors...
    data = {path: this.path, name: event.target.name};
    console.log('drag started', data);
    event.dataTransfer.setData('text', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'copyMove';
  }

  onDirDragOver(event) {
    event.currentTarget.classList.add('over');
  }

  onDirDragLeave(event) {
    event.currentTarget.classList.remove('over');
  }

  @listen('dragend')
  endDrag(event) {
    console.log('drag ended',event);
  }

  /**
   * behaviour for dropping on folders
   */
  dirDrop(event) {
    console.log(event);
    var data = JSON.parse(event.dataTransfer.getData('text'));
    console.log('dirDrop',event.button);
    event.target.closest('td').classList.remove('over');
    if (event.ctrlKey || event.button == 2 ) {
      console.log('dropped on', event.target.closest('td').name, 'with data', data ); 
      var newPath: string[] = this.path.slice(),
          oldFullPath: string[] = data.path,
          dialog = this.$.dragCopyDialog,
          copyOriginName = this.$.originName,
          copyOriginPath = this.$.originPath,
          copyNameElem = this.$.dragCopyNameInput,
          copyPathElem = this.$.dragCopyPathInput;
      newPath.push(event.target.closest('td').name);
      copyNameElem.value = data.name;
      copyOriginName.textContent = data.name;
      copyOriginPath.textContent = JSON.stringify(data.path);
      copyPathElem.value = this.pathToString(newPath);
      dialog.open();
      window.setTimeout(() => copyNameElem.$.input.focus(), 0);
    }
  }

  /**
   * handles folders dropped not into folders
   */
  @listen('drop')
  handleDrop(event) {
    event.preventDefault();
    var data = JSON.parse(event.dataTransfer.getData('text'));
    console.log('dropped', event.dataTransfer);
    if (event.ctrlKey) {
      if (JSON.stringify(this.path) != JSON.stringify(data.path)) {
        //Comparing strings is lame, I know
        console.log('copying into window', this.path, data.path);
        var oldFullPath: string[] = data.path,
            dialog = this.$.dragCopyDialog,
            copyOriginName = this.$.originName,
            copyOriginPath = this.$.originPath,
            copyNameElem = this.$.dragCopyNameInput,
            copyPathElem = this.$.dragCopyPathInput;
        copyNameElem.value = data.name;
        copyOriginName.textContent = data.name;
        copyOriginPath.textContent = JSON.stringify(data.path);
        copyPathElem.value = this.pathToString(this.path);
        this.$.dragCopyDialog.open();
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
  async doNewKey() {
    var newKey = this.$.newKeyInput.value;
    var newVal = this.$.newValueInput.value;

    if (newKey) {
      try {
        await this.socket.set({path: this.path, key: newKey, value: newVal});
        this.repopulateList();
      } catch (error) {
        this.handleError(error);
      }
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
  async doEditValue() {
    var key = this.$.editValueDialog.keyName,
        newVal = this.$.editValueInput.value;
    try {
      await this.socket.set({path: this.path, key: key, value: newVal});
      this.repopulateList();
    } catch (error) {
      this.handleError(error);
    }
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
  async doNewFolder() {
    var newFolder = this.$.newFolderInput.value;

    if (newFolder) {
      try {
        await this.socket.mkDir({path: this.path, dir: newFolder})
        this.repopulateList();
      } catch (error) {
        this.handleError(error);
      }
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
  async doCopy() {
    var newName =  this.$.copyNameInput.value;
    var newPath = JSON.parse(this.$.copyPathInput.value);


    try {
      if (this.selectType === 'dir') {
        this.$.pendingDialog.open();
        this.$.pendingOp.innerText = "Copying...";
        await this.socket.copyDir({path: this.path, dir: this.selDir, newPath: newPath, newDir: newName});
      }
      else if (this.selectType === 'key') {
        await this.socket.copy({path: this.path, key: this.selKey, newPath: newPath, newKey: newName});
      }
      this.repopulateList();
    } catch (error) {
      this.handleError(error);
    }
  }

  async doDragCopy() {
    var newName =  this.$.dragCopyNameInput.value;
    var newPath = JSON.parse(this.$.dragCopyPathInput.value);
    var oldPath = JSON.parse(this.$.originPath.textContent);
    var oldName = this.$.originName.textContent;

    this.$.pendingDialog.open();
    this.$.pendingOp.innerText = "Copying...";

    try {
      var resp = await this.socket.copyDir({path: oldPath, dir: oldName, newPath: newPath, newDir: newName});
      console.log(resp)//this.repopulateList();
      this.$.pendingDialog.close()
      this.$.toastTextSuccess.show();
    } catch (error) {
      this.handleError(error);
    }
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
  async doRename() {
    var newName = this.$.renameInput.value;

    var name: string;
    switch (this.selectType) {
      case 'dir': name = this.selDir; break;
      case 'key': name = this.selKey; break;
      default: return;
    }

    if (newName === null || newName === name) return;
    if (newName) {
      try {
        if (this.selectType === 'dir') {
          await this.socket.renameDir({path: this.path, dir: name, newDir: newName});
        }
        else if (this.selectType === 'key') {
          await this.socket.rename({path: this.path, key: name, newKey: newName});
        }
        this.repopulateList();
      } catch (error) {
        this.handleError(error);
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
  async doDelete() {
    try {
      if (this.selectType === 'dir') {
        this.$.pendingDialog.open();
        this.$.pendingOp.innerText = "Deleting...";
        await this.socket.rmDir({path: this.path, dir: this.selDir});
      }
      else if (this.selectType === 'key') {
        await this.socket.del({path: this.path, key: this.selKey});
      }
      this.repopulateList();
    } catch (error) {
      this.handleError(error);
    }
  }
}
