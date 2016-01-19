import {RegistryApi, RegistryListing} from '../scripts/registry';
import {Places} from '../scripts/places';

@component('labrad-registry')
export class LabradRegistry extends polymer.Base {

  @property({type: Array, notify: true})
  dirs: Array<{name: string; url: string}>;

  @property({type: Array, notify: true})
  keys: Array<{name: string; value: string}>;

  @property({type: Array, notify: true})
  path: Array<string>;

  @property({type: Array, notify: true})
  selectedIdx: number;

  @property({type: Object})
  socket: RegistryApi;

  @property()
  places: Places;

  @property({type: String, notify: true})
  notify: string;

  @property({type: Number, value: 0})
  kick: number;

  @property({type: String, notify: true, value: ''})
  filterText: string;

  regex: RegExp; //regular expression for string comparison

  /**
   * on a path change, we deselect everything, empty filterText
   */
  @observe('path')
  pathChanged(newPath: string[], oldPath: string[]) {
    this.selectedIdx = null;
    this.filterText = '';
  }

  /**
   * triggers re-render of dir, key lists when filterText is changed
   */
  @observe('filterText')
  reloadMenu() {
    this.regex = new RegExp(this.filterText, 'i');
    this.$.fullList.render();
  }

  /**
   * called when dir, key lists are populated. Returns entries 
   * that contain substring in filterText
   */
  filterFunc(item) {
    return item.name.match(this.regex);
  }

  @computed()
  listItems(
    path: Array<string>,
    dirs: Array<{name: string; url: string}>,
    keys: Array<{name: string; value: string}>,
    kick: number
  ): Array<{name: string; isParent: boolean; isDir: boolean; isKey: boolean; url?: string; value?: string}> {
    var items = [];
    if (path.length > 0 && this.places) {
      var url = this.places.registryUrl(path.slice(0, -1));
      items.push({name: '..', isParent: true, isDir: false, isKey: false, url: url});
    }
    for (let dir of dirs) {
      items.push({name: dir.name, isParent: false, isDir: true, isKey: false, url: dir.url});
    }
    for (let key of keys) {
      items.push({name: key.name, isParent: false, isDir: false, isKey: true, value: key.value});
    }
    return items;
  }

  @computed()
  selected(selectedIdx: number): boolean {
    if (selectedIdx !== null) {
        return true;
      } else {
        return false;
      }
  }

  @property({computed: '_computeSelectedType(selectedIdx)'})
  selectedType: string;

  @property({computed: '_computeSelectedItem(selectedIdx)'})
  selectedItem: string;

  _computeSelectedType(selectedIdx: number): string {
    var offset = this.path.length > 0 ? 1 : 0; // account for parent '..' entry
    if (this.dirs && selectedIdx < this.dirs.length + offset) {
      return 'dir';
    } else {
      return 'key';
    }
  }

  _computeSelectedItem(selectedIdx: number): string {
    var offset = this.path.length > 0 ? 1 : 0; // account for parent '..' entry
    var dirNames = (this.dirs || []).map(it => it.name);
    var keyNames = (this.keys || []).map(it => it.name);
    return dirNames.concat(keyNames)[selectedIdx - offset];
  }

  incrementSelector() {
    //TODO increment selected key on tab
  }

  async repopulateList(): Promise<void> {
    var resp = await this.socket.dir({path: this.path});
    this.splice('dirs', 0, this.dirs.length);
    this.splice('keys', 0, this.keys.length);

    for (var i in resp.dirs) {
      this.push('dirs', {name: resp.dirs[i], url: this.places.registryUrl(resp.path, resp.dirs[i])});
    }
    for (var j in resp.keys) {
      this.push('keys', {name: resp.keys[j], value: resp.vals[j]});
    }

    this.$.pendingDialog.close()
    this.$.combinedList.selected = null;
    this.kick++;
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
    data = {path: this.path, name: event.target.name, kind: event.target.className.split(' ')[0]};
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
    event.stopPropagation();
    var data = JSON.parse(event.dataTransfer.getData('text'));
    this.$.dragDialog.dragData = data;
    var newPath: string[] = this.path.slice();
    newPath.push(event.target.closest('td').name);
    event.target.closest('td').classList.remove('over');
    this.$.dragNameInput.value = data.name;
    this.$.dragClass.textContent = data.kind;
    this.$.originName.textContent = data.name;
    this.$.originPath.textContent = JSON.stringify(data.path);
    this.$.dragPathInput.value = this.pathToString(newPath);

    if (event.ctrlKey || event.button == 2 ) {
      //should I use switch and case here instead of ifs?
      this.$.dragOp.innerText = 'Copy';
      this.$.dragDialog.open();
      setTimeout(() => this.$.dragPathInput.$.input.focus(), 0);
    } else {
      this.$.dragOp.innerText = 'Move';
      this.$.dragDialog.open();
      setTimeout(() => this.$.dragPathInput.$.input.focus(), 0);
    }

  }

