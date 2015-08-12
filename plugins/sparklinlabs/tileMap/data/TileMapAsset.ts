import TileMapLayers, { TileMapLayerPub } from "./TileMapLayers"
import TileMapSettingsResource from "./TileMapSettingsResource";

import * as path from "path";
import * as fs from "fs";
import * as _ from "lodash";

export interface TileMapAssetPub {
  tileSetId: string;
  pixelsPerUnit: number;
  width: number;
  height: number;
  layerDepthOffset: number;
  layers: TileMapLayerPub[];
}

export default class TileMapAsset extends SupCore.data.base.Asset {

  static schema = {
    tileSetId: { type: "string?" },

    pixelsPerUnit: { type: "number", min: 1, mutable: true },

    width: { type: "integer", min: 1 },
    height: { type: "integer", min: 1 },
    layerDepthOffset: { type: "number", mutable: true },

    layers: { type: "array" },
  }

  //             x,  y, flipX, flipY, angle
  static emptyTile = [-1, -1, false, false, 0];

  pub: TileMapAssetPub;
  layers: TileMapLayers;

  constructor(id: string, pub: TileMapAssetPub, serverData: any) {
    // TODO: Remove this cast at some point, legacy stuff from Superpowers 0.4
    if (pub != null && typeof pub.tileSetId === "number") pub.tileSetId = pub.tileSetId.toString();

    super(id, pub, TileMapAsset.schema, serverData);
  }

