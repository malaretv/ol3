// FIXME add minZoom support
// FIXME add date line wrap (tile coord transform)
// FIXME cannot be shared between maps with different projections

goog.provide('ol.source.ACT');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.math');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.uri.utils');
goog.require('ol');
goog.require('ol.TileCoord');
goog.require('ol.TileUrlFunction');
goog.require('ol.extent');
goog.require('ol.proj');
goog.require('ol.size');
goog.require('ol.source.TileImage');
goog.require('ol.source.wms');
goog.require('ol.source.wms.ServerType');
goog.require('ol.tilecoord');



/**
 * @classdesc
 * Layer source for tile data from WMS servers.
 *
 * @constructor
 * @extends {ol.source.TileImage}
 * @param {olx.source.TileWMSOptions=} opt_options Tile WMS options.
 * @api stable
 */
ol.source.ACT = function(opt_options) {

  var options = goog.isDef(opt_options) ? opt_options : {};

  var params = goog.isDef(options.params) ? options.params : {};

  goog.base(this, {
    attributions: options.attributions,
    crossOrigin: options.crossOrigin,
    logo: options.logo,
    projection: options.projection,
    tileGrid: options.tileGrid,
    tileLoadFunction: options.tileLoadFunction,
    tileUrlFunction: goog.bind(this.tileUrlFunction_, this),
    wrapX: options.wrapX
  });

  var urls = options.urls;
  if (!goog.isDef(urls) && goog.isDef(options.url)) {
    urls = ol.TileUrlFunction.expandUrl(options.url);
  }

  /**
   * @private
   * @type {!Array.<string>}
   */
  this.urls_ = goog.isDefAndNotNull(urls) ? urls : [];

  /**
   * @private
   * @type {number}
   */
  this.gutter_ = goog.isDef(options.gutter) ? options.gutter : 0;

  /**
   * @private
   * @type {Object}
   */
  this.params_ = params;

  /**
   * @private
   * @type {ol.source.wms.ServerType|undefined}
   */
  this.serverType_ =
      /** @type {ol.source.wms.ServerType|undefined} */ (options.serverType);

  /**
   * @private
   * @type {boolean}
   */
  this.hidpi_ = goog.isDef(options.hidpi) ? options.hidpi : false;

  /**
   * @private
   * @type {ol.Extent}
   */
  this.tmpExtent_ = ol.extent.createEmpty();


};
goog.inherits(ol.source.ACT, ol.source.TileImage);


/**
 * @inheritDoc
 */
ol.source.ACT.prototype.getGutter = function() {
  return this.gutter_;
};


/**
 * Get the user-provided params, i.e. those passed to the constructor through
 * the "params" option, and possibly updated using the updateParams method.
 * @return {Object} Params.
 * @api stable
 */
ol.source.ACT.prototype.getParams = function() {
  return this.params_;
};


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @param {ol.Size} tileSize Tile size.
 * @param {ol.Extent} tileExtent Tile extent.
 * @param {number} pixelRatio Pixel ratio.
 * @param {ol.proj.Projection} projection Projection.
 * @param {Object} params Params.
 * @return {string|undefined} Request URL.
 * @private
 */
ol.source.ACT.prototype.getRequestUrl_ =
    function(tileCoord, tileSize, tileExtent,
        pixelRatio, projection, params) {

  var urls = this.urls_;
  if (goog.array.isEmpty(urls)) {
    return undefined;
  }

  //TODO: Remove as required server parameter
  params['tz'] = tileCoord[0];
  params['tx'] = tileCoord[1];
  params['ty'] = tileCoord[2];

  params['bbox'] = tileExtent.join(',');
  params['dview'] = projection.getCode();

  //TODO: Remove as required server parameter
  params['fext'] = projection.getWorldExtent().join(',');
  var url;
  if (urls.length == 1) {
    url = urls[0];
  } else {
    var index = goog.math.modulo(ol.tilecoord.hash(tileCoord), urls.length);
    url = urls[index];
  }
  //need to ensur &cmd is at end
  var urlParams = goog.object.clone(params);
  delete urlParams.cmd;

  return goog.uri.utils.appendParamsFromMap(url, urlParams) + '&cmd=' + params.cmd;
};


/**
 * @param {number} z Z.
 * @param {number} pixelRatio Pixel ratio.
 * @param {ol.proj.Projection} projection Projection.
 * @return {ol.Size} Size.
 */
ol.source.ACT.prototype.getTilePixelSize =
    function(z, pixelRatio, projection) {
  var tileSize = goog.base(this, 'getTilePixelSize', z, pixelRatio, projection);
  if (pixelRatio == 1 || !this.hidpi_ || !goog.isDef(this.serverType_)) {
    return tileSize;
  } else {
    return ol.size.scale(tileSize, pixelRatio, this.tmpSize);
  }
};


/**
 * Return the URLs used for this WMS source.
 * @return {!Array.<string>} URLs.
 * @api stable
 */
ol.source.ACT.prototype.getUrls = function() {
  return this.urls_;
};


/**
 * Set the URL to use for requests.
 * @param {string|undefined} url URL.
 * @api stable
 */
ol.source.ACT.prototype.setUrl = function(url) {
  var urls = goog.isDef(url) ? ol.TileUrlFunction.expandUrl(url) : null;
  this.setUrls(urls);
};


/**
 * Set the URLs to use for requests.
 * @param {Array.<string>|undefined} urls URLs.
 * @api stable
 */
ol.source.ACT.prototype.setUrls = function(urls) {
  this.urls_ = goog.isDefAndNotNull(urls) ? urls : [];
  this.changed();
};


/**
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @param {number} pixelRatio Pixel ratio.
 * @param {ol.proj.Projection} projection Projection.
 * @return {string|undefined} Tile URL.
 * @private
 */
ol.source.ACT.prototype.tileUrlFunction_ =
    function(tileCoord, pixelRatio, projection) {

  var tileGrid = this.getTileGrid();
  if (goog.isNull(tileGrid)) {
    tileGrid = this.getTileGridForProjection(projection);
  }

  if (tileGrid.getResolutions().length <= tileCoord[0]) {
    return undefined;
  }

  if (pixelRatio != 1 && (!this.hidpi_ || !goog.isDef(this.serverType_))) {
    pixelRatio = 1;
  }

  var tileResolution = tileGrid.getResolution(tileCoord[0]);
  var tileExtent = tileGrid.getTileCoordExtent(tileCoord, this.tmpExtent_);
  var tileSize = ol.size.toSize(
      tileGrid.getTileSize(tileCoord[0]), this.tmpSize);

  var gutter = this.gutter_;
  if (gutter !== 0) {
    tileSize = ol.size.buffer(tileSize, gutter, this.tmpSize);
    tileExtent = ol.extent.buffer(tileExtent,
        tileResolution * gutter, tileExtent);
  }

  if (pixelRatio != 1) {
    tileSize = ol.size.scale(tileSize, pixelRatio, this.tmpSize);
  }

  var baseParams = {
    '_xtype': 'dynamic',
    'text': 'png',
    'cmd': 'include "o2w_qmap_tiles.msh"'
  };

  goog.object.extend(baseParams, this.params_);

  return this.getRequestUrl_(tileCoord, tileSize, tileExtent,
      pixelRatio, projection, baseParams);
};


/**
 * Update the user-provided params.
 * @param {Object} params Params.
 * @api stable
 */
ol.source.ACT.prototype.updateParams = function(params) {
  goog.object.extend(this.params_, params);
  this.changed();
};


