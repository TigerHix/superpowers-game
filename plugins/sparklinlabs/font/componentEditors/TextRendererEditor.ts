export default class TextRendererEditor {
  projectClient: SupClient.ProjectClient
  editConfig: any;

  fields: {[key: string]: any} = {};
  fontAssetId: string;

  constructor(tbody: HTMLDivElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.editConfig = editConfig;
    this.projectClient = projectClient;
    this.fontAssetId = config.fontAssetId;

    var fontRow = SupClient.component.createSetting(tbody, 'Font');
    var fontName = (config.fontAssetId != null) ? this.projectClient.entries.getPathFromId(this.fontAssetId) : ""
    this.fields["fontAssetId"] = SupClient.component.createTextField(fontRow.valueElt, fontName);
    this.fields["fontAssetId"].addEventListener('input', this._onChangeFontAsset);

    var textRow = SupClient.component.createSetting(tbody, 'Text');
    this.fields["text"] = SupClient.component.createTextField(textRow.valueElt, config.text);
    this.fields["text"].addEventListener('change', (event: any) => { this.editConfig('setProperty', 'text', event.target.value); });

    var alignmentRow = SupClient.component.createSetting(tbody, 'Alignment');
    this.fields["alignment"] = SupClient.component.createSelectBox(alignmentRow.valueElt, {"left": "Left", "center": "Center", "right": "Right"}, config.alignment);
    this.fields["alignment"].addEventListener('change', (event: any) => { this.editConfig('setProperty', 'alignment', event.target.value); });

    var sizeRow = SupClient.component.createSetting(tbody, 'Size');
    this.fields["size"] = SupClient.component.createNumberField(sizeRow.valueElt, config.size, 0);
    this.fields["size"].addEventListener('change', (event: any) => { this.editConfig('setProperty', 'size', parseInt(event.target.value)); });

    var colorRow = SupClient.component.createSetting(tbody, 'Color');
    this.fields["color"] = SupClient.component.createTextField(colorRow.valueElt, config.color);
    this.fields["color"].addEventListener('change', (event: any) => { this.editConfig('setProperty', 'color', event.target.value); });

    this.projectClient.subEntries(this);
  }

  destroy() { this.projectClient.unsubEntries(this); }

  config_setProperty(path: string, value: any) {
    if (path === "fontAssetId") {
      if (value != null) this.fields["fontAssetId"].value = this.projectClient.entries.getPathFromId(value);
      else this.fields["fontAssetId"].value = "";

    }
    else this.fields[path].value = value;
  }

  _onChangeFontAsset = (event: any) => {
    if (event.target.value === "") this.editConfig('setProperty', 'fontAssetId', null);

    else {
      var entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === 'font') this.editConfig('setProperty', 'fontAssetId', entry.id);
    }
  }

  // Network callbacks
  onEntriesReceived(entries: SupCore.data.Entries) {}
  onEntryAdded(entry: any, parentId: string, index: number) {}
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id === this.fontAssetId) this.fields["fontAssetId"].value = this.projectClient.entries.getPathFromId(this.fontAssetId);
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (id === this.fontAssetId) this.fields["fontAssetId"].value = this.projectClient.entries.getPathFromId(this.fontAssetId);
  }
  onEntryTrashed(id: string) {}
}
