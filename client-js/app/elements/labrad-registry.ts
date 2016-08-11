import {RegistryApi, RegistryListing} from '../scripts/registry';
import {Places} from '../scripts/places';

type ListItem = {
  name: string,
  isParent: boolean,
  isDir: boolean,
  isKey: boolean,
  url?: string,
  value?: string,
};

@component('labrad-registry')
export class LabradRegistry extends polymer.Base {

  @property({type: Array, notify: true, value: () => []})
  dirs: {name: string; url: string}[];

  @property({type: Array, notify: true, value: () => []})
  keys: {name: string; value: string}[];

  @property({type: Array, notify: true, value: () => []})
  path: string[];

  @property({type: Array, value: () => []})
  filteredListItems: ListItem[];

  @property({type: Array, value: () => []})
  private listItems: ListItem[];

  @property({type: Object, notify: true, value: () => {}})
  selected: ListItem;

  @property({type: Object})
  socket: RegistryApi;

  @property()
  places: Places;

  @property({type: String, notify: true})
  notify: string;

  @property({type: String, notify: true, value: ''})
  filterText: string;

  regex: RegExp; //regular expression for string comparison

  @property({type: String, notify: true, value: ''})
  errorMessage: string;

  @property({type: String, notify: true, value: ''})
  errorTitle: string;

  target: HTMLElement = document.body;

  private dialogs: string[] = [
    'newKeyDialog',
    'editValueDialog',
    'newFolderDialog',
    'dragDialog',
    'copyDialog',
    'renameDialog',
    'deleteDialog',
    'pendingDialog',
  ];

  attached() {
    this.bindIronAutogrowTextAreaResizeEvents(this.$.newKeyDialog,
                                              this.$.newValueInput);

    this.bindIronAutogrowTextAreaResizeEvents(this.$.editValueDialog,
                                              this.$.editValueInput);

    for (const dialog of this.dialogs) {
      this.$[dialog].addEventListener('iron-overlay-closed', this.resetError.bind(this));
    }
  }


  private getListOffset(): number {
    return this.path.length > 0 ? 1 : 0;
  }


  private getDefaultSelectedItem(): number {
    const offset = this.getListOffset();
    return (this.filteredListItems.length > 1) ? offset : 0;
  }


  private getSelectedIndex(): number {
    const index = this.filteredListItems.indexOf(this.selected);
    if (index === -1) {
      return null;
    }
    return index;
  }


  private scrollToIndex(index: number): void {
    const list = this.$.combinedList;
    const first = list.firstVisibleIndex;
    const last = list.lastVisibleIndex;

    if (index < first) {
      list.scrollToIndex(index);
    } else if (index > last) {
      list.scrollToIndex(index - (last - first));
    }
  }


  private getOpenDialog() {
    for (const dialog of this.dialogs) {
      if (this.$[dialog].opened) {
        return this.$[dialog];
      }
    }
    return null;
  }


  cursorMove(event) {
    if (this.getOpenDialog()) {
      return;
    }

    this.searchSubmit();
    event.detail.keyboardEvent.preventDefault();

    const length = this.listItems.length;
    const selectedIndex = this.getSelectedIndex();
    const list = this.$.combinedList;

    switch (event.detail.combo) {
      case 'up':
        if (selectedIndex !== null && selectedIndex !== 0) {
          list.selectItem(selectedIndex - 1);
          this.scrollToIndex(selectedIndex - 1);
        }
        break;

      case 'down':
        if (selectedIndex === null) {
          list.selectItem(0);
          this.scrollToIndex(0);
        } else if (selectedIndex < length - 1) {
          list.selectItem(selectedIndex + 1);
          this.scrollToIndex(selectedIndex + 1);
        }
        break;

      default:
        // Nothing to do.
        break;
    }
  }


  cursorTraverse(event) {
    if (this.getSelectedIndex() === null || this.getOpenDialog() || this.$.search.focused) {
      return;
    }

    const item = this.$.combinedList.selectedItem;

    // If we have an item, we want to traverse down.
    if (!item) {
      return;
    }

    // If we have a link, we want to traverse down.
    if (item.url) {
      this.fire('app-link-click', {path: item.url});
    } else {
      this.editValueSelected();
    }
  }


  cursorBack(event) {
    if (this.path.length === 0 || this.getOpenDialog() || this.$.search.focused) {
      return;
    }

    const parentPath = this.path.slice(0, -1);
    const parentUrl = this.places.registryUrl(parentPath);
    this.fire('app-link-click', {path: parentUrl});
  }


  searchSubmit() {
    if (this.$.search.focused) {
      this.$.search.inputElement.blur();
    }
  }


