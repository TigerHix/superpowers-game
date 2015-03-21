declare module Sup {
  class TileSet extends Asset {
    getTileProperties(tile: number): {[key:string]: string;}
    setTileProperty(tile: number, propertyName: string, propertyValue: string)
  }
}