  /**
   * handles folders dropped not into folders
   */
  @listen('drop')
  handleDrop(event) {
    event.preventDefault();
    var data = JSON.parse(event.dataTransfer.getData('text'));
    this.$.dragDialog.dragData = data;
    event.target.closest('td').classList.remove('over');
    this.$.dragNameInput.value = data.name;
    this.$.dragClass.textContent = data.kind;
    this.$.originName.textContent = data.name;
    this.$.originPath.textContent = JSON.stringify(data.path);
    this.$.dragPathInput.value = this.pathToString(this.path);

    if (event.ctrlKey) {
      this.$.dragOp.innerText = 'Copy';
      this.$.dragDialog.open();
      setTimeout(() => this.$.dragPathInput.$.input.focus(), 0);
    } else if(JSON.stringify(this.path) != JSON.stringify(data.path)) {
      this.$.dragOp.innerText = 'Move';
      this.$.dragDialog.open();
      setTimeout(() => this.$.dragPathInput.$.input.focus(), 0);
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
    copyNameElem.value = this.selectedItem;
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
      if (this.selectedType === 'dir') {
        this.$.pendingDialog.open();
        this.$.pendingOp.innerText = "Copying...";
        await this.socket.copyDir({path: this.path, dir: this.selectedItem, newPath: newPath, newDir: newName});
      }
      else if (this.selectedType === 'key') {
        await this.socket.copy({path: this.path, key: this.selectedItem, newPath: newPath, newKey: newName});
      }
      this.repopulateList();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Execute the drag operation
   */
  async doDragOp() {
    var newName =  this.$.dragNameInput.value;
    var newPath = JSON.parse(this.$.dragPathInput.value);
    var oldPath = JSON.parse(this.$.originPath.textContent);
    var oldName = this.$.originName.textContent;

    if (this.$.dragOp.innerText === 'Copy') {
      try {
        this.$.pendingDialog.open();
        this.$.pendingOp.innerText = "Copying...";
        switch (this.$.dragDialog.dragData['kind']) {
          case "dir":
            var resp = await this.socket.copyDir({path: oldPath, dir: oldName, newPath: newPath, newDir: newName});
            break;

          case "key":
            var resp = await this.socket.copy({path: oldPath, key: oldName, newPath: newPath, newKey: newName});
            break;
        }
      } catch (error) {
        this.handleError(error);
      } finally {
        this.$.pendingDialog.close();
        this.$.toastCopySuccess.show();
      }
    }
    else if (this.$.dragOp.innerText === 'Move') {
      try {
        this.$.pendingDialog.open();
        this.$.pendingOp.innerText = "Moving...";
        switch (this.$.dragDialog.dragData['kind']) {
          case "dir":
            var resp = await this.socket.moveDir({path: oldPath, dir: oldName, newPath: newPath, newDir: newName});
            break;

          case "key":
            var resp = await this.socket.move({path: oldPath, key: oldName, newPath: newPath, newKey: newName});
            break;
        }
      } catch (error) {
        this.handleError(error);
      } finally {
        this.$.pendingDialog.close();
        this.$.toastMoveSuccess.show();
      }
    }
  }


  /**
   * Launch rename dialog.
   */
  renameClicked() {
    var dialog = this.$.renameDialog,
        renameElem = this.$.renameInput;

    var name = this.selectedItem;

    renameElem.value = name;
    dialog.open();
    window.setTimeout(() => renameElem.$.input.focus(), 0);
  }

  /**
   * Rename the selected key or folder.
   */
  async doRename() {
    //TODO add pending modal dialog for renames since they are copy commands and take a long time
    var newName = this.$.renameInput.value;

    var name = this.selectedItem;

    if (newName === null || newName === name) return;
    if (newName) {
      try {
        if (this.selectedType === 'dir') {
          await this.socket.renameDir({path: this.path, dir: name, newDir: newName});
        }
        else if (this.selectedType === 'key') {
          await this.socket.rename({path: this.path, key: name, newKey: newName});
        }
        this.repopulateList();
      } catch (error) {
        this.handleError(error);
      }
    }
    else {
      this.handleError(`Cannot rename ${this.selectedType} to empty string`);
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
      if (this.selectedType === 'dir') {
        this.$.pendingDialog.open();
        this.$.pendingOp.innerText = "Deleting...";
        await this.socket.rmDir({path: this.path, dir: this.selectedItem});
      }
      else if (this.selectedType === 'key') {
        await this.socket.del({path: this.path, key: this.selectedItem});
      }
      this.repopulateList();
    } catch (error) {
      this.handleError(error);
    }
  }
}