  init(options: any, callback: (err: string) => any) {
    this.serverData.resources.acquire("tileMapSettings", null, (err: Error, tileMapSettings: TileMapSettingsResource) => {
      this.pub = {
        tileSetId: null,
        pixelsPerUnit: tileMapSettings.pub.pixelsPerUnit,
        width: tileMapSettings.pub.width, height: tileMapSettings.pub.height,
        layerDepthOffset: tileMapSettings.pub.layerDepthOffset,
        layers: []
      };

      super.init(options, () => {
        this.layers.add(this.createEmptyLayer("Layer"), null, (err, index) => {
          if (err != null) { callback(err); return; }
          callback(null);
        });
      });
    });
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "tilemap.json"), { encoding: "utf8" },(err, json) => {
      if (err != null && err.code === "ENOENT") {
        fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" },(err, json) => {
          fs.rename(path.join(assetPath, "asset.json"), path.join(assetPath, "tilemap.json"), (err) => {
            this.pub = JSON.parse(json);
            this.setup();
            this.emit("load");
          });
        });
      } else {
        this.pub = JSON.parse(json);
        this.setup();
        this.emit("load");
      }
    });
  }

  save(assetPath: string, callback: (err: Error) => any) {
    let json = JSON.stringify(this.pub, null, 2);
    fs.writeFile(path.join(assetPath, "tilemap.json"), json, { encoding: "utf8" }, callback);
  }

  setup() {
    this.layers = new TileMapLayers(this.pub.layers);
  }

  restore() {
    if (this.pub.tileSetId != null) this.emit("addDependencies", [ this.pub.tileSetId ]);
  }

  server_changeTileSet(client: any, tileSetId: string, callback: (err: string, tileSetId: string) => any) {
    if (tileSetId != null) {
      if (typeof(tileSetId) !== "string") { callback("tileSetId must be a string or null", null); return; }

      let entry = this.serverData.entries.byId[tileSetId];
      if (entry == null) { callback("Invalid tileSetId", null); return; }
      if (entry.type !== "tileSet") { callback("Invalid asset type", null); return; }
    }

    if (this.pub.tileSetId != null) this.emit("removeDependencies", [ this.pub.tileSetId ]);
    if (tileSetId != null) this.emit("addDependencies", [ tileSetId ]);

    this.pub.tileSetId = tileSetId;

    callback(null, tileSetId);
    this.emit("change");
  }

  client_changeTileSet(tileSetId: string) {
    this.pub.tileSetId = tileSetId;
  }

  server_resizeMap(client: any, width: number, height: number, callback: (err: string, width: number, height: number) => any) {
    if (typeof width  !== "number" || width  < 0) { callback("width must be positive integer", null, null); return; }
    if (typeof height !== "number" || height < 0) { callback("height must be positive integer", null, null); return; }
    if (width === this.pub.width && height === this.pub.height) return;

    this.client_resizeMap(width, height);

    callback(null, width, height);
    this.emit("change");
  }

  client_resizeMap(width: number, height: number) {
    if (width !== this.pub.width) {
      for (let row = this.pub.height; row > 0; row--) {
        for (let layer of this.pub.layers) {
          if (width > this.pub.width)
            for (let i = 0; i < width-this.pub.width; i++)
              layer.data.splice(row*this.pub.width, 0, _.cloneDeep(TileMapAsset.emptyTile));
          else
            layer.data.splice((row-1)*this.pub.width + width, this.pub.width - width);
        }
      }

      this.pub.width = width;
    }

    if (height !== this.pub.height) {
      for (let layer of this.pub.layers) {
        if (height > this.pub.height)
          for (let i = 0; i < (height-this.pub.height)*this.pub.width; i++)
            layer.data.splice(this.pub.height*this.pub.width, 0, _.cloneDeep(TileMapAsset.emptyTile));
        else
          layer.data.splice(height*this.pub.width, (this.pub.height-height)*this.pub.width);
      }
      this.pub.height = height;
    }
  }

  server_moveMap(client: any, horizontalOffset: number, verticalOffset: number,
  callback: (err: string, horizontalOffset: number, verticalOffset: number) => any) {

    if (typeof horizontalOffset !== "number") { callback("horizontalOffset must be an integer", null, null); return; }
    if (typeof verticalOffset   !== "number") { callback("verticalOffset must be an integer", null, null); return; }
    if (horizontalOffset === 0 && verticalOffset === 0) return;

    this.client_moveMap(horizontalOffset, verticalOffset);

    callback(null, horizontalOffset, verticalOffset);
    this.emit("change");
  }

  client_moveMap(horizontalOffset: number, verticalOffset: number) {
    if (horizontalOffset !== 0) {
      for (let row = this.pub.height; row > 0; row--) {
        for (let layer of this.pub.layers) {
          if (horizontalOffset > 0) {
            layer.data.splice(row*this.pub.width - horizontalOffset, horizontalOffset);
            for (let i = 0; i < horizontalOffset; i++)
              layer.data.splice((row-1)*this.pub.width, 0, _.cloneDeep(TileMapAsset.emptyTile));
          } else {
            for (let i = 0; i < -horizontalOffset; i++)
              layer.data.splice(row*this.pub.width, 0, _.cloneDeep(TileMapAsset.emptyTile));
            layer.data.splice((row-1)*this.pub.width, -horizontalOffset);
          }
        }
      }
    }

    if (verticalOffset !== 0) {
      for (let layer of this.pub.layers) {
        if (verticalOffset > 0) {
          layer.data.splice((this.pub.height - verticalOffset) * this.pub.width - 1, verticalOffset * this.pub.width);
          for (let i = 0; i < verticalOffset*this.pub.width; i++)
            layer.data.splice(0, 0, _.cloneDeep(TileMapAsset.emptyTile));
        } else {
          for (let i = 0; i < -verticalOffset*this.pub.width; i++)
            layer.data.splice(this.pub.height * this.pub.width, 0, _.cloneDeep(TileMapAsset.emptyTile));
          layer.data.splice(0, -verticalOffset * this.pub.width);
        }
      }
    }
  }

  server_editMap(client: any, layerId: string, edits: {x: number, y: number, tileValue: (number|boolean)[]}[],
  callback: (err: string, layerId: string, edits: {x: number, y: number, tileValue: (number|boolean)[]}[]) => any) {
    if (typeof layerId !== "string" || this.layers.byId[layerId] == null) { callback("no such layer", null, null); return; }
    if (! Array.isArray(edits)) { callback("edits must be an array", null, null); return; }

    for (let edit of edits) {
      let x = edit.x;
      let y = edit.y;
      let tileValue = edit.tileValue;

      if (x == null || typeof x != "number" || x < 0 || x >= this.pub.width) { callback(`x must be an integer between 0 && ${this.pub.width-1}`, null, null); return; }
      if (y == null || typeof y != "number" || y < 0 || y >= this.pub.height) { callback(`y must be an integer between 0 && ${this.pub.height-1}`, null, null); return; }
      if (! Array.isArray(tileValue) || tileValue.length != 5) { callback("tileValue must be an array with 5 items", null, null); return; }
      if (typeof tileValue[0] != "number" || tileValue[0] < -1) { callback("tileX must be an integer greater than -1", null, null); return; }
      if (typeof tileValue[1] != "number" || tileValue[1] < -1) { callback("tileY must be an integer greater than -1", null, null); return; }
      if (typeof tileValue[2] != "boolean") { callback("flipX must be a boolean", null, null); return; }
      if (typeof tileValue[3] != "boolean") { callback("flipY must be a boolean", null, null); return; }
      if (typeof tileValue[4] != "number" || [0, 90, 180, 270].indexOf(<number>tileValue[4]) == -1) {
        callback("angle must be an integer in [0, 90, 180, 270]", null, null);
        return;
      }
    }

    this.client_editMap(layerId, edits);
    callback(null, layerId, edits);
    this.emit("change");
  }

  client_editMap(layerId: string, edits: {x: number, y: number, tileValue: (number|boolean)[]}[]) {
    for (let edit of edits) {
      let index = edit.y * this.pub.width + edit.x;
      let tileValue = edit.tileValue;
      if (tileValue == null) tileValue = _.cloneDeep(TileMapAsset.emptyTile);
      this.layers.byId[layerId].data[index] = tileValue;
    }
  }

  createEmptyLayer(layerName: string) {
    let newLayer: TileMapLayerPub = {
      id: null,
      name: layerName,
      data: <(number|boolean)[][]>[]
    }

    for (let y = 0; y < this.pub.height; y++) {
      for (let x = 0; x < this.pub.width; x++) {
        let index = y * this.pub.width + x;
        newLayer.data[index] = _.cloneDeep(TileMapAsset.emptyTile);
      }
    }

    return newLayer;
  }

  server_newLayer(client: any, layerName: string, index: number, callback: (err: string, layer: TileMapLayerPub, index: number) => any) {
    let newLayer = this.createEmptyLayer(layerName);
    this.layers.add(newLayer, index, (err, actualIndex) => {
      if (err != null) { callback(err, null, null); return; }

      callback(null, newLayer, actualIndex);
      this.emit("change");
    });
  }

  client_newLayer(newLayer: TileMapLayerPub, actualIndex: number) {
    this.layers.client_add(newLayer, actualIndex);
  }

  server_renameLayer(client: any, layerId: string, newName: string, callback: (err: string, layerId: string, newName: string) => any) {
    if (typeof layerId != "string" || this.layers.byId[layerId] == null) { callback("no such layer", null, null); return; }

    this.layers.setProperty(layerId, "name", newName, (err) => {
      if (err != null) { callback(err, null, null); return; }

      callback(null, layerId, newName);
      this.emit("change");
    });
  }

  client_renameLayer(layerId: string, newName: string) {
    this.layers.client_setProperty(layerId, "name", newName);
  }

  server_deleteLayer(client: any, layerId: string, callback: (err: string, layerId: string, index: number) => any) {
    if (typeof layerId !== "string" || this.layers.byId[layerId] == null) { callback("no such layer", null, null); return; }
    if (this.pub.layers.length === 1) { callback("Last layer can't be deleted", null, null); return; }

    this.layers.remove(layerId, (err, index) => {
      if (err != null) { callback(err, null, null); return; }

      callback(null, layerId, index);
      this.emit("change");
    });
  }

  client_deleteLayer(layerId: string) {
    this.layers.client_remove(layerId);
  }

  server_moveLayer(client: any, layerId: string, layerIndex: number, callback: (err: string, layerId: string, layerIndex: number) => any) {
    if (typeof layerId !== "string" || this.layers.byId[layerId] == null) { callback("no such layer", null, null); return; }
    if (typeof layerIndex !== "number") { callback("index must be an integer", null, null); return; }

    this.layers.move(layerId, layerIndex, (err, index) => {
      if (err != null) { callback(err, null, null); return; }

      callback(null, layerId, index);
      this.emit("change");
    });
  }

  client_moveLayer(layerId: string, layerIndex: number) {
    this.layers.client_move(layerId, layerIndex);
  }
}