  dialogSubmit(event) {
    const dialog = this.getOpenDialog();
    if (!dialog) {
      return;
    }

    // New keys have a textbox, so we only want to submit on Shift+Enter,
    // not on a solo enter keypress.
    if (event.detail.combo !== 'shift+enter') {
      if (dialog.id == 'newKeyDialog' || dialog.id === 'editValueDialog') {
        return;
      }
    }

    event.detail.keyboardEvent.preventDefault();

    switch (dialog.id) {
      case 'newKeyDialog':
        this.doNewKey();
        break;

      case 'editValueDialog':
        this.doEditValue();
        break;

      case 'newFolderDialog':
        this.doNewFolder();
        break;

      case 'renameDialog':
        this.doRename();
        break;

      case 'copyDialog':
        this.doCopy();
        break;

      default:
        // Nothing to do.
        break;
    }
  }


  dialogCancel(event) {
    const dialog = this.getOpenDialog();
    if (!dialog) {
      return;
    }
    event.detail.keyboardEvent.preventDefault();
    dialog.close();
  }


  /**
   * On path change, select the default element and clear the filter.
   */
  @observe('path')
  pathChanged(newPath: string[], oldPath: string[]) {
    this.set('filterText', '');
  }

  applyFilterToListItems() {
    if (!this.listItems) {
      return;
    }

    this.regex = new RegExp(this.filterText, 'i');
    this.set('filteredListItems', this.listItems.filter((item) => {
      return (!!item.name.match(this.regex));
    }));
  }

  /**
   * Filters the directory/key listing when filterText changes.
   */
  @observe('filterText')
  filterListing() {
    this.applyFilterToListItems();

    if (this.filteredListItems && this.filteredListItems.length) {
      this.$.combinedList.selectItem(0);
    }
  }


  private getSelectedType(): string {
    // Account for parent '..' entry.
    const offset = this.getListOffset();
    if (this.dirs && this.getSelectedIndex() < this.dirs.length + offset) {
      return 'dir';
    } else {
      return 'key';
    }
  }


  /**
   * This is called whenever a newItem is added, hooked in actitives.
   */
  async repopulateList(): Promise<void> {
    const resp = await this.socket.dir({path: this.path});

    this.splice('dirs', 0, this.dirs.length);
    this.splice('keys', 0, this.keys.length);
    this.splice('listItems', 0, this.listItems.length);

    if (this.path.length > 0 && this.places) {
      const url = this.places.registryUrl(this.path.slice(0, -1));
      this.push('listItems', {
        name: '..',
        isParent: true,
        isDir: false,
        isKey: false,
        url: url
      });
    }

    for (const name of resp.dirs) {
      const url = this.places.registryUrl(resp.path, name);
      this.push('dirs', {
        name: name,
        url: url,
      });
      this.push('listItems', {
        name: name,
        isParent: false,
        isDir: true,
        isKey: false,
        url: url
      });
    }

    for (const j in resp.keys) {
      const name = resp.keys[j];
      const value = resp.vals[j];
      this.push('keys', {
        name: name,
        value: value,
      });

      this.push('listItems', {
        name: name,
        isParent: false,
        isDir: false,
        isKey: true,
        value: value
      });
    }

    const selected = this.selected;
    this.applyFilterToListItems();

    let index = this.getDefaultSelectedItem();

    // If there was a previously selected item, say we were editing one, then
    // we want to reselect it after the list is repopulated. To do this we
    // fuzzy match the objects by requiring either the name or the value to be
    // the same. This handles both the case of renaming a dir/key or changing
    // the value of it.
    if (selected) {
      for (let i = 0; i < this.filteredListItems.length; ++i) {
        const item = this.filteredListItems[i];
        if (item.name == selected.name || item.value == selected.value) {
          index = i;
          break;
        }
      }
    }

    this.$.combinedList.selectItem(index);
    this.$.pendingDialog.close()
  }


  pathToString(path) {
    return JSON.stringify(path);
  }


  computeSelectedClass(selected: ListItem): string {
    return (selected) ? 'iron-selected' : '';
  }


  private resetError() {
    this.set('errorMessage', 'a');
    this.set('errorTitle', 'a');
  }


  handleError(errorMessage, element: HTMLElement, errorTitle:string = '') {
    this.set('errorMessage', errorMessage);
    this.set('errorTitle', errorTitle);
    if (element) {
      element.focus();
      Polymer.Base.fire('iron-resize', null, {node: element});
    }
    console.error(errorMessage);
  }


  /**
   * Drag and drop logic.
   */
  @listen('dragenter')
  onDragEnter(event) {
    event.preventDefault();
  }


  @listen('dragleave')
  onDragLeave(event) {
    event.preventDefault();
  }


  /**
   * Allows the ctrl key to be pressed to change cursor between copy/move.
   */
  @listen('dragover')
  onDragOver(event) {
    event.preventDefault();

    if (event.ctrlKey) {
      event.dataTransfer.dropEffect = 'copy';
    }
    else {
      event.dataTransfer.dropEffect = 'move';
    }
  }


