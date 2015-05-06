goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.layer.Tile');
goog.require('ol.source.MapQuest');
goog.require('ol.source.ACT');

var resolutions = [
  32000,
  16000,
  8000,
  4000,
  2000,
  1000,
  500,
  250,
  125,
  50,
  25
];

var extent = [
  -7665486.0,
  -3832744.2,
  7665488.4,
  3832743.0
];

var adj_extent = [-7665486, -4359257, 8718514, 3832743];

proj4.defs('eqc',
  '+proj=eqc +a=2440e3 +b=2440e3 +lon_0=0.000000 +lat_0=0.000000 +over +no_defs');

var MercuryProjection = new ol.proj.Projection({
  code: 'eqc',
  unit: 'm',
  extent: adj_extent,
  worldExtent: extent
});

var ext = ol.tilegrid.extentFromProjection(MercuryProjection);

var tileGrid = new ol.tilegrid.TileGrid({
  extent: ext,
  origin: ol.extent.getCorner(ext, ol.extent.Corner.BOTTOM_LEFT),
  resolutions: resolutions
});

var layers = [
  new ol.layer.Tile({
    source: new ol.source.ACT({
      url: 'http://messenger-act.actgate.com/fcgi-bin-sandbox/fprovweb.exe',
      projection: MercuryProjection,
      tileGrid: tileGrid,
      params: {
        dsource: 'mdis_complete_mono',
        proj: '$(SEP)proj=eqc$(SEP)a=2440e3$(SEP)b=2440e3$(SEP)lon_0=0.000000$(SEP)lat_0=0.000000$(SEP)over$(SEP)no_defs$(SEP)',
        cmd: 'include "o2w_qmap_tiles_dev.msh"'
      }
    })
  })
];

var map = new ol.Map({
  layers: layers,
  target: 'map',
  view: new ol.View({
    center: [0, 0],
    zoom: 0,
    projection: MercuryProjection,
    resolutions: resolutions
  })
});
