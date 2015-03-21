module Sup {
  export class TileSet extends Asset {
    getTileProperties(tile) {
      var tilesPerRow = this.__inner.data.texture.image.width / this.__inner.data.gridSize;

      var x = tile % tilesPerRow;
      var y = window.Math.floor(tile / tilesPerRow);
      var properties = this.__inner.data.tileProperties[x + "_" + y];
      properties = (properties) ? properties : {}
      return properties
    }
    setTileProperty(tile, propertyName, propertyValue) {
      var tilesPerRow = this.__inner.data.texture.image.width / this.__inner.data.gridSize;

      var x = tile % tilesPerRow;
      var y = window.Math.floor(tile / tilesPerRow);
      var properties = this.__inner.data.tileProperties[x + "_" + y];
      properties = (properties) ? properties : {};
      if ( propertyValue != null ) {
        this.__inner.data.tileProperties[x + "_" + y][propertyName] = propertyValue;
      } else if (this.__inner.data.tileProperties[x + "_" + y][propertyName] != null ) {
        delete this.__inner.data.tileProperties[x + "_" + y][propertyName]
      }
    }
  }
}