  @listen('dragstart')
  startDrag(event) {
    // Detect start of drag event, grab info about target.
    const data = {
      path: this.path,
      name: event.target.name,
      kind: event.target.className.split(' ')[0]
    };
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
  endDrag(event) {}


  /**
   * Behaviour for dropping on folders.
   */
  dirDrop(event) {
    const newPath: string[] = this.path.slice();
    newPath.push(event.target.closest('div').name);
    this.performDrop(newPath, event);
  }


  /**
   * Handles folders dropped not into folders.
   */
  @listen('drop')
  handleDrop(event) {
    this.performDrop(this.path, event);
  }


  performDrop(path: string[], event): void {
    event.stopPropagation();
    event.preventDefault();

    const data = JSON.parse(event.dataTransfer.getData('text'));
    this.$.dragDialog.dragData = data;
    event.target.closest('div').classList.remove('over');

    this.$.dragNameInput.value = data.name;
    this.$.dragClass.textContent = data.kind;
    this.$.originName.textContent = data.name;
    this.$.originPath.textContent = JSON.stringify(data.path);
    this.$.dragPathInput.value = this.pathToString(path);

    if (event.ctrlKey || event.button == 2) {
      this.$.dragOp.innerText = 'Copy';
    } else if (JSON.stringify(path) != JSON.stringify(data.path)) {
      this.$.dragOp.innerText = 'Move';
    } else {
      return;
    }

    this.$.dragDialog.open();
  }


  /**
   * Bind event listeners to resize dialog box appropriately when an
   * `iron-autogrow-textarea` is used.
   *
   * This works around an issue where it does not fire an `iron-resize` event
   * when the value updates, and hence a `paper-dialog` is not informed to
   * update its size or position to accomodate the change in content size.
   */
  bindIronAutogrowTextAreaResizeEvents(paperDialog: HTMLElement,
                                       ironAutogrowTextarea: HTMLElement) {
    ironAutogrowTextarea.addEventListener('bind-value-changed', () => {
      Polymer.Base.fire('iron-resize', null, {node: ironAutogrowTextarea});
    });
  }


  /**
   * Launch new key dialog.
   */
  newKeyClicked(event) {
    const dialog = this.$.newKeyDialog,
          newKeyElem = this.$.newKeyInput,
          newValueElem = this.$.newValueInput;
    newKeyElem.value = '';
    newValueElem.value = '';
    dialog.open();
  }


  /**
   * Create new key.
   */
  async doNewKey() {
    const newKey = this.$.newKeyInput.value;
    const newVal = this.$.newValueInput.value;

    if (newKey) {
      try {
        await this.socket.set({path: this.path, key: newKey, value: newVal});
        this.$.newKeyDialog.close();
      } catch (error) {
        this.handleError(error.message, this.$.newValueInput, 'Invalid Value');
      }
    } else {
      this.handleError('Cannot create a key with an empty name.',
                       this.$.newKeyInput, 'Invalid Name');
    }
  }


  private editValueSelected() {
    const item = this.$.combinedList.selectedItem;
    const dialog = this.$.editValueDialog;
    const editValueElem = this.$.editValueInput;

    editValueElem.value = item.value;
    dialog.keyName = item.name;
    dialog.open();
  }


  /**
   * Launch the value edit dialog.
   */
  editValueClicked(event) {
    const dialog = this.$.editValueDialog,
          editValueElem = this.$.editValueInput,
          name = event.currentTarget.keyName,
          isKey = event.currentTarget.isKey;

    if (!isKey) {
      return;
    }

    let value: string = null,
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
  }


  /**
   * Submit the edited value to the server.
   */
  async doEditValue() {
    const key = this.$.editValueDialog.keyName,
          newVal = this.$.editValueInput.value;
    try {
      await this.socket.set({path: this.path, key: key, value: newVal});
      this.$.editValueDialog.close();
    } catch (error) {
      this.handleError(error.message, this.$.editValueInput, 'Invalid Value');
    }
  }


  /**
   * Launch new folder dialog.
   */
  newFolderClicked() {
    const dialog = this.$.newFolderDialog,
          newFolderElem = this.$.newFolderInput;
    newFolderElem.value = '';
    dialog.open();
  }


  /**
   * Create new folder.
   */
  async doNewFolder() {
    const newFolder = this.$.newFolderInput.value;

    if (newFolder) {
      try {
        await this.socket.mkDir({path: this.path, dir: newFolder});
        this.$.newFolderDialog.close();
      } catch (error) {
        this.handleError(error.message, this.$.newFolderInput, 'Invalid Value');
      }
    }
    else {
      this.handleError('Cannot create folder with empty name',
                       this.$.newFolderInput, 'Invalid Value');
    }
  }


  /**
   * Launch copy dialog.
   */
  copyClicked() {
    const dialog = this.$.copyDialog,
          copyNameElem = this.$.copyNameInput,
          copyPathElem = this.$.copyPathInput;
    copyNameElem.value = this.$.combinedList.selectedItem.name;
    copyPathElem.value = this.pathToString(this.path);
    dialog.open();
  }


  /**
   * Copy the selected key or folder.
   */
  async doCopy() {
    const newName = this.$.copyNameInput.value;
    const selectedType = this.getSelectedType();
    const name = this.$.combinedList.selectedItem.name;

    try {
      const newPath = JSON.parse(this.$.copyPathInput.value);

      if (selectedType === 'dir') {
        this.$.pendingDialog.open();
        this.$.pendingOp.innerText = 'Copying...';
        await this.socket.copyDir({
          path: this.path,
          dir: name,
          newPath: newPath,
          newDir: newName
        });
      } else if (selectedType === 'key') {
        await this.socket.copy({
          path: this.path,
          key: name,
          newPath: newPath,
          newKey: newName
        });
      }
      this.$.copyDialog.close();
    } catch (error) {
      this.$.pendingDialog.close();
      this.handleError(error.message, this.$.copyPathInput, 'Invalid Path');
    }
  }


  /**
   * Execute the drag operation.
   */
  async doDragOp() {
    const newName = this.$.dragNameInput.value;
    const oldPath = JSON.parse(this.$.originPath.textContent);
    const oldName = this.$.originName.textContent;

    const dragType = (this.$.dragOp.innerText === 'Copy') ? 'copy' : 'move';

    try {
      const newPath = JSON.parse(this.$.dragPathInput.value);

      this.$.pendingOp.innerText = (dragType === "copy") ? 'Copying...' : 'Moving...';
      this.$.pendingDialog.open();

      switch (this.$.dragDialog.dragData['kind']) {
        case 'dir':
          if (dragType === "copy") {
            await this.socket.copyDir({path: oldPath, dir: oldName, newPath: newPath, newDir: newName});
          } else {
            await this.socket.moveDir({path: oldPath, dir: oldName, newPath: newPath, newDir: newName});
          }
          break;

        case 'key':
          if (dragType === "copy") {
            await this.socket.copy({path: oldPath, key: oldName, newPath: newPath, newKey: newName});
          } else {
            await this.socket.move({path: oldPath, key: oldName, newPath: newPath, newKey: newName});
          }
          break;
      }

      if (dragType === "copy") {
        this.$.toastCopySuccess.show();
      } else {
        this.$.toastMoveSuccess.show();
      }
      this.$.dragDialog.close();
    } catch (error) {
      this.handleError(error.message, this.$.dragPathInput, 'Invalid Path');
    }
    this.$.pendingDialog.close();
  }


  /**
   * Launch rename dialog.
   */
  renameClicked() {
    const dialog = this.$.renameDialog,
          renameElem = this.$.renameInput,
          name = this.$.combinedList.selectedItem.name;
    renameElem.value = name;
    dialog.open();
  }

  /**
   * Rename the selected key or folder.
   */
  async doRename() {
    // TODO(maffoo) Add pending modal dialog for renames since they are copy
    // commands and take a long time.
    const newName = this.$.renameInput.value,
          name = this.$.combinedList.selectedItem.name,
          selectedType = this.getSelectedType();

    if (newName === null || newName === name) {
      this.handleError("The new name cannot be the same as the old name.",
                       this.$.renameInput, "Invalid Name");
      return;
    }

    if (!newName) {
      this.handleError(`Cannot rename ${selectedType} to empty string`,
                       this.$.renameInput, "Invalid Name");
      return;
    }

    try {
      if (selectedType === 'dir') {
        await this.socket.renameDir({path: this.path, dir: name, newDir: newName});
      }
      else if (selectedType === 'key') {
        await this.socket.rename({path: this.path, key: name, newKey: newName});
      }
      this.$.renameDialog.close();
    } catch (error) {
      this.handleError(error.message, this.$.renameInput, "Invalid Name");
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
      const selectedType = this.getSelectedType();
      if (selectedType === 'dir') {
        this.$.pendingDialog.open();
        this.$.pendingOp.innerText = 'Deleting...';
        await this.socket.rmDir({path: this.path, dir: this.$.combinedList.selectedItem.name});
      } else if (selectedType === 'key') {
        await this.socket.del({path: this.path, key: this.$.combinedList.selectedItem.name});
      }
      this.$.deleteDialog.close();
    } catch (error) {
      this.handleError(error.message, null, "Invalid Delete");
    }
    this.$.pendingDialog.close();
  }
}
