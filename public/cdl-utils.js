/*!
 * CdlUtils | Copyright (C) 2017 Wenlin Institute, Inc. SPC. All Rights Reserved.
 * 	This JavaScript file is offered for licensing under the GNU Affero General Public License v.3:
 * 		https://www.gnu.org/licenses/agpl.html
 * 	Use of the Wenlin CDL JavaScript API is subject to the Terms of Service:
 * 		https://wenlincdl.com/terms
 */
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var CdlParser = __webpack_require__(1);
	var CdlChar = __webpack_require__(3);
	var CdlStroke = __webpack_require__(2);
	var Point = __webpack_require__(4);
	var CharacterRenderer = __webpack_require__(6);
	var RenderBounds = __webpack_require__(7);
	var DomXmlParser = __webpack_require__(55);
	var xmlDbLoader = __webpack_require__(56);
	var apiDbLoader = __webpack_require__(57);

	var extractRenderBounds = function(options) {
	  var width = options.width || 128;
	  var height = options.height || 128;
	  var x = options.x || 0;
	  var y = -1 * (options.y || 0) - height;
	  if (options.font === 'plain') {
	    y = options.y || 0;
	  }
	  return new RenderBounds(x, y, width, height);
	};

	var CdlUtils = {

	  getSvgPathStrings: function(charOrUnicode, options) {
	    if (!options) options = {};
	    var bounds = extractRenderBounds(options);
	    return CdlUtils.fetchCdlChar(charOrUnicode, options).then(function(charCDL) {
	      return CharacterRenderer.getSvgPathStrings(charCDL, bounds, options);
	    });
	  },

	  fetchCdlChar: function(charOrUnicode, options) {
	    if (!options) options = {};
	    var fetchPromise = Promise.resolve().then(function() {
	      if (charOrUnicode instanceof CdlChar) {
	        return charOrUnicode;
	      }
	      var dataLoader = options.dataLoader || apiDbLoader(options);
	      var parser = new CdlParser(dataLoader, options.xmlParser || DomXmlParser);
	      return parser.loadAndParse(charOrUnicode, options.variant || 0);
	    });
	    if (options.onError) {
	      fetchPromise = fetchPromise.catch(options.onError);
	    }
	    return fetchPromise;
	  }
	};

	CdlUtils.xmlDbLoader = xmlDbLoader;
	CdlUtils.CdlChar = CdlChar;
	CdlUtils.CdlStroke = CdlStroke;
	CdlUtils.Point = Point;
	CdlUtils.Promise = Promise;

	module.exports = CdlUtils;

	// set up window.CdlUtils if we're in the browser
	// TODO: research if this is the best way of doing this
	if (typeof window !== 'undefined') {
	  // store whatever used to be called CdlUtils in case of a conflict
	  var previousCdlUtils = window.CdlUtils;

	  // add a jQuery-esque noConflict method to restore the previous window['CdlUtils'] if necessary
	  CdlUtils.noConflict = function() {
	    window.CdlUtils = previousCdlUtils;
	    return CdlUtils;
	  };

	  window.CdlUtils = CdlUtils;
	}


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/* --- CdlParser.js
	Recursively build out the CDL representation from XML. Work asynchronously because we
	sometimes need to fetch more CDL while parsing, which is why we use Promise.

	For example, for

	  <comp char='亻' uni='4EBB' points='0,0 34,128' />

	fetch the CDL for the comp 亻 (U+4EBB) before parsing the remainder of the whole character (such as 他 U+4ED6).

	Notes about map, Promise.all, and bind, as used in this module:

	map is a built-in javascript method. It takes in a function, runs it on each array
	element, and returns a new array with the results. E.g.:
	var x = [1,2,3].map(function(num) { return num + 2; }); // x is [3,4,5]

	return Promise.all(childNodes.map(this._recursiveBuildCDLRepresentation.bind(this)));

	is equivalent to the following:

	var recursiveCdlPromises = [];
	for (var i = 0; i < childNodes.length; i++) {
	  var childNode = childNodes[i];
	  recursiveCdlPromises.push(this._recursiveBuildCDLRepresentation(childNode));
	}
	return Promise.all(recursiveCdlPromises);

	Promise.all is a function which takes an array of promises and returns a new promise which resolves
	after all the promises passed in have finished resolving. So, this code

	  return Promise.all(childNodes.map(this._recursiveBuildCDLRepresentation.bind(this)));

	is recursively calling this._recursiveBuildCDLRepresentation(node) on all the child nodes, then waiting
	until all those async calls have finished before continuing.

	There's a new async/await syntax in the new version of javascript which makes working with Promises
	a lot cleaner, but it's going to take a bit for all the browsers to start supporting it.

	The .bind(this) call is a quirk of javascript - functions constantly forget what 'this' is supposed to be when they're
	called out of context. Calling .bind(this) forces the function to remember the correct 'this' when it's called.
	*/

	var CdlStroke = __webpack_require__(2);
	var CdlChar = __webpack_require__(3);
	var Point = __webpack_require__(4);
	var Utils = __webpack_require__(5);

	var parseHead = function(headString) {
	  if (headString === 'cut') return CdlStroke.STROKE_HEAD_CUT;
	  if (headString === 'corner') return CdlStroke.STROKE_HEAD_CORNER;
	  if (headString === 'vertical') return CdlStroke.STROKE_HEAD_VERTICAL;
	  return CdlStroke.STROKE_HEAD_NORMAL;
	};

	var parseTail = function(tail) {
	  if (tail === 'cut') return CdlStroke.STROKE_TAIL_CUT;
	  if (tail === 'long') return CdlStroke.STROKE_TAIL_LONG;
	  if (tail === 'reserved') return CdlStroke.STROKE_TAIL_RESERVED;
	  return CdlStroke.STROKE_TAIL_NORMAL;
	};

	/* --- parsePoints:
	    Parse a points attribute like '10,0 96,0 82,42 128,42 110,128 90,114'.
	    First split by space ' ', then split by comma ','.
	    ---return a Point array, or null if no points element in the given xmlNode.
	*/
	var parsePoints = function(xmlNode) {
	  if (!xmlNode.$.points) return null;
	  return xmlNode.$.points.split(' ').map(function(pointStr) {
	    // TODO: don't assume integer coords (parseInt), should support float -- parseFloat OK?
	    var coords = pointStr.split(',').map(function(coord) { return parseInt(coord, 10); });
	    return new Point(coords[0], coords[1]);
	  });
	};

	var getUnicodeHex = function(charOrUnicode) {
	  /* This function may be called with charOrUnicode being a Hanzi string
	     like '𩨎' or a hex string like '29A0E'. Be careful to support code points
	     greater than U+FFFF that are more than one code unit in UTF-16 and up to six
	     digits in hex. In JavaScript, string.length is the number of UTF-16 code units,
	     not code points or characters. */
	  if (!charOrUnicode.match(/^[0-9A-Fa-f]+$/)) { // not a string of hex digits
	    return charOrUnicode.codePointAt(0).toString(16).toUpperCase(); // codePointAt NOT charCodeAt!
	  }
	  var unicode = charOrUnicode.toUpperCase();
	  if (unicode.length > 6 || !unicode.match(/^[0-9A-F]+$/)) {
	    throw new Error(
	      'Invalid Chinese character or Unicode hex: ' +
	      charOrUnicode + '. Must be either a single Chinese character ' +
	      'or the Unicode hex for a single character'
	    );
	  }
	  return unicode;
	};

	/* --- excludeNull:
	    Enable use as in [].filter(excludeNull) to exclude null elements.

	    ---param elm the element to be included or excluded.
	    ---return true to include the element, false to exclude it.

	    Arrays of objects representing cdl/comp/stroke elements may include null elements
	    corresponding to XML comments or any XML elements other than cdl/comp/stroke.
	    Compare how _recursiveBuildCDLRepresentation returns empty promise if XML is invalid or unrecognized.
	*/
	var excludeNull = function(elm) {
	  return elm; // Boolean context; true except for false, 0, "", null, undefined, and NaN.
	};

	var CdlParser = function(loaderFunc, xmlParser) {
	  this._loader = loaderFunc;
	  this._xmlParser = xmlParser;
	};

	CdlParser.prototype.loadAndParse = function(charOrUnicode, variant) {
	  return this._loadParsedCharXml(charOrUnicode, variant)
	    .then(function(parsedXml) {
	      return this._recursiveBuildCDLRepresentation(parsedXml);
	    }.bind(this));
	};

	CdlParser.prototype._loadParsedCharXml = function(charOrUnicode, variant) {
	  return Promise.resolve().then(function() {
	    return this._loader(getUnicodeHex(charOrUnicode), variant || 0, this._xmlParser);
	  }.bind(this)).then(function(charXml) {
	    // if this is already parsed by the loader, just return it
	    if (typeof charXml === 'object') {
	      return charXml;
	    }
	    return Utils.parseXml(charXml, this._xmlParser);
	  }.bind(this));
	};

	/* --- _recursiveBuildCDLRepresentation:
	    Recursively build a CDL representation.

	    ---param xmlNode the XML node.
	    ---return a promise for an array of CdlStroke and/or CdlChar objects,
	              or an empty promise if the XML is invalid or unrecognized.
	*/
	CdlParser.prototype._recursiveBuildCDLRepresentation = function(xmlNode) {
	  return Promise.resolve().then(function() {
	    var points;
	    if (xmlNode['#name'] === 'stroke') {
	      var strokeType = xmlNode.$.type;
	      var head = parseHead(xmlNode.$.head);
	      var tail = parseTail(xmlNode.$.tail);
	      points = parsePoints(xmlNode);
	      return new CdlStroke(strokeType, points, head, tail);
	    } else if (xmlNode['#name'] === 'cdl' || xmlNode['#name'] === 'comp') {
	      var char = xmlNode.$.char;
	      var unicode = xmlNode.$.uni;
	      var variant = parseInt(xmlNode.$.variant, 10) || 0;
	      var radical = xmlNode.$.radical;
	      points = parsePoints(xmlNode);
	      return Promise.resolve().then(function() {
	        var childrenAreIncluded = xmlNode.$$;
	        if (childrenAreIncluded) {
	          return Promise.all(xmlNode.$$.map(this._recursiveBuildCDLRepresentation.bind(this)));
	        }
	        return this._loadParsedCharXml(unicode, variant)
	          .then(function(fullCharXmlNode) {
	            variant = parseInt(fullCharXmlNode.$.variant, 10) || 0; // overwrite the variant with what's in the full spec
	            radical = fullCharXmlNode.$.radical; // overwrite the radical with what's in the full spec
	            return fullCharXmlNode.$$; // extract just the children
	          })
	          .then(function(childNodes) {
	            return Promise.all(childNodes.map(this._recursiveBuildCDLRepresentation.bind(this)));
	          }.bind(this));
	      }.bind(this)).then(function(childObjs) {
	        return new CdlChar(char, unicode, childObjs.filter(excludeNull), points, radical, variant);
	      });
	    }
	    // if the XML is invalid or unrecognized just return an empty promise
	    return Promise.resolve();
	  }.bind(this));
	};

	module.exports = CdlParser;


/***/ },
/* 2 */
/***/ function(module, exports) {

	var getLabelForTail = function(tail) {
	  if (tail === CdlStroke.STROKE_TAIL_NORMAL) return 'normal';
	  if (tail === CdlStroke.STROKE_TAIL_CUT) return 'cut';
	  if (tail === CdlStroke.STROKE_TAIL_LONG) return 'long';
	  if (tail === CdlStroke.STROKE_TAIL_RESERVED) return 'reserved';
	};

	var getLabelForHead = function(head) {
	  if (head === CdlStroke.STROKE_HEAD_NORMAL) return 'normal';
	  if (head === CdlStroke.STROKE_HEAD_CUT) return 'cut';
	  if (head === CdlStroke.STROKE_HEAD_CORNER) return 'corner';
	  if (head === CdlStroke.STROKE_HEAD_VERTICAL) return 'vertical';
	};

	var CdlStroke = function(type, points, head, tail) {
	  this.type = type;
	  this.points = points;
	  this.head = head || CdlStroke.STROKE_HEAD_NORMAL;
	  this.tail = tail || CdlStroke.STROKE_TAIL_NORMAL;
	  this.isStroke = true;
	};

	// ------ consts ------

	CdlStroke.STROKE_HEAD_NORMAL   = 0; /* cdl: no 'head' attribute */
	CdlStroke.STROKE_HEAD_CUT      = 1; /* cdl: head='cut' */
	CdlStroke.STROKE_HEAD_CORNER   = 2; /* cdl: head='corner' */
	CdlStroke.STROKE_HEAD_VERTICAL = 3; /* cdl: head='vertical' */

	// tail (cut|long)
	CdlStroke.STROKE_TAIL_NORMAL   = 0; /* cdl: no 'tail' attribute */
	CdlStroke.STROKE_TAIL_CUT      = 1; /* cdl: head='cut' */
	CdlStroke.STROKE_TAIL_LONG     = 2; /* cdl: head='long' */
	CdlStroke.STROKE_TAIL_RESERVED = 3;

	// ------ getters ------

	CdlStroke.prototype.toRawJs = function() {
	  var points = this.points.map(function(point) {
	    return point.x + ',' + point.y;
	  }).join(' ');
	  var rawJs = {$tag: 'stroke', type: this.type, points: points};
	  if (this.head) rawJs.head = getLabelForHead(this.head);
	  if (this.tail) rawJs.tail = getLabelForTail(this.tail);
	  return rawJs;
	};

	module.exports = CdlStroke;


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var Point = __webpack_require__(4);
	var Utils = __webpack_require__(5);

	var CdlChar = function(char, unicode, components, points, radical, variant) {
	  this.char = char;
	  this.unicode = unicode;
	  this.components = components;
	  this.points = points;
	  this.radical = radical;
	  this.variant = variant || 0;
	  this.isScaled = !!this.points;
	  this.isStroke = false;
	  if (!this.points) {
	    this.points = [
	      new Point(0, 0),
	      new Point(128, 128)
	    ];
	  }
	};

	// ----- getters -----

	CdlChar.prototype.getNumStrokes = function() {
	  var numStrokes = 0;
	  this.components.forEach(function(component) {
	    if (component.isStroke) {
	      numStrokes += 1;
	    } else {
	      numStrokes += component.getNumStrokes();
	    }
	  });
	  return numStrokes;
	};

	// options:
	// recursive - whether or not to embed all the children chars. default false
	CdlChar.prototype.toXml = function(options) {
	  var rawJs = this.toRawJs(options);
	  return Utils.xmlFromRawJs(rawJs);
	};

	CdlChar.prototype.toRawJs = function(options) {
	  if (!options) options = {};
	  var includeChildren = !options.shallow;
	  if (!options.recursive) {
	    options.shallow = true;
	  }
	  var tagName = options.tagName || 'cdl';
	  options.tagName = 'comp';
	  var rawJs = {$tag: tagName};
	  if (this.char) {
	    rawJs.char = this.char;
	  }
	  rawJs.uni = this.unicode;
	  if (this.isScaled) {
	    rawJs.points = this.points.map(function(point) {
	      return point.x + ',' + point.y;
	    }).join(' ');
	  }
	  if (this.variant) {
	    rawJs.variant = this.variant;
	  }
	  if (this.radical && includeChildren) {
	    rawJs.radical = this.radical;
	  }
	  if (includeChildren) {
	    rawJs.$children = this.components.map(function(component) {
	      return component.toRawJs(options);
	    });
	  }
	  return rawJs;
	};

	module.exports = CdlChar;


/***/ },
/* 4 */
/***/ function(module, exports) {

	var Point = function(x, y) {
	  this.x = x;
	  this.y = y;
	};

	// ----- getters -----

	Point.prototype.clone = function() { return new Point(this.x, this.y); };

	// ----- mutators -----

	Point.swapXs = function(point1, point2) {
	  var tmp = point1.x;
	  point1.x = point2.x;
	  point2.x = tmp;
	};

	Point.swapYs = function(point1, point2) {
	  var tmp = point1.y;
	  point1.y = point2.y;
	  point2.y = tmp;
	};

	module.exports = Point;


/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = {};

	// javascript doesn't do int math, so this function simulates how C truncates ints
	var intCast = function(val) {
	  return val < 0 ? Math.ceil(val) : Math.floor(val);
	};
	module.exports.intCast = intCast;

	module.exports.hypotenuse = function(dx, dy) {
	  var hypotenuse = intCast(Math.sqrt((dx * dx) + (dy * dy)));
	  return (hypotenuse < 1) ? 1 : hypotenuse;
	};

	/* SK_PERCENT() is convenient macro to represent a percentage of a dimension.
	  For efficiency, implement using division by 256 rather than 100. */
	// #define SK_PERCENT(d, percent) (((d) * (percent) + 50) / 100)
	module.exports.skPercent = function(d, percent) {
	  // flooring here to get results closer to what C does with int division
	  return intCast(((d) * intCast((percent * 256 + 50) / 100) + 128) / 256);
	};

	var GRID_SIZE = 128;
	var GRID_SHIFT = 7;
	// tests pass removing GRID_SIZE/2 below, even though in the c file it's 128...
	// not sure what's up... keep an eye on this if other stuff starts breaking
	module.exports.xyScaleMul = function(x, wid) {
	  return (x * wid /* + GRID_SIZE / 2 */) >> GRID_SHIFT;
	};

	module.exports.xyScaleMulFloat = function(x, wid) {
	  return (x * wid) / GRID_SIZE;
	};

	var xmlParsingOpts = {
	  explicitChildren: true,
	  preserveChildrenOrder: true,
	  explicitRoot: false
	};

	// promise wrapper around xml2js.parseString
	module.exports.parseXml = function(xml, xmlParser) {
	  return new Promise(function(resolve, reject) {
	    xmlParser.parseString(xml, xmlParsingOpts, function(err, result) {
	      if (err) {
	        reject(err);
	      } else {
	        resolve(result);
	      }
	    });
	  });
	};

	module.exports.getSvgPathStartString = function(x, y) {
	  return 'M' + x.toFixed(4) + ',' + y.toFixed(4) + '\n';
	};
	module.exports.getSvgLineString = function(x, y) {
	  return '\tL' + x.toFixed(4) + ',' + y.toFixed(4) + '\n';
	};
	module.exports.getSvgCubicCurveString = function(x1, y1, x2, y2, x3, y3) {
	  return '\tC' + x1.toFixed(4) + ',' + y1.toFixed(4) + ' '
	               + x2.toFixed(4) + ',' + y2.toFixed(4) + ' '
	               + x3.toFixed(4) + ',' + y3.toFixed(4) + '\n';
	};
	module.exports.getSvgQuadraticCurveString = function(x1, y1, x2, y2) {
	  return '\tQ' + x1.toFixed(4) + ',' + y1.toFixed(4) + ' '
	               + x2.toFixed(4) + ',' + y2.toFixed(4) + '\n';
	};

	// assuming '$tag' is the $tag name and '$children' are the children
	var xmlFromRawJs = function(rawJs) {
	  var xml = '<' + rawJs.$tag;
	  for (var prop in rawJs) {
	    if (rawJs.hasOwnProperty(prop) && prop !== '$tag' && prop !== '$children') {
	      xml += ' ' + prop + "='" + rawJs[prop] + "'";
	    }
	  }
	  if (!rawJs.$children) {
	    return xml + ' />';
	  }
	  var childrenXml = rawJs.$children.map(function(child) {
	    return xmlFromRawJs(child).split('\n').map(function(xmlLine) {
	      return '\t' + xmlLine + '\n'; // indent each line by another tab
	    }).join('');
	  });
	  xml += '>\n' + childrenXml.join('');
	  return xml + '</' + rawJs.$tag + '>';
	};
	module.exports.xmlFromRawJs = xmlFromRawJs;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var RenderBounds = __webpack_require__(7);
	var OutlinerManager = __webpack_require__(8);
	var Outline = __webpack_require__(52);
	var PlainSvgRenderer = __webpack_require__(53);
	var SongSvgRenderer = __webpack_require__(54);
	var Point = __webpack_require__(4);
	var Utils = __webpack_require__(5);

	var MAX_SHU_RADIUS = 82;
	var MAX_HENG_RADIUS = 50;
	var DEFAULT_SHU_RADIUS = 37;
	var DEFAULT_HENG_RADIUS = 13;

	var FT_HALF_PIXEL = 32;
	var FT_QUARTER_PIXEL = 16;
	var FT_SHIFT_SIX = 6;

	var convertOlX = function(x) {
	  return Utils.intCast(x + FT_QUARTER_PIXEL);
	};
	var convertOlY = function(yy, flipHeight) {
	  return Utils.intCast(flipHeight - yy + FT_HALF_PIXEL);
	};

	var getPaddedBounds = function(renderBounds, shuRadius) {
	  var margin = 2 * shuRadius;
	  return new RenderBounds(
	    renderBounds.x + margin,
	    renderBounds.y + margin,
	    renderBounds.width - 2 * margin,
	    renderBounds.height - 2 * margin
	  );
	};

	var scaleBounds = function(bounds, boundingPoints) {
	  var pointA = boundingPoints[0].clone();
	  var pointB = boundingPoints[1].clone();

	  if (pointA.x > pointB.x) { // compare RegularizeRectangle()
	    Point.swapXs(pointA, pointB);
	  }
	  if (pointA.y > pointB.y) {
	    Point.swapYs(pointA, pointB);
	  }

	  var scaledX = bounds.x + Utils.xyScaleMul(pointA.x, bounds.width);
	  var scaledY = bounds.y + Utils.xyScaleMul(pointA.y, bounds.height);
	  return new RenderBounds(
	    scaledX,
	    scaledY,
	    bounds.x + Utils.xyScaleMul(pointB.x, bounds.width) - scaledX,
	    bounds.y + Utils.xyScaleMul(pointB.y, bounds.height) - scaledY
	  );
	};

	var renderPathStrings = function(cdlChar, radii, bounds, origBounds, rawBounds, options) {
	  var pathStrings = [];
	  cdlChar.components.forEach(function(component) {
	    if (component.isStroke) {
	      var scaledPoints = component.points.map(function(point) {
	        return new Point(
	          bounds.x + Utils.xyScaleMul(point.x, bounds.width),
	          bounds.y + Utils.xyScaleMul(point.y, bounds.height)
	        );
	      });
	      if (options.font === 'plain') {
	        pathStrings.push(PlainSvgRenderer.getPathString(component.type, scaledPoints));
	      } else {
	        var strokeOutline = CharacterRenderer.renderStrokeOutline(component, radii, bounds, origBounds, scaledPoints);
	        pathStrings.push(SongSvgRenderer.getPathString(strokeOutline, rawBounds.y, rawBounds.height));
	      }
	    } else { // component, not stroke
	      var scaledBounds = scaleBounds(bounds, component.points);
	      pathStrings = pathStrings.concat(renderPathStrings(component, radii, scaledBounds, origBounds, rawBounds, options));
	    }
	  });

	  if (options.endStrokeIndex) {
	    pathStrings = pathStrings.slice(0, options.endStrokeIndex);
	  }
	  if (options.startStrokeIndex) {
	    pathStrings = pathStrings.slice(options.startStrokeIndex);
	  }
	  return pathStrings;
	};

	var getOutlinePoints = function(strokeName, outline, refPoints) {
	  var outliner = OutlinerManager.getOutlinerForStroke(strokeName);
	  outliner.addPoints(outline, refPoints);
	  return outline.outlinePoints;
	};

	var HALFSIZE_NSTROKES = 35; /* Somewhere between 30 and 40 strokes */
	var MAX_STROKES_FOR_PERCENT = 50; /* <= 2 * HALFSIZE_NSTROKES */
	/* Use static array to hold values so only need to calculate once. */
	var percentArray = [];
	for (var i = 0, j = 0; i < MAX_STROKES_FOR_PERCENT; i++, j += 50) {
	  percentArray[i] = 100 - Utils.intCast(j / HALFSIZE_NSTROKES);
	}

	var getPercentThicknessFromStrokeCount = function(strokeCount) {
	  strokeCount = Math.min(MAX_STROKES_FOR_PERCENT, strokeCount);
	  return percentArray[strokeCount - 1];
	};

	var getBaseRadius = function(radiusFactor, glyphWidth, percent) {
	  /* FT_SHIFT_SIX is used here to convert to FT_F26Dot6 fractional pixels. */
	  /* The division by 1024 corresponds to the multiplication by radiusFactor,
	      since radiusFactors are measured in increments of (glyph_width / 1024). */
	  /* (x / 1024 == x >> 10) and (x << FT_SHIFT_SIX == x << 6); net effect is (x >> 4 == x / 16) */
	  return Utils.intCast((((glyphWidth * radiusFactor) >> (10 - FT_SHIFT_SIX)) * percent) / 100);
	};


	var CharacterRenderer = {
	  // just in the public API so it can be tested explicitly
	  calculateStrokeRadii: function(hengRadiusFactor, shuRadiusFactor, glyphWidth, strokeCount) {
	    var percent = getPercentThicknessFromStrokeCount(strokeCount);

	    var hengRadius = getBaseRadius(hengRadiusFactor, glyphWidth, percent) & 0xffffffc0; // don't want fractional pixels...;
	    var shuRadius = getBaseRadius(shuRadiusFactor, glyphWidth, percent);

	    return {
	      heng: Math.max(FT_HALF_PIXEL, hengRadius), // not less than half a pixel
	      shu: Math.max(FT_HALF_PIXEL, shuRadius)
	    };
	  },

	  // just in the public API so it can be tested explicitly
	  renderStrokeOutline: function(stroke, radii, bounds, origBounds, points) {
	    var outline = new Outline(
	      radii.heng,
	      radii.shu,
	      stroke.head,
	      stroke.tail
	    );

	    var flipHeight = origBounds.y * 2 + origBounds.height;
	    var refPoints = points.map(function(point) {
	      return new Point(
	        convertOlX(point.x),
	        convertOlY(point.y, flipHeight)
	      );
	    });
	    return getOutlinePoints(stroke.type, outline, refPoints);
	  },
	  // options is a map with the following optional keys:
	  //
	  // startStrokeIndex: the stroke num (0-indexed) to begin with (default 0)
	  // endStrokeIndex: the stroke num (0-indexed) to end with (default last stroke in char)
	  // fixMargin: bool to fix the margins (based on stroke count/thickness) (default true)
	  // hengRadiusFactor: int (default 13)
	  // shuRadiusFactor: int (default 37)
	  getSvgPathStrings: function(cdlChar, renderBounds, options) {
	    if (!options) options = {};

	    var hengRadiusFactor = Math.min(options.hengRadius || DEFAULT_HENG_RADIUS, MAX_HENG_RADIUS);
	    var shuRadiusFactor = Math.min(options.shuRadius || DEFAULT_SHU_RADIUS, MAX_SHU_RADIUS);
	    var glyphWidth = renderBounds.width;
	    var strokeCount = cdlChar.getNumStrokes();
	    var radii = CharacterRenderer.calculateStrokeRadii(hengRadiusFactor, shuRadiusFactor, glyphWidth, strokeCount);

	    var highPrecisionBounds = new RenderBounds(
	      renderBounds.x * 64,
	      renderBounds.y * 64,
	      renderBounds.width * 64,
	      renderBounds.height * 64
	    );

	    if (options.fixMargin !== false) {
	      highPrecisionBounds = getPaddedBounds(highPrecisionBounds, radii.shu);
	    }

	    var origBounds = highPrecisionBounds;
	    var scaledBounds = highPrecisionBounds;
	    if (cdlChar.isScaled /* TODO: add back ZinIsPUACJK stuff if needed */) {
	      scaledBounds = scaleBounds(highPrecisionBounds, cdlChar.points);
	    }

	    return renderPathStrings(cdlChar, radii, scaledBounds, origBounds, renderBounds, options);
	  }
	};

	module.exports = CharacterRenderer;


/***/ },
/* 7 */
/***/ function(module, exports) {

	var RenderBounds = function(x, y, width, height) {
	  this.x = x;
	  this.y = y;
	  this.width = width;
	  this.height = height;
	};

	// ----- getters -----

	RenderBounds.prototype.clone = function() {
	  return new RenderBounds(this.x, this.y, this.width, this.height);
	};

	module.exports = RenderBounds;


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var outlinerMap = {
	  h: __webpack_require__(9),
	  t: __webpack_require__(12),
	  s: __webpack_require__(13),
	  sg: __webpack_require__(14),
	  p: __webpack_require__(15),
	  wp: __webpack_require__(16),
	  sp: __webpack_require__(17),
	  d: __webpack_require__(18),
	  n: __webpack_require__(19),
	  dn: __webpack_require__(20),
	  pn: __webpack_require__(21),
	  tn: __webpack_require__(22),
	  tpn: __webpack_require__(23),
	  hz: __webpack_require__(24),
	  hp: __webpack_require__(25),
	  hg: __webpack_require__(26),
	  sz: __webpack_require__(27),
	  sw: __webpack_require__(28),
	  st: __webpack_require__(29),
	  pz: __webpack_require__(30),
	  pd: __webpack_require__(31),
	  pg: __webpack_require__(32),
	  wg: __webpack_require__(33),
	  xg: __webpack_require__(34),
	  hzz: __webpack_require__(35),
	  hzw: __webpack_require__(36),
	  hzt: __webpack_require__(37),
	  hzg: __webpack_require__(38),
	  hxg: __webpack_require__(39),
	  szz: __webpack_require__(40),
	  szp: __webpack_require__(41),
	  swg: __webpack_require__(42),
	  hzzz: __webpack_require__(43),
	  hzzp: __webpack_require__(44),
	  hzwg: __webpack_require__(45),
	  hpwg: __webpack_require__(46),
	  szzg: __webpack_require__(47),
	  hzzzg: __webpack_require__(48),
	  b: __webpack_require__(49),
	  c: __webpack_require__(50),
	  swz: __webpack_require__(51)
	};


	module.exports = {
	  getOutlinerForStroke: function(strokeName) {
	    return outlinerMap[strokeName];
	  }
	};


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var Point = __webpack_require__(4);
	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    if (refPoints[0].y === refPoints[1].y) {
	      OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	      OutlineHelpers.addHengRightEndOutlinePoints(outline, refPoints[0], refPoints[1]);
	    } else {
	      /* Not exactly horizontal; rotated counter-clockwise */
	      var dx = refPoints[1].x - refPoints[0].x;
	      var dy = refPoints[1].y - refPoints[0].y;
	      var hypotenuse = Utils.hypotenuse(dx, dy);

	      /* First make all points relative to refPoints[0] */
	      var flatPoints = [
	        new Point(0, 0),
	        new Point(hypotenuse, 0)
	      ];

	      OutlineHelpers.addHengLeftEndOutlinePoints(outline, flatPoints[0]);
	      OutlineHelpers.addHengRightEndOutlinePoints(outline, flatPoints[0], flatPoints[1]);

	      /* Now rotate around origin, and add refPoints[0] */
	      outline.rotateAndTranslate(refPoints[0], dx, dy, hypotenuse);
	    }
	  }
	};


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var OutlinePoint = __webpack_require__(11);
	var CdlStroke = __webpack_require__(2);
	var Point = __webpack_require__(4);
	var Utils = __webpack_require__(5);

	var NA_PERC = 110;
	var WAN_PERC = 90;
	var SWG_PERC = 45;

	var OutlineHelpers = {
	  addHengLeftEndOutlinePoints: function(outline, refPoint) {
	    var rad = outline.hengRadius;

	    if (outline.isHeadCut()) {
	      outline.addPoint(refPoint.x, refPoint.y - rad, OutlinePoint.ON_CURVE);
	      outline.addPoint(refPoint.x, refPoint.y + rad, OutlinePoint.ON_CURVE);
	    } else {
	      outline.addPoint(refPoint.x + rad * 3, refPoint.y - rad, OutlinePoint.ON_CURVE);
	      outline.addPoint(refPoint.x, refPoint.y - Utils.skPercent(rad, 275), OutlinePoint.ON_CURVE); // constant here controls size of onset nub
	      outline.addPoint(refPoint.x - rad * 2, refPoint.y + rad, OutlinePoint.ON_CURVE);
	    }
	  },

	  addHengRightEndOutlinePoints: function(outline, leftPoint, refPoint) {
	    var rad = outline.hengRadius;

	    if (outline.isTailCut()) {
	      outline.addPoint(refPoint.x, refPoint.y + rad, OutlinePoint.ON_CURVE);
	      outline.addPoint(refPoint.x, refPoint.y - rad, OutlinePoint.ON_CURVE);
	    } else { // "serif" right end
	      var bumpWidth = outline.shuRadius * 4;
	      var maxWidth = Utils.intCast((refPoint.x - leftPoint.x) / 2);
	      if (bumpWidth > maxWidth) {
	        bumpWidth = maxWidth;
	      }
	      var bumpHeight = Utils.skPercent(bumpWidth, 43);

	      var rightX = refPoint.x + Utils.intCast(bumpWidth / 4);
	      var rightY = refPoint.y - rad;
	      var leftX = rightX - bumpWidth;
	      var leftY = refPoint.y + rad;
	      var topX = leftX + bumpHeight - Utils.intCast(bumpHeight / 4);
	      var topY = leftY + bumpHeight;

	      var ctrlOneX = topX + Utils.skPercent(bumpWidth, 59);
	      var ctrlOneY = leftY;
	      var ctrlTwoX = topX + Utils.skPercent(bumpWidth, 36);
	      var ctrlTwoY = ctrlOneY + Utils.skPercent(bumpHeight, 66);

	      outline.addPoint(leftX, leftY, OutlinePoint.ON_CURVE);
	      outline.addPoint(topX, topY, OutlinePoint.ON_CURVE);
	      outline.addPoint(ctrlTwoX, ctrlTwoY, OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(ctrlOneX, ctrlOneY, OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(rightX, rightY, OutlinePoint.ON_CURVE);
	    }
	  },

	  addShuTopOutlinePoints: function(outline, refPoint) {
	    var rad = outline.shuRadius;

	    if (outline.isHeadCut()) {
	      outline.addPoint(refPoint.x - rad, refPoint.y, OutlinePoint.ON_CURVE);
	      outline.addPoint(refPoint.x + rad, refPoint.y, OutlinePoint.ON_CURVE);
	    } else {
	      var y = refPoint.y + Utils.skPercent(rad, 160);
	      var serifPtX = refPoint.x + Utils.skPercent(rad, 230);
	      var serifPtY = refPoint.y;

	      outline.addPoint(refPoint.x - rad, y, OutlinePoint.ON_CURVE);
	      outline.addPoint(refPoint.x, y, OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(refPoint.x + rad, refPoint.y + rad, OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(serifPtX, serifPtY, OutlinePoint.ON_CURVE);
	      outline.addPoint(refPoint.x + rad, refPoint.y - Utils.skPercent(rad, 86), OutlinePoint.ON_CURVE);
	    }
	  },

	  addShuBottomOutlinePoints: function(outline, endPoint) {
	    var rad = outline.shuRadius;

	    if (outline.isTailCut()) {
	      outline.addPoint(endPoint.x + rad, endPoint.y, OutlinePoint.ON_CURVE);
	      outline.addPoint(endPoint.x - rad, endPoint.y, OutlinePoint.ON_CURVE);
	    } else {
	      /* Move the whole thing up or down just by changing hangover */
	      var delta = Utils.skPercent(rad, 30);
	      var hangover;
	      if (outline.isTailLong()) {
	        /* First and second strokes of kou3 'mouth', for example */
	        hangover = outline.hengRadius + Utils.skPercent(rad, 80);
	      } else {
	        hangover = Utils.intCast(rad / 4);
	      }
	      var y = endPoint.y - hangover - rad; /* Bottom left corner */

	      outline.addPoint(endPoint.x + rad, y + rad, OutlinePoint.ON_CURVE);
	      outline.addPoint(endPoint.x + delta, y + delta, OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(endPoint.x - delta, y, OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(endPoint.x - rad, y, OutlinePoint.ON_CURVE);
	    }
	  },

	  addPieTipOutline: function(outline, topRightPoint, bottomPoint, topLeftPoint, isVeryCurved) {
	    if (outline.isTailLong()) {
	      bottomPoint.x -= outline.shuRadius;
	      bottomPoint.y -= outline.shuRadius;
	    }
	    var nearBottom = new Point(
	      bottomPoint.x + Utils.intCast(outline.hengRadius / 2),
	      bottomPoint.y - Utils.intCast(outline.hengRadius / 2)
	    );
	    var rightCtrlPnts = OutlineHelpers.getPieControlPoints(topRightPoint, nearBottom, isVeryCurved);
	    var leftCtrlPnts = OutlineHelpers.getPieControlPoints(topLeftPoint, bottomPoint, isVeryCurved);

	    outline.addPoint(topRightPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(rightCtrlPnts.top,  OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(rightCtrlPnts.bottom,  OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(nearBottom,    OutlinePoint.ON_CURVE);
	    outline.addPoint(bottomPoint,   OutlinePoint.ON_CURVE);
	    outline.addPoint(leftCtrlPnts.bottom,   OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(leftCtrlPnts.top,   OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(topLeftPoint,  OutlinePoint.ON_CURVE);
	  },

	  addPieTopOutline: function(outline, refPoints, isVeryCurved) {
	    var rad = outline.shuRadius; // pieRadius

	    switch (outline.head) {
	    case CdlStroke.STROKE_HEAD_CUT:
	      /* Top cut off flat horizontally. */
	      if (isVeryCurved) {
	        /* Use shuRadius, exactly, for consistency with
	            vertical strokes coming down from horizontals.
	            Don't want discrepancy between "wp" and "sp". */
	        // rad = outline.shuRadius;
	      } else if ((refPoints[0].x - refPoints[1].x)
	               > (refPoints[0].y - refPoints[1].y)) {
	        /* Relatively flat (horizontal) */
	        rad = Utils.skPercent(rad, 130);
	      } else { /* Relatively vertical) */
	        rad = Utils.skPercent(rad, 115);
	      }
	      return {
	        start: new Point(refPoints[0].x + rad, refPoints[0].y),
	        end: new Point(refPoints[0].x - rad, refPoints[0].y)
	      };
	    case CdlStroke.STROKE_HEAD_VERTICAL:
	      /* Top right cut off flat vertically. For pie that comes
	          off of shu without any heng, as in fantizi lai2 'come',
	          also maybe ru4 'enter'. */
	      if ((refPoints[0].x - refPoints[1].x)
	          > (refPoints[0].y - refPoints[1].y)) {
	        /* Relatively flat (horizontal) */
	        rad = Utils.skPercent(rad, 220);
	      } else { /* Relatively vertical) */
	        rad = Utils.skPercent(rad, 250);
	      }
	      return {
	        start: new Point(refPoints[0].x, refPoints[0].y - rad),
	        end: new Point(refPoints[0].x, refPoints[0].y + rad)
	      };
	    case CdlStroke.STROKE_HEAD_CORNER:
	      /* Top edge straight horizontal, upper right edge straight vertical.
	          Useful in mu4 'tree'. */
	      rad = Utils.skPercent(rad, 170);
	      outline.addPoint(refPoints[0], OutlinePoint.ON_CURVE); // top right corner
	      return {
	        start: new Point(refPoints[0].x, refPoints[0].y - rad),
	        end: new Point(refPoints[0].x - rad, refPoints[0].y)
	      };
	    case CdlStroke.STROKE_HEAD_NORMAL:
	    default:
	      if (isVeryCurved) {
	        /* Must be consistent with stroke type "sp" */
	        OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	        return {
	          start: outline.getLastOutlinePoint().toPoint(),
	          end: outline.getFirstOutlinePoint().toPoint()
	        };
	      }
	      if ((refPoints[0].x - refPoints[1].x) * 2
	          > (refPoints[0].y - refPoints[1].y) * 3) {
	        /* Relatively flat (horizontal) */
	        var serifPtX = refPoints[0].x + rad * 2;
	        var serifPtY = refPoints[0].y - rad;
	        var serifPt = new Point(serifPtX, serifPtY);

	        var curveStartPointX = refPoints[0].x + rad;
	        var curveStartPointY = refPoints[0].y - rad;
	        var curveEndPointX   = refPoints[0].x - Utils.intCast(rad / 2);
	        var curveEndPointY   = refPoints[0].y + rad;
	        var curveEndPoint = new Point(curveEndPointX, curveEndPointY);
	        outline.addPoint(curveEndPointX, curveEndPointY, OutlinePoint.ON_CURVE);
	        OutlineHelpers.addNortheastConvexityPoints(outline, curveEndPoint, serifPt);
	        outline.addPoint(serifPtX, serifPtY, OutlinePoint.ON_CURVE);
	        return {
	          start: new Point(curveStartPointX, curveStartPointY),
	          end: curveEndPoint
	        };
	      }
	      /* Relatively vertical, similar to ShuTop but narrower */
	      OutlineHelpers.addPieZheTopOutlinePoints(outline, refPoints[0]);
	      return {
	        start: outline.getLastOutlinePoint().toPoint(),
	        end: outline.getFirstOutlinePoint().toPoint()
	      };
	    }
	  },

	  addNortheastConvexityPoints: function(outline, topLeft, botRight) {
	    var ctrlPoints = OutlineHelpers.interpolateNortheastConvexityPoints(botRight, topLeft);
	    outline.addPoint(ctrlPoints[0].x, ctrlPoints[0].y, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlPoints[1].x, ctrlPoints[1].y, OutlinePoint.OFF_CURVE_CUBIC);
	  },

	  interpolateNortheastConvexityPoints: function(botRight, topLeft) {
	    var OL_NW_CTRL_X1 = 52;
	    var OL_NW_CTRL_Y1 = 104;
	    var OL_NW_CTRL_X2 = 108;
	    var OL_NW_CTRL_Y2 = 52;
	    var deltaX = botRight.x - topLeft.x;
	    var deltaY = topLeft.y - botRight.y;
	    return [
	      new Point(
	        topLeft.x + Utils.xyScaleMul(OL_NW_CTRL_X1, deltaX),
	        botRight.y + Utils.xyScaleMul(OL_NW_CTRL_Y1, deltaY)
	      ),
	      new Point(
	        topLeft.x + Utils.xyScaleMul(OL_NW_CTRL_X2, deltaX),
	        botRight.y + Utils.xyScaleMul(OL_NW_CTRL_Y2, deltaY)
	      )
	    ];
	  },

	  addPieZheTopOutlinePoints: function(outline, refPoint) {
	    var rad = Utils.skPercent(outline.shuRadius, 85); // pieRadius

	    var serifPtX = refPoint.x + Utils.skPercent(rad, 230);
	    var serifPtY = refPoint.y - Utils.intCast(rad / 2);
	    var curveStartPointX = refPoint.x + rad;
	    var curveStartPointY = refPoint.y - Utils.skPercent(rad, 136);
	    var curveEndPointX = refPoint.x - rad;
	    var curveEndPointY = refPoint.y + Utils.skPercent(rad, 110);

	    var serifPt = new Point(serifPtX, serifPtY);
	    var curveEndPoint = new Point(curveEndPointX, curveEndPointY);

	    outline.addPoint(curveEndPointX, curveEndPointY, OutlinePoint.ON_CURVE);
	    OutlineHelpers.addNortheastConvexityPoints(outline, curveEndPoint, serifPt);
	    outline.addPoint(serifPtX, serifPtY, OutlinePoint.ON_CURVE);
	    outline.addPoint(curveStartPointX, curveStartPointY, OutlinePoint.ON_CURVE);
	  },

	  getPieControlPoints: function(top, bottom, isVeryCurved) {
	    var notVeryCurved = [
	      54, 22, 106, 68
	    ]; // not very curved
	    var yesVeryCurved = [
	      104, 30, 128, 52
	    ]; // very curved
	    var curve = isVeryCurved ? yesVeryCurved : notVeryCurved;
	    var deltaX = top.x - bottom.x;
	    var deltaY = top.y - bottom.y;

	    return {
	      top: new Point(
	        bottom.x + Utils.xyScaleMul(curve[2], deltaX),
	        bottom.y + Utils.xyScaleMul(curve[3], deltaY)
	      ),
	      bottom: new Point(
	        bottom.x + Utils.xyScaleMul(curve[0], deltaX),
	        bottom.y + Utils.xyScaleMul(curve[1], deltaY)
	      )
	    };
	  },

	  addNaStuff: function(outline, topRight, topLeft, bottomRef) {
	    var endPoints = OutlineHelpers.prepareNaEndPoints(outline, bottomRef);

	    outline.addPoint(topRight, OutlinePoint.ON_CURVE);

	    var ctrlPoints = OutlineHelpers.interpolateNaPoints(topRight, endPoints.right, true);
	    outline.addPoint(ctrlPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlPoints[1], OutlinePoint.OFF_CURVE_CUBIC);

	    outline.addPoint(endPoints.right, OutlinePoint.ON_CURVE);
	    endPoints.right.y = endPoints.right.y - Utils.intCast(outline.shuRadius / 4); // avoid very sharp tip
	    outline.addPoint(endPoints.right, OutlinePoint.ON_CURVE);

	    ctrlPoints = OutlineHelpers.interpolateNaEndPoints(endPoints.right, endPoints.left);
	    outline.addPoint(ctrlPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlPoints[1], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(endPoints.left, OutlinePoint.ON_CURVE);

	    ctrlPoints = OutlineHelpers.interpolateNaPoints(topLeft, endPoints.left, false);
	    outline.addPoint(ctrlPoints[1], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(topLeft, OutlinePoint.ON_CURVE);
	  },

	  prepareNaEndPoints: function(outline, refPoint) {
	    var rad = Utils.skPercent(outline.shuRadius, NA_PERC); // naRadius

	    return {
	      left: new Point(refPoint.x - rad, refPoint.y - Utils.intCast(rad / 2) - Utils.intCast(rad / 4)),
	      right: new Point(refPoint.x + rad + Utils.intCast(rad / 2), refPoint.y + rad)
	    };
	  },

	  interpolateNaPoints: function(topLeft, botRight, isUpper) {
	    var OL_NA_CURVE_CTRL_X1 = 22;
	    var OL_NA_CURVE_CTRL_Y1 = 66;
	    var OL_NA_CURVE_CTRL_X2 = 72;
	    var OL_NA_CURVE_CTRL_Y2 = 22;
	    var OL_NA_CURVE_CTRL_Y2_UPPER = 10;
	    var ctrlY2 = isUpper ? OL_NA_CURVE_CTRL_Y2_UPPER : OL_NA_CURVE_CTRL_Y2;
	    var deltaX = botRight.x - topLeft.x;
	    var deltaY = topLeft.y - botRight.y;
	    return [
	      new Point(topLeft.x + Utils.xyScaleMul(OL_NA_CURVE_CTRL_X1, deltaX), botRight.y + Utils.xyScaleMul(OL_NA_CURVE_CTRL_Y1, deltaY)),
	      new Point(topLeft.x + Utils.xyScaleMul(OL_NA_CURVE_CTRL_X2, deltaX), botRight.y + Utils.xyScaleMul(ctrlY2, deltaY))
	    ];
	  },

	  interpolateNaEndPoints: function(topRight, bottomLeft) {
	    var OL_NA_END_CTRL_X1 = 38;
	    var OL_NA_END_CTRL_Y1 = 64;
	    var OL_NA_END_CTRL_X2 = 74;
	    var OL_NA_END_CTRL_Y2 = 104;
	    var deltaX = topRight.x - bottomLeft.x;
	    var deltaY = topRight.y - bottomLeft.y;
	    return [
	      new Point(
	        bottomLeft.x + Utils.xyScaleMul(OL_NA_END_CTRL_X2, deltaX),
	        bottomLeft.y + Utils.xyScaleMul(OL_NA_END_CTRL_Y2, deltaY)
	      ),
	      new Point(
	        bottomLeft.x + Utils.xyScaleMul(OL_NA_END_CTRL_X1, deltaX),
	        bottomLeft.y + Utils.xyScaleMul(OL_NA_END_CTRL_Y1, deltaY)
	      )
	    ];
	  },

	  addPingNaUpperCurve: function(outline, p, q) {
	    p = p.clone();
	    q = q.clone();

	    var rad = Utils.skPercent(outline.shuRadius, NA_PERC); // naRadius

	    p.y += rad;
	    q.y += rad;

	    /* In characters like 爬, don't want the "pn" stroke to be too thin at the top. */
	    if (p.y - q.y > 2 * (q.x - p.y)) {
	      p.x += Utils.intCast(rad / 2);
	    }
	    outline.addPoint(p, OutlinePoint.ON_CURVE);
	    outline.addPoint(Utils.intCast((p.x * 3 + q.x) / 4), q.y, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(q, OutlinePoint.OFF_CURVE_CUBIC);
	  },

	  addPingNaRightEndPoints: function(outline, refPoint) {
	    var endPoints = OutlineHelpers.preparePingNaEndPoints(outline, refPoint);

	    outline.addPoint(endPoints.right, OutlinePoint.ON_CURVE);
	    endPoints.right.y = endPoints.right.y - Utils.intCast(outline.shuRadius / 4); // avoid sharp point
	    outline.addPoint(endPoints.right, OutlinePoint.ON_CURVE);

	    var ctrlPoints = OutlineHelpers.interpolateNaEndPoints(endPoints.right, endPoints.left);

	    outline.addPoint(ctrlPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlPoints[1], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(endPoints.left, OutlinePoint.ON_CURVE);
	  },

	  preparePingNaEndPoints: function(outline, refPoint) {
	    var rad = Utils.skPercent(outline.shuRadius, NA_PERC); // naRadius
	    return {
	      left: new Point(refPoint.x - rad, refPoint.y - rad),
	      right: new Point(refPoint.x + rad + rad, refPoint.y + rad + rad)
	    };
	  },

	  addPingNaLowerCurve: function(outline, p, q) {
	    q = q.clone();
	    q.y -= Utils.skPercent(outline.shuRadius, NA_PERC); // naRadius

	    outline.addPoint(q, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(Utils.intCast((p.x * 3 + q.x) / 4), q.y, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(p, OutlinePoint.ON_CURVE);
	  },

	  addSouthwestWideEndPoints: function(outline, refPoint) {
	    var rad = outline.shuRadius;
	    outline.addPoint(refPoint.x, refPoint.y - Utils.skPercent(rad, 162), OutlinePoint.ON_CURVE);
	    outline.addPoint(refPoint.x - Utils.skPercent(rad, 84), refPoint.y - Utils.skPercent(rad, 130), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(refPoint.x - Utils.skPercent(rad, 150), refPoint.y - Utils.skPercent(rad, 76), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(refPoint.x - rad * 2, refPoint.y, OutlinePoint.ON_CURVE);
	  },

	  addWanGouStuff: function(outline, topLeft, topRight, refPoints, shouldFixHook) {
	    var OL_WG_CTRL_X1 = 80;
	    var OL_WG_CTRL_Y1 = 92;
	    var OL_WG_CTRL_Y2 = 48;
	    var midLeft  = refPoints[0].clone(); // middle
	    var midRight = refPoints[0].clone();
	    midLeft.x -= outline.shuRadius;
	    midRight.x += outline.shuRadius;

	    var deltaX = midRight.x - topRight.x;
	    var deltaY = topRight.y - midRight.y;
	    outline.addPoint(topRight, OutlinePoint.ON_CURVE);
	    outline.addPoint(topRight.x + Utils.xyScaleMul(OL_WG_CTRL_X1, deltaX),
	          midRight.y + Utils.xyScaleMul(OL_WG_CTRL_Y1, deltaY), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(midRight.x,
	          midRight.y + Utils.xyScaleMul(OL_WG_CTRL_Y2, deltaY), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(midRight, OutlinePoint.ON_CURVE);

	    OutlineHelpers.addWanGouBottomOutline(outline, refPoints[0], refPoints[1], refPoints[2], shouldFixHook);

	    deltaX = midLeft.x - topLeft.x;
	    deltaY = topLeft.y - midLeft.y;
	    outline.addPoint(midLeft, OutlinePoint.ON_CURVE);
	    outline.addPoint(midLeft.x, midLeft.y + Utils.xyScaleMul(OL_WG_CTRL_Y2, deltaY), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(topLeft.x + Utils.xyScaleMul(OL_WG_CTRL_X1, deltaX), midLeft.y + Utils.xyScaleMul(OL_WG_CTRL_Y1, deltaY), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(topLeft, OutlinePoint.ON_CURVE);
	  },

	  addWanGouBottomOutline: function(outline, topPoint, bottomPoint, hookPoint, shouldFixHook) {
	    var rad = outline.shuRadius;

	    var maxX = bottomPoint.x - rad * 3;
	    if (shouldFixHook && hookPoint.x > maxX) {
	      /* Don't do this for stroke type "hpwg": can cause hook
	           to penetrate horizontal stroke in 阝. */
	      hookPoint.x = maxX;
	    }
	    /* Hook point uses hengRadius instead of shuRadius; sharper. */
	    var nearHook = new Point(
	      hookPoint.x - Utils.intCast(outline.hengRadius / 2),
	      hookPoint.y - Utils.intCast(outline.hengRadius / 2)
	    );

	    var aboveHeel = new Point(bottomPoint.x - rad, bottomPoint.y + rad);
	    var delta = topPoint.y - aboveHeel.y;

	    var offL = new Point(topPoint.x - rad, topPoint.y - Utils.skPercent(delta, 40));
	    var offK = new Point(topPoint.x - rad, Utils.intCast((offL.y + aboveHeel.y) / 2));

	    var offA = new Point(topPoint.x + rad, offL.y - Utils.intCast(rad / 2));
	    var offB = new Point(topPoint.x + rad, offK.y - Utils.intCast(rad / 2));

	    delta = offK.y - aboveHeel.y;
	    var offJ = new Point(Utils.intCast((aboveHeel.x + offK.x) / 2), aboveHeel.y + Utils.skPercent(delta, 18));

	    var offI = new Point(aboveHeel.x + rad, aboveHeel.y);
	    maxX = Utils.intCast((aboveHeel.x + offJ.x) / 2);
	    if (offI.x > maxX) {
	      offI.x = maxX;
	    }
	    var offG = new Point(
	      Utils.intCast((bottomPoint.x + hookPoint.x) / 2),
	      Utils.intCast((bottomPoint.y + hookPoint.y) / 2)
	    );
	    var offH = new Point(Utils.intCast((offG.x + aboveHeel.x) / 2), aboveHeel.y);
	    var offF = new Point(offG.x - Utils.intCast(rad / 2), offG.y - Utils.intCast(rad / 2));
	    var heelPoint = new Point(Utils.intCast((offF.x + bottomPoint.x) / 2), bottomPoint.y - rad);
	    var minX = bottomPoint.x - Utils.skPercent(rad, 160);
	    if (heelPoint.x < minX) {
	      heelPoint.x = minX;
	    }

	    var offE = new Point(heelPoint.x, Utils.intCast((bottomPoint.y + heelPoint.y) / 2));
	    var nearHeel = new Point(bottomPoint.x, heelPoint.y);
	    var offC = new Point(offJ.x + Utils.skPercent(rad, 240), offJ.y - Utils.skPercent(rad, 140));
	    var offD = new Point(Utils.intCast((aboveHeel.x + offC.x) / 2), heelPoint.y);
	    if (offD.x < aboveHeel.x + rad) {
	      offD.x = aboveHeel.x + rad;
	    }

	    var onBC = new Point(
	      Utils.intCast((offB.x + offC.x) / 2),
	      Utils.intCast((offB.y + offC.y) / 2)
	    );

	    var onJK = new Point(
	      Utils.intCast((offJ.x + offK.x) / 2),
	      Utils.intCast((offJ.y + offK.y) / 2)
	    );

	    outline.addPoint(offA, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(offB, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(onBC, OutlinePoint.ON_CURVE);
	    outline.addPoint(offC, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(offD, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(nearHeel, OutlinePoint.ON_CURVE);
	    outline.addPoint(heelPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(offE, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(offF, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(nearHook, OutlinePoint.ON_CURVE);
	    outline.addPoint(hookPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(offG, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(offH, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(aboveHeel, OutlinePoint.ON_CURVE);
	    outline.addPoint(offI, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(offJ, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(onJK, OutlinePoint.ON_CURVE);
	    outline.addPoint(offK, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(offL, OutlinePoint.OFF_CURVE_CUBIC);
	  },

	  //  Given two points (which define a center line) and a radius, get two points
	  //  on a parallel line, whose distance from the center line is the radius.
	  getTwoParallelPoints: function(input, r) {
	    var hyp = Utils.hypotenuse(input[1].x - input[0].x, input[1].y - input[0].y);

	    var point1 = new Point(
	      input[0].x + Utils.intCast(((input[0].y - input[1].y) * r) / hyp),
	      input[0].y + Utils.intCast(((input[1].x - input[0].x) * r) / hyp)
	    );
	    return [
	      point1,
	      new Point(
	        point1.x + input[1].x - input[0].x,
	        point1.y + input[1].y - input[0].y
	      )
	    ];
	  },

	  // Given an array of four Bezier points, fill in an array of seven Bezier points
	  // giving a closer approximation of the curve.
	  getBezierSevenFromFour: function(four) {
	    var sev = [];
	    /* mid is halfway between four[1] and four[2]. */
	    var mid = new Point(
	      Utils.intCast((four[1].x + four[2].x) / 2),
	      Utils.intCast((four[1].y + four[2].y) / 2)
	    );

	    /* The first and last output points are same as input. */
	    sev[0] = four[0];
	    sev[6] = four[3];

	    /* sev[1] is halfway between four[0] and four[1]. */
	    sev[1] = new Point(
	      Utils.intCast((four[0].x + four[1].x) / 2),
	      Utils.intCast((four[0].y + four[1].y) / 2)
	    );

	    /* sev[5] is halfway between four[2] and four[3]. */
	    sev[5] = new Point(
	      Utils.intCast((four[2].x + four[3].x) / 2),
	      Utils.intCast((four[2].y + four[3].y) / 2)
	    );

	    /* sev[2] is halfway between sev[1] and mid. */
	    sev[2] = new Point(
	      Utils.intCast((sev[1].x + mid.x) / 2),
	      Utils.intCast((sev[1].y + mid.y) / 2)
	    );

	    /* sev[4] is halfway between sev[5] and mid. */
	    sev[4] = new Point(
	      Utils.intCast((sev[5].x + mid.x) / 2),
	      Utils.intCast((sev[5].y + mid.y) / 2)
	    );

	    /* sev[3] is halfway between sev[2] and sev[4]. */
	    sev[3] = new Point(
	      Utils.intCast((sev[2].x + sev[4].x) / 2),
	      Utils.intCast((sev[2].y + sev[4].y) / 2)
	    );

	    return sev;
	  },

	  addHengPieOutlineCornerPoints: function(outline, refPoint) {
	    OutlineHelpers.addHengZheOrPieCorner(outline, refPoint, true);
	  },

	  addHengZheOrPieCorner: function(outline, refPoint, isPie) {
	    var bottomRight;
	    var farRight;
	    var rad = outline.shuRadius;

	    /* If isPie === false, bottomRight must match curveEndPoint in GetHZWGFOutline(),
	        else must match curveEndPoint in GetHengZheZhePieOutline(). */

	    var bottomRightX = refPoint.x + rad;
	    var farRightX = refPoint.x + Utils.skPercent(rad, 222);
	    if (isPie) {
	      bottomRight = new Point(bottomRightX, refPoint.y - Utils.skPercent(rad, 190));
	      farRight = new Point(farRightX, refPoint.y - Utils.skPercent(rad, 120));
	    } else {
	      bottomRight = new Point(bottomRightX, refPoint.y - rad);
	      farRight = new Point(farRightX, refPoint.y + Utils.skPercent(rad, 22));
	    }
	    var top = new Point(refPoint.x - Utils.skPercent(rad, 10), refPoint.y + rad * 2);
	    var left = new Point(refPoint.x - Utils.skPercent(rad, 144), refPoint.y + outline.hengRadius);

	    outline.addPoint(left, OutlinePoint.ON_CURVE);
	    outline.addPoint(top, OutlinePoint.ON_CURVE);
	    OutlineHelpers.addNortheastConvexityPoints(outline, top, farRight);
	    outline.addPoint(farRight, OutlinePoint.ON_CURVE);
	    outline.addPoint(bottomRight, OutlinePoint.ON_CURVE);
	  },

	  addHengzheOutlineCornerPoints: function(outline, refPoint) {
	    OutlineHelpers.addHengZheOrPieCorner(outline, refPoint, false);
	  },

	  addNortheastCornerPoint: function(outline, refPoint) {
	    outline.addPoint(refPoint.x + outline.shuRadius, refPoint.y + outline.hengRadius, OutlinePoint.ON_CURVE);
	  },

	  addShuZheOutlineCornerPoints: function(outline, refPoint) {
	    outline.addPoint(refPoint.x + outline.shuRadius, refPoint.y - outline.hengRadius, OutlinePoint.ON_CURVE);
	    OutlineHelpers.addSouthwestWideEndPoints(outline, refPoint);
	    outline.addPoint(refPoint.x - outline.shuRadius, refPoint.y + outline.shuRadius, OutlinePoint.ON_CURVE);
	  },

	  addSouthwestCornerPoint: function(outline, refPoint) {
	    outline.addPoint(refPoint.x - outline.shuRadius, refPoint.y - outline.hengRadius, OutlinePoint.ON_CURVE);
	  },

	  addSWGInsidePoints: function(outline, topLeftPoint, botRightPoint) {
	    topLeftPoint = topLeftPoint.clone();
	    botRightPoint = botRightPoint.clone();
	    topLeftPoint.x += outline.shuRadius;
	    botRightPoint.y += Utils.skPercent(outline.shuRadius, WAN_PERC); // wanRadius

	    /* This can happen. Fixed bug where Utils.skPercent was given negative argument. */
	    if (botRightPoint.y > topLeftPoint.y) {
	      botRightPoint.y = topLeftPoint.y;
	    }
	    if (topLeftPoint.x > botRightPoint.x) {
	      topLeftPoint.x = botRightPoint.x;
	    }

	    outline.addPoint(topLeftPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(topLeftPoint.x,
	          botRightPoint.y + Utils.skPercent(topLeftPoint.y - botRightPoint.y, SWG_PERC),
	          OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(topLeftPoint.x +
	          Utils.skPercent(botRightPoint.x - topLeftPoint.x, SWG_PERC),
	          botRightPoint.y, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(botRightPoint, OutlinePoint.ON_CURVE);
	  },

	  addSWGRightEndPoints: function(outline, bottomPoint, topPoint) {
	    topPoint = topPoint.clone();
	    bottomPoint = bottomPoint.clone();
	    var rad = Utils.skPercent(outline.shuRadius, WAN_PERC); // wanRadius
	    var minY = bottomPoint.y + rad * 4;
	    if (topPoint.y < minY) {
	      topPoint.y = minY;
	    }
	    var y3 = bottomPoint.y + Utils.intCast(rad / 2);
	    var y4 = Utils.intCast((3 * y3 + topPoint.y) / 4);
	    var y5 = Utils.intCast((3 * y4 + topPoint.y) / 4);
	    outline.addPoint(bottomPoint.x - Utils.skPercent(rad, 240), bottomPoint.y + rad, OutlinePoint.ON_CURVE);
	    outline.addPoint(bottomPoint.x - Utils.skPercent(rad, 120), bottomPoint.y + rad, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(bottomPoint.x - Utils.intCast(rad / 2), Utils.intCast((3 * bottomPoint.y + topPoint.y) / 4), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(topPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(topPoint.x + Utils.intCast(rad / 4), topPoint.y + Utils.intCast(rad / 4), OutlinePoint.ON_CURVE);
	    outline.addPoint(bottomPoint.x + Utils.intCast(rad / 2), y5, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(bottomPoint.x + rad * 2, y4, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(bottomPoint.x + rad * 2, y3, OutlinePoint.ON_CURVE);
	    outline.addPoint(bottomPoint.x + rad * 2, bottomPoint.y - Utils.intCast(rad / 2), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(bottomPoint.x + rad, bottomPoint.y - rad, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(bottomPoint.x - rad, bottomPoint.y - rad, OutlinePoint.ON_CURVE);
	  },

	  addSWGOutsidePoints: function(outline, topLeftPoint, botRightPoint) {
	    topLeftPoint = topLeftPoint.clone();
	    botRightPoint = botRightPoint.clone();
	    topLeftPoint.x -= outline.shuRadius;
	    botRightPoint.y -= Utils.skPercent(outline.shuRadius, WAN_PERC); // wanRadius

	    outline.addPoint(botRightPoint, OutlinePoint.ON_CURVE);

	    outline.addPoint(
	          topLeftPoint.x + Utils.skPercent(botRightPoint.x - topLeftPoint.x, SWG_PERC),
	          botRightPoint.y,
	          OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(
	          topLeftPoint.x,
	          botRightPoint.y + Utils.skPercent(topLeftPoint.y - botRightPoint.y, SWG_PERC),
	          OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(topLeftPoint, OutlinePoint.ON_CURVE);
	  },

	  addSCRightEndPoints: function(outline, right) {
	    var rad = Utils.skPercent(outline.shuRadius, WAN_PERC); // wanRadius;

	    outline.addPoint(right.x - rad, right.y + rad, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(right.x + rad, right.y + rad * 2, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(right.x + rad, right.y, OutlinePoint.ON_CURVE);
	    outline.addPoint(right.x + rad, right.y - Utils.intCast(rad / 2), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(right.x + Utils.intCast(rad / 2), right.y - rad, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(right.x - rad, right.y - rad, OutlinePoint.ON_CURVE);
	  },

	  addXieGouExceptTop: function(outline, topRight, bottomPoint, hookPoint, topLeft) {
	    hookPoint = hookPoint.clone();
	    var rad = Utils.skPercent(outline.shuRadius, NA_PERC); // naRadius

	    /* Move hookPoint to the right. (Otherwise, at small sizes, the hook would
	       look like a loop, curling back too far to the left.)  */
	    hookPoint.x += Utils.intCast(rad / 2);

	    var corner = new Point(bottomPoint.x - rad, bottomPoint.y + rad);
	    var lowLeft = new Point(bottomPoint.x - rad * 2, bottomPoint.y - Utils.intCast(rad / 2));
	    var xieRightPoints = OutlineHelpers.interpolateXiePoints(topRight, corner);
	    var xieLeftPoints = OutlineHelpers.interpolateXiePoints(topLeft, lowLeft);

	    var rug = new Point(bottomPoint.x, bottomPoint.y - rad);
	    var heelA;
	    /* Make heelA coutlinenear with xieLeftB and lowLeft */
	    if (xieLeftPoints[1].y === lowLeft.y) {
	      heelA = new Point(Utils.intCast((lowLeft.x + rug.x) / 2), rug.y);
	    } else {
	      heelA = new Point(
	        lowLeft.x + Utils.intCast(((lowLeft.x - xieLeftPoints[1].x) * (lowLeft.y - rug.y)) / (xieLeftPoints[1].y - lowLeft.y)),
	        rug.y
	      );
	      if (heelA.x > rug.x) {
	        heelA.x = rug.x;
	      }
	    }
	    var heelB = new Point(Utils.intCast((heelA.x + rug.x) / 2), rug.y);

	    var bumper = new Point(bottomPoint.x + rad, bottomPoint.y - Utils.intCast(rad / 2));
	    var nose = new Point(bumper.x, bottomPoint.y);
	    var noseHookA = new Point(bumper.x, Utils.intCast((bottomPoint.y * 3 + hookPoint.y) / 4));
	    var noseHookB = new Point(
	      Utils.intCast((bottomPoint.x + hookPoint.x) / 2),
	      Utils.intCast((bottomPoint.y + hookPoint.y) / 2)
	    );

	    outline.addPoint(xieRightPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(xieRightPoints[1], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(corner, OutlinePoint.ON_CURVE);
	    outline.addPoint(hookPoint.x - Utils.intCast(rad / 4), hookPoint.y + Utils.intCast(rad / 4), OutlinePoint.ON_CURVE);
	    outline.addPoint(hookPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(noseHookB, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(noseHookA, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(nose, OutlinePoint.ON_CURVE);
	    outline.addPoint(bumper.x, Utils.intCast((rug.y + bumper.y) / 2), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(Utils.intCast((rug.x + bumper.x) / 2), rug.y, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(rug, OutlinePoint.ON_CURVE);
	    outline.addPoint(heelB, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(heelA, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(lowLeft, OutlinePoint.ON_CURVE);
	    outline.addPoint(xieLeftPoints[1], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(xieLeftPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	  },

	  interpolateXiePoints: function(topLeft, bottomRight) {
	    var OL_XIE_CURVE_CTRL_Y1 = 52;
	    var OL_XIE_CURVE_CTRL_X2 = 24;
	    var OL_XIE_CURVE_CTRL_Y2 = 30;
	    var deltaX = bottomRight.x - topLeft.x;
	    var deltaY = topLeft.y - bottomRight.y;
	    return [
	      new Point(topLeft.x, bottomRight.y + Utils.xyScaleMul(OL_XIE_CURVE_CTRL_Y1, deltaY)),
	      new Point(topLeft.x + Utils.xyScaleMul(OL_XIE_CURVE_CTRL_X2, deltaX), bottomRight.y + Utils.xyScaleMul(OL_XIE_CURVE_CTRL_Y2, deltaY))
	    ];
	  },

	  addHZWGYOutline: function(outline, interp, refPoints) {
	    var rad = outline.shuRadius; /* to match GetSWGOutsidePoints() */

	    var corner = outline.getLastOutlinePoint().toPoint();

	    /* Next comes a straight diagonal falling to the left,
	        followed by a curve tangential to it. */
	    var p = interp.clone();
	    p.x += rad;
	    p.y -= rad; // make it a little thicker here
	    var q = refPoints[2].clone();
	    q.x += rad;
	    var ctrlPoints = OutlineHelpers.interpolateBackwardsDianControlPoints(corner, p, q);
	    outline.addPoint(p, OutlinePoint.ON_CURVE);
	    outline.addPoint(ctrlPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlPoints[1], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(q, OutlinePoint.ON_CURVE);
	    OutlineHelpers.addSWGInsidePoints(outline, refPoints[2], refPoints[3]);
	    OutlineHelpers.addSWGRightEndPoints(outline, refPoints[4], refPoints[5]);
	    OutlineHelpers.addSWGOutsidePoints(outline, refPoints[2], refPoints[3]);
	    p.x -= rad * 2;
	    p.y += rad;
	    q.x -= rad * 2;
	    corner.x -= rad * 2;
	    corner.y = refPoints[1].y - outline.hengRadius;
	    ctrlPoints = OutlineHelpers.interpolateBackwardsDianControlPoints(corner, p, q);
	    outline.addPoint(q, OutlinePoint.ON_CURVE);
	    outline.addPoint(ctrlPoints[1], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(p, OutlinePoint.ON_CURVE);
	    outline.addPoint(corner, OutlinePoint.ON_CURVE);
	  },

	  interpolateBackwardsDianControlPoints: function(corner, p, q) {
	    var ctrlA;
	    /* Want (p.y - ctrlA->y) / (p.x - ctrlA->x)
	            == (corner.y - p.y) / (corner.x - p.x) */
	    if (p.x === corner.x) {
	      ctrlA = q.clone(); // don't divide by zero!
	    } else {
	      ctrlA = new Point(q.x, p.y - Utils.intCast(((p.x - q.x) * (corner.y - p.y)) / (corner.x - p.x)));
	    }
	    var ctrlB = new Point(q.x, Utils.intCast((q.y + ctrlA.y) / 2));

	    /* Sanity check */
	    if (ctrlA.y < q.y || ctrlB.y < q.y || ctrlA.y > p.y || ctrlB.y > p.y
	        || ctrlA.x < q.x || ctrlB.x < q.x || ctrlA.x > p.x || ctrlB.x > p.x) {
	      ctrlA = p.clone();
	      ctrlB = q.clone();
	    }
	    return [ctrlA, ctrlB];
	  },

	  addShuGouBottomOutline: function(outline, bottomPoint, hookPoint) {
	    var rad = outline.shuRadius;

	    var maxX = bottomPoint.x - rad * 3;
	    if (hookPoint.x > maxX) {
	      hookPoint.x = maxX;
	    }
	    var p = new Point(
	      Utils.intCast((bottomPoint.x + hookPoint.x) / 2),
	      Utils.intCast((bottomPoint.y + hookPoint.y) / 2)
	    );
	    var delta = Utils.intCast(rad / 4);
	    var pp = p.clone();
	    var nearHook = hookPoint.clone();
	    nearHook.x -= delta;
	    nearHook.y -= delta;
	    pp.x -= delta;
	    pp.y -= delta;
	    var poo = new Point(
	      Utils.intCast((pp.x + bottomPoint.x) / 2),
	      bottomPoint.y - Utils.intCast(rad / 2)
	    );

	    var minX = bottomPoint.x - rad * 2;
	    if (poo.x < minX) {
	      poo.x = minX;
	    }
	    var how = new Point(poo.x, bottomPoint.y - rad);
	    var lastPoint = new Point(bottomPoint.x + rad, bottomPoint.y + rad);

	    outline.addPoint(lastPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(lastPoint.x, Utils.intCast((how.y + lastPoint.y) / 2), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(Utils.intCast((how.x + lastPoint.x) / 2), how.y, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(how, OutlinePoint.ON_CURVE);
	    outline.addPoint(poo, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(pp, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(nearHook, OutlinePoint.ON_CURVE);
	    outline.addPoint(hookPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(p, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(bottomPoint.x - rad, bottomPoint.y + Utils.skPercent(rad, 170), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(bottomPoint.x - rad, bottomPoint.y + rad * 2, OutlinePoint.ON_CURVE);
	  },

	  addHengGouRightEndOutlinePoints: function(outline, rightPoint, hookPoint) {
	    var rad = outline.shuRadius;
	    var x = rightPoint.x + Utils.skPercent(rad, 140);
	    var y = rightPoint.y - Utils.skPercent(rad, 120);

	    /* Straight line down left to far left */
	    outline.addPoint(rightPoint.x - rad * 2, rightPoint.y + outline.hengRadius, OutlinePoint.ON_CURVE);

	    /* Curve left up convex to tippy top */
	    outline.addPoint(rightPoint.x - Utils.skPercent(rad, 68), rightPoint.y + rad * 2, OutlinePoint.ON_CURVE);
	    outline.addPoint(rightPoint.x + Utils.skPercent(rad, 112), rightPoint.y + Utils.skPercent(rad, 40), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(x, y + Utils.skPercent(rad, 70), OutlinePoint.OFF_CURVE_CUBIC);

	    /* Curve to far right */
	    outline.addPoint(x, y, OutlinePoint.ON_CURVE);
	    outline.addPoint(rightPoint.x + Utils.skPercent(rad, 10), rightPoint.y - Utils.skPercent(rad, 140), OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(hookPoint.x + Utils.skPercent(rad, 88), hookPoint.y + Utils.skPercent(rad, 40), OutlinePoint.OFF_CURVE_CUBIC);

	    /* Tip of hook */
	    outline.addPoint(hookPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(hookPoint.x - Utils.intCast(rad / 4), hookPoint.y - Utils.intCast(rad / 4), OutlinePoint.ON_CURVE);

	    /* Inside corner */
	    outline.addPoint(rightPoint.x - Utils.skPercent(rad, 180), rightPoint.y - outline.hengRadius, OutlinePoint.ON_CURVE);
	  },

	  addShuTiBottomPoints: function(outline, bottomPoint, hookPoint) {
	    var rad = outline.shuRadius;
	    var a = new Point(hookPoint.x - Utils.intCast(rad / 4), hookPoint.y + Utils.intCast(rad / 4));
	    var b = new Point(bottomPoint.x + rad, bottomPoint.y + Utils.skPercent(rad, 240));
	    if (b.y > a.y) {
	      b.y = a.y;
	    }
	    outline.addPoint(b, OutlinePoint.ON_CURVE);
	    outline.addPoint(a, OutlinePoint.ON_CURVE);
	    outline.addPoint(hookPoint, OutlinePoint.ON_CURVE);
	    OutlineHelpers.addShuZheOutlineCornerPoints(outline, bottomPoint);
	  },

	  addPieGouBottomOutline: function(outline, curveStartPoint, bottomRefPoint, hookPoint, curveEndPoint) {
	    var rad = outline.shuRadius;

	    var heelPoint = new Point(
	      bottomRefPoint.x - rad - Utils.intCast(rad / 2),
	      bottomRefPoint.y - rad
	    );

	    var restPoint = new Point(
	      bottomRefPoint.x,
	      bottomRefPoint.y + rad
	    );

	    var endCtrlPoints = OutlineHelpers.getPieControlPoints(curveEndPoint, restPoint, false);
	    var startCtrlPoints = OutlineHelpers.getPieControlPoints(curveStartPoint, heelPoint, false);

	    var ctrlF = new Point(
	      Utils.intCast((bottomRefPoint.x + hookPoint.x) / 2),
	      Utils.intCast((bottomRefPoint.y + hookPoint.y) / 2)
	    );
	    var ctrlE = new Point(
	      Utils.intCast((ctrlF.x + restPoint.x) / 2),
	      restPoint.y
	    );
	    var delta = Utils.intCast(rad / 2);
	    var nearHook = new Point(hookPoint.x - delta, hookPoint.y - delta);
	    var ctrlG = new Point(ctrlF.x - delta, ctrlF.y - delta);
	    var ctrlH = new Point(heelPoint.x, Utils.intCast((bottomRefPoint.y + heelPoint.y) / 2));

	    outline.addPoint(startCtrlPoints.top, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(startCtrlPoints.bottom, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(heelPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(ctrlH, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlG, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(nearHook, OutlinePoint.ON_CURVE);
	    outline.addPoint(hookPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(ctrlF, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlE, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(restPoint, OutlinePoint.ON_CURVE);
	    outline.addPoint(endCtrlPoints.bottom, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(endCtrlPoints.top, OutlinePoint.OFF_CURVE_CUBIC);
	  }

	};

	module.exports = OutlineHelpers;


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	var Point = __webpack_require__(4);

	var OutlinePoint = function(x, y, flag) {
	  this.x = x;
	  this.y = y;
	  this.flag = flag;
	};

	// ----- consts -----

	OutlinePoint.OFF_CURVE_QUADRATIC = 0; /* bits 0, 1 both clear: off curve, 2nd-order (quadratic) */
	OutlinePoint.ON_CURVE            = 1; /* bit 0 set */
	OutlinePoint.OFF_CURVE_CUBIC     = 2; /* bit 1 set: off curve, 3rd-order (cubic) */

	// ----- getters -----

	OutlinePoint.prototype.toPoint = function() { return new Point(this.x, this.y); };

	module.exports = OutlinePoint;


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var OutlinePoint = __webpack_require__(11);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var rad = outline.shuRadius;

	    outline.addPoint(refPoints[1], OutlinePoint.ON_CURVE);
	    outline.addPoint(refPoints[1].x,
	      refPoints[1].y - Utils.intCast(rad / 2), OutlinePoint.ON_CURVE);

	    if (refPoints[1].x - refPoints[0].x < refPoints[1].y - refPoints[0].y) {
	      // more vertical, as in san-dian-shui. Make it rounded.
	      outline.addPoint(refPoints[0].x + rad,
	          refPoints[0].y - Utils.skPercent(rad, 70), OutlinePoint.ON_CURVE);
	      outline.addPoint(refPoints[0].x + Utils.skPercent(rad, 20),
	          refPoints[0].y - rad, OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(refPoints[0].x - Utils.skPercent(rad, 90),
	          refPoints[0].y - Utils.skPercent(rad, 80), OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(refPoints[0].x - Utils.skPercent(rad, 170),
	          refPoints[0].y + Utils.skPercent(rad, 190), OutlinePoint.ON_CURVE);
	      outline.addPoint(refPoints[0].x - rad,
	          refPoints[0].y + Utils.skPercent(rad, 150), OutlinePoint.ON_CURVE);
	    } else { // more horizontal.
	      outline.addPoint(refPoints[0].x,
	          refPoints[0].y - rad, OutlinePoint.ON_CURVE);
	      outline.addPoint(refPoints[0].x - Utils.skPercent(rad, 10),
	          refPoints[0].y - Utils.skPercent(rad, 90), OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(refPoints[0].x - Utils.skPercent(rad, 90),
	          refPoints[0].y - Utils.skPercent(rad, 50), OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(refPoints[0].x - Utils.skPercent(rad, 140),
	          refPoints[0].y + Utils.skPercent(rad, 170), OutlinePoint.ON_CURVE);
	      outline.addPoint(refPoints[0].x - Utils.skPercent(rad, 70),
	          refPoints[0].y + Utils.skPercent(rad, 150), OutlinePoint.ON_CURVE);
	    }
	  }
	};


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addShuBottomOutlinePoints(outline, refPoints[1]);
	  }
	};


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addShuGouBottomOutline(outline, refPoints[1], refPoints[2]);
	  }
	};


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var startAndEnd = OutlineHelpers.addPieTopOutline(outline, refPoints, false);
	    OutlineHelpers.addPieTipOutline(outline, startAndEnd.start, refPoints[1], startAndEnd.end, false);
	  }
	};


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var startAndEnd = OutlineHelpers.addPieTopOutline(outline, refPoints, true);
	    OutlineHelpers.addPieTipOutline(outline, startAndEnd.start, refPoints[1], startAndEnd.end, true);
	  }
	};


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	var Point = __webpack_require__(4);
	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var rad = outline.shuRadius;
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);

	    var curveStartPoint = new Point(refPoints[1].x + rad, refPoints[1].y - rad);
	    var curveEndPoint = new Point(refPoints[1].x - rad, refPoints[1].y + rad);

	    OutlineHelpers.addPieTipOutline(outline, curveStartPoint, refPoints[2], curveEndPoint, true);
	  }
	};


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var Point = __webpack_require__(4);
	var OutlinePoint = __webpack_require__(11);
	var HengOutliner = __webpack_require__(9);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    /* head=tail='cut' means this is 横点, as in ⻗. */
	    if (outline.isHeadCut() && outline.isTailCut()) {
	      HengOutliner.addPoints(outline, refPoints);
	      return;
	    }
	    var rad = outline.shuRadius; // dianRadius
	    var dx = refPoints[1].x - refPoints[0].x;
	    var dy = refPoints[1].y - refPoints[0].y;
	    var hypotenuse = Utils.hypotenuse(dx, dy);

	    /* First make all points relative to refPoints[0].
	            The whole stroke is laid out horizontally. */
	    /* Total ten points.
	        a and j are first and last points, respectively. They
	        are close together near refPoints[0], joined by a short
	        straight line. */

	    var j = new Point(0 - rad, 0 - Utils.intCast(rad / 4));
	    var a = new Point(0 - rad, 0);

	    /* b, c, e, f, h, and i are OFF_CURVE_CUBIC points. */
	    var b = new Point(Utils.skPercent(hypotenuse, 80), Utils.skPercent(rad, 270));
	    var c = new Point(hypotenuse - Utils.skPercent(rad, 8), Utils.skPercent(rad, 190));
	    var e = new Point(hypotenuse + Utils.skPercent(rad, 80), 0 - Utils.skPercent(rad, 60));
	    var f = new Point(hypotenuse + Utils.skPercent(rad, 20), 0 - Utils.skPercent(rad, 120));
	    var h = new Point(Utils.skPercent(hypotenuse, 70), 0);
	    var i = new Point(Utils.intCast((j.x + h.x) / 2), 0); // AFTER defining h.x

	    /* d and g are ON_CURVE. Easiest to do them after
	        their adjacent control points, and make d and g the midpoints,
	        thus ensuring that cde and fgh are colinear.

	        Note: for TrueType 2nd-order curves, all the off-curve points
	            should be closer to the curve (decrease distance from nearest
	            on-curve point by 25%). A bonus would be that we wouldn't
	            need d and g (let the rasterizer insert them); only 8 points
	            instead of ten. */
	    var d = new Point(Utils.intCast((c.x + e.x) / 2), Utils.intCast((c.y + e.y) / 2));
	    var g = new Point(Utils.intCast((f.x + h.x) / 2), Utils.intCast((f.y + h.y) / 2));

	    outline.addPoint(a, OutlinePoint.ON_CURVE);
	    outline.addPoint(b, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(c, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(d, OutlinePoint.ON_CURVE);
	    outline.addPoint(e, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(f, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(g, OutlinePoint.ON_CURVE);
	    outline.addPoint(h, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(i, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(j, OutlinePoint.ON_CURVE);

	    /* Rotate clockwise around origin, and add refPoints[0] */
	    outline.rotateAndTranslate(refPoints[0], dx, dy, hypotenuse);
	  }
	};


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var OutlineHelpers = __webpack_require__(10);
	var Point = __webpack_require__(4);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var topLeft;
	    var topRight;
	    if (!outline.isHeadCut()
	        && (refPoints[1].x - refPoints[0].x) * 3
	        < (refPoints[0].y - refPoints[1].y) * 4) {
	      /* as in ba1 'eight', fen1 'divide', gua3 'few' for example. */
	      OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	      topLeft = outline.getFirstOutlinePoint();
	      topRight = outline.getLastOutlinePoint().toPoint();
	      outline.deleteLastPoint();
	      /* Must make sure topRight isn't to the left
	           of the curve starting at topLeft. (Problem in gua3 'few'.)
	           For simplicity, just look at the line from topLeft to refPoints[1]. */
	      if (topLeft.y <= refPoints[1].y) {
	        topRight.y = refPoints[1].y + outline.hengRadius;
	      } else {
	        var minX = topLeft.x + ((topLeft.y - topRight.y) * (refPoints[1].x - topLeft.x)) / (topLeft.y - refPoints[1].y);
	        if (topRight.x < minX) {
	          topRight.x = minX;
	        }
	      }
	    } else {
	      topLeft = new Point(
	        refPoints[0].x - Utils.intCast(outline.shuRadius / 4),
	        refPoints[0].y - Utils.intCast(outline.shuRadius / 8)
	      );
	      topRight = refPoints[0];
	    }
	    OutlineHelpers.addNaStuff(outline, topRight, topLeft, refPoints[1]);
	  }
	};


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var Point = __webpack_require__(4);
	var OutlinePoint = __webpack_require__(11);
	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    // where dian and na meet
	    var midLeft = new Point(
	      refPoints[1].x - outline.shuRadius,
	      refPoints[1].y - outline.hengRadius
	    );

	    var midRight = refPoints[1].clone();
	    midRight.x += outline.shuRadius;

	    var naBottomPoints = OutlineHelpers.prepareNaEndPoints(outline, refPoints[2]);
	    var naRightCtrlPoints = OutlineHelpers.interpolateNaPoints(midRight, naBottomPoints.right, true);
	    var naLeftCtrlPoints = OutlineHelpers.interpolateNaPoints(midLeft, naBottomPoints.left, false);

	    var top = new Point(
	      refPoints[0].x + outline.shuRadius, // dianRadius
	      refPoints[0].y + outline.hengRadius
	    );

	    var left = refPoints[0].clone();
	    left.x -= outline.shuRadius;
	    outline.addPoint(left, OutlinePoint.ON_CURVE);

	    var ctrlA = new Point(left.x, Utils.intCast((left.y + top.y) / 2));
	    var ctrlB = new Point(Utils.intCast((left.x + top.x) / 2), top.y);
	    outline.addPoint(ctrlA, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlB, OutlinePoint.OFF_CURVE_CUBIC);

	    outline.addPoint(top, OutlinePoint.ON_CURVE);

	    ctrlB.y = Utils.intCast((top.y + midRight.y) / 2);
	    /* Want (ctrlB.y - midRight.y) / (midRight.x - ctrlB.x)
	            == (midRight.y - naRightCtrlPoints[0].y) / (naRightCtrlPoints[0].x - midRight.x) */
	    if (midRight.y === naRightCtrlPoints[0].y) {
	      ctrlB.x = midRight.x; // don't divide by zero
	    } else {
	      var numerator = (ctrlB.y - midRight.y) * (naRightCtrlPoints[0].x - midRight.x);
	      ctrlB.x = midRight.x - Utils.intCast(numerator / (midRight.y - naRightCtrlPoints[0].y));
	    }
	    ctrlA.y = top.y;
	    ctrlA.x = Utils.intCast((top.x + ctrlB.x) / 2);
	    outline.addPoint(ctrlA, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlB, OutlinePoint.OFF_CURVE_CUBIC);

	    outline.addPoint(midRight, OutlinePoint.ON_CURVE);
	    outline.addPoint(naRightCtrlPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(naRightCtrlPoints[1], OutlinePoint.OFF_CURVE_CUBIC);
	    var naEndPoints = OutlineHelpers.interpolateNaEndPoints(naBottomPoints.right, naBottomPoints.left);
	    outline.addPoint(naBottomPoints.right, OutlinePoint.ON_CURVE);
	    outline.addPoint(naEndPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(naEndPoints[1], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(naBottomPoints.left, OutlinePoint.ON_CURVE);
	    outline.addPoint(naLeftCtrlPoints[1], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(naLeftCtrlPoints[0], OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(midLeft, OutlinePoint.ON_CURVE);

	    ctrlA.x = left.x;
	    ctrlA.y = left.y - outline.hengRadius;
	    ctrlB.y = ctrlA.y;

	    /* Want (midLeft.y - ctrlB.y) / (midLeft.x - ctrlB.x)
	            == (naLeftCtrlPoints[0].y - midLeft.y) / (naLeftCtrlPoints[0].x - midLeft.x) */
	    ctrlB.x = midLeft.x - Utils.intCast(((naLeftCtrlPoints[0].x - midLeft.x) * (midLeft.y - ctrlB.y)) / (naLeftCtrlPoints[0].y - midLeft.y));
	    outline.addPoint(ctrlB, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlA, OutlinePoint.OFF_CURVE_CUBIC);
	  }
	};


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addPingNaUpperCurve(outline, refPoints[0], refPoints[1]);
	    OutlineHelpers.addPingNaRightEndPoints(outline, refPoints[2]);
	    OutlineHelpers.addPingNaLowerCurve(outline, refPoints[0], refPoints[1]);
	  }
	};


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var topLeft = refPoints[1].clone();
	    var topRight = topLeft.clone();
	    topLeft.y -= outline.hengRadius;
	    topRight.y += outline.hengRadius;
	    OutlineHelpers.addNaStuff(outline, topRight, topLeft, refPoints[2]);
	    OutlineHelpers.addSouthwestWideEndPoints(outline, refPoints[0]);
	  }
	};


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addPingNaUpperCurve(outline, refPoints[1], refPoints[2]);
	    OutlineHelpers.addPingNaRightEndPoints(outline, refPoints[3]);
	    OutlineHelpers.addPingNaLowerCurve(outline, refPoints[1], refPoints[2]);
	    OutlineHelpers.addSouthwestWideEndPoints(outline, refPoints[0]);
	  }
	};


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[1]);
	    OutlineHelpers.addShuBottomOutlinePoints(outline, refPoints[2]);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[1]);
	  }
	};


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var Point = __webpack_require__(4);
	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addHengPieOutlineCornerPoints(outline, refPoints[1]);
	    var curveStartPoint = outline.getLastOutlinePoint().toPoint();
	    outline.deleteLastPoint(); // don't add curveStartPoint twice!

	    /* Inside corner (also left top of pie): */
	    var bottomRefPoint = new Point(
	      refPoints[1].x - Utils.skPercent(outline.shuRadius, 120), // pieRadius
	      refPoints[1].y - outline.hengRadius
	    );

	    OutlineHelpers.addPieTipOutline(outline, curveStartPoint, refPoints[2], bottomRefPoint, false);
	  }
	};


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);
	var HengZheOutliner = __webpack_require__(24);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    if (outline.isTailCut()) {
	      /* Note: the first stroke of ma3 'horse' (simplified) is not
	          really heng gou, it's heng zhe; but, the vertical stroke
	          is slanted, and in the original font it was treated as hg.
	          We therefore pretend it is hg, but say the end is cut off
	          so it won't be pointed. Same in wu3 'five'.
	          Should just use "hz" for all such characters! */
	      HengZheOutliner.addPoints(outline, refPoints);
	      return;
	    }
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addHengGouRightEndOutlinePoints(outline, refPoints[1], refPoints[2]);
	  }
	};


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	var OutlinePoint = __webpack_require__(11);
	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	    if (refPoints[0].x !== refPoints[1].x) { // slant
	      // TODO: test this branch
	      var ctrl = outline.getLastOutlinePoint().toPoint();
	      ctrl.x -= outline.shuRadius * 2;
	      OutlineHelpers.addNortheastCornerPoint(outline, refPoints[1]);
	      OutlineHelpers.addHengRightEndOutlinePoints(outline, refPoints[1], refPoints[2]);
	      OutlineHelpers.addShuZheOutlineCornerPoints(outline, refPoints[1]);
	      outline.addPoint(ctrl, OutlinePoint.OFF_CURVE_CUBIC);
	      outline.addPoint(ctrl, OutlinePoint.OFF_CURVE_CUBIC);
	    } else { // no slant
	      OutlineHelpers.addNortheastCornerPoint(outline, refPoints[1]);
	      OutlineHelpers.addHengRightEndOutlinePoints(outline, refPoints[1], refPoints[2]);
	      OutlineHelpers.addShuZheOutlineCornerPoints(outline, refPoints[1]);
	    }
	  }
	};


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addSWGInsidePoints(outline, refPoints[1], refPoints[2]);
	    OutlineHelpers.addSCRightEndPoints(outline, refPoints[3]);
	    OutlineHelpers.addSWGOutsidePoints(outline, refPoints[1], refPoints[2]);
	  }
	};


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addShuTiBottomPoints(outline, refPoints[1], refPoints[2]);
	  }
	};


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var OutlineHelpers = __webpack_require__(10);
	var OutlinePoint = __webpack_require__(11);
	var Point = __webpack_require__(4);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var rad = outline.shuRadius; // pieRadius

	    var top    = refPoints[0].clone();
	    var corner = refPoints[1].clone();
	    var right  = refPoints[2].clone();
	    var pieOutsideTop;
	    var pieInsideTop;
	    var gotTop = false;
	    if (outline.isHeadCut()) {
	      /* Top cut off flat horizontally */
	      pieOutsideTop = new Point(top.x - rad, top.y);
	      pieInsideTop = new Point(top.x + rad, top.y);
	    } else {
	      OutlineHelpers.addPieZheTopOutlinePoints(outline, top);
	      pieInsideTop  = outline.getLastOutlinePoint().toPoint();
	      pieOutsideTop = outline.getFirstOutlinePoint().toPoint();
	      gotTop = true;
	    }
	    var pieInsideBottom = new Point(corner.x + Utils.intCast(rad / 2), corner.y + rad);
	    var pieOutsideBottom = new Point(pieInsideBottom.x - Utils.intCast(rad / 2), pieInsideBottom.y + Utils.intCast(rad / 2));

	    var left = new Point(
	      corner.x - Utils.skPercent(rad, 140),
	      pieInsideBottom.y - Utils.intCast(rad / 4)
	    );

	    var outsidePoints = OutlineHelpers.getPieControlPoints(pieOutsideTop, pieOutsideBottom, false);
	    var insidePoints = OutlineHelpers.getPieControlPoints(pieInsideTop, pieInsideBottom, false);

	    var leftAY = Utils.intCast((left.y + pieOutsideBottom.y) / 2);
	    var leftA;
	    /* Make leftA colinear with old outsidePoints.bottom and pieOutsideBottom */
	    if (outsidePoints.bottom.y === pieOutsideBottom.y) { // don't divide by zero
	      leftA = new Point(pieOutsideBottom.x, leftAY);
	    } else {
	      var numerator = (pieOutsideBottom.y - leftAY) * (outsidePoints.bottom.x - pieOutsideBottom.x);
	      leftA = new Point(
	        pieOutsideBottom.x - Utils.intCast(numerator / (outsidePoints.bottom.y - pieOutsideBottom.y)),
	        leftAY
	      );
	    }
	    var leftB = new Point(Utils.intCast((3 * left.x + pieOutsideBottom.x) / 4), left.y);

	    var cake = new Point(corner.x, corner.y - rad);
	    var cheese = new Point(cake.x + rad, cake.y + Utils.intCast(rad / 2));

	    if (!gotTop) {
	      outline.addPoint(pieInsideTop, OutlinePoint.ON_CURVE);
	    }
	    outline.addPoint(insidePoints.top, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(insidePoints.bottom, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(pieInsideBottom, OutlinePoint.ON_CURVE);
	    outline.addPoint(right.x, right.y + outline.hengRadius, OutlinePoint.ON_CURVE);
	    outline.addPoint(right.x, right.y - outline.hengRadius, OutlinePoint.ON_CURVE);
	    outline.addPoint(cheese, OutlinePoint.ON_CURVE);
	    outline.addPoint(cake, OutlinePoint.ON_CURVE);
	    outline.addPoint(left, OutlinePoint.ON_CURVE);
	    outline.addPoint(leftB, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(leftA, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(pieOutsideBottom, OutlinePoint.ON_CURVE);
	    outline.addPoint(outsidePoints.bottom, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(outsidePoints.top, OutlinePoint.OFF_CURVE_CUBIC);
	    if (!gotTop) {
	      outline.addPoint(pieOutsideTop, OutlinePoint.ON_CURVE);
	    }
	  }
	};


/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var OutlineHelpers = __webpack_require__(10);
	var Point = __webpack_require__(4);
	var OutlinePoint = __webpack_require__(11);
	var DianOutliner = __webpack_require__(18);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var rad = outline.shuRadius; // pieRadius

	    /* First do the bottom, dian, because it's more complicated (rotation). */
	    DianOutliner.addPoints(outline, refPoints.splice(1));

	    /* The first and last points of dian are at its top; the first point
	        is slightly to the right of the last. Adjust them to have the
	        same y coordinate and to be further apart. They will be the bottom
	        of the pie part of the stroke. */
	    outline.getFirstOutlinePoint().x = outline.getLastOutlinePoint().x + rad; // move right a bit
	    outline.getFirstOutlinePoint().y = outline.getLastOutlinePoint().y;

	    var top = refPoints[0];
	    var pieInsideBottom = outline.getFirstOutlinePoint();
	    var pieOutsideBottom = outline.getLastOutlinePoint().toPoint();
	    var pieOutsideTop = new Point(top.x - rad, top.y + rad);
	    var pieInsideTop = new Point(top.x + Utils.skPercent(rad, 80), top.y - Utils.skPercent(rad, 60));

	    /* Left side of pie */
	    var ctrlPoints = OutlineHelpers.getPieControlPoints(pieOutsideTop, pieOutsideBottom, false);
	    outline.addPoint(ctrlPoints.bottom, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlPoints.top, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(pieOutsideTop, OutlinePoint.ON_CURVE);

	    /* Top of pie */
	    var serifPt = new Point(top.x + Utils.skPercent(rad, 140), top.y - Utils.intCast(rad / 4));
	    OutlineHelpers.addNortheastConvexityPoints(outline, pieOutsideTop, serifPt);
	    outline.addPoint(serifPt, OutlinePoint.ON_CURVE); // right serif

	    /* Right side of pie */
	    ctrlPoints = OutlineHelpers.getPieControlPoints(pieInsideTop, pieInsideBottom, false);
	    outline.addPoint(pieInsideTop, OutlinePoint.ON_CURVE);
	    outline.addPoint(ctrlPoints.top, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(ctrlPoints.bottom, OutlinePoint.OFF_CURVE_CUBIC);
	  }
	};


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var curvePoints = OutlineHelpers.addPieTopOutline(outline, refPoints, false); // five points
	    OutlineHelpers.addPieGouBottomOutline(outline, curvePoints.start, refPoints[1], refPoints[2], curvePoints.end);
	  }
	};


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var Point = __webpack_require__(4);
	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var topLeft = new Point(
	      refPoints[0].x - Utils.intCast(outline.shuRadius / 4),
	      refPoints[0].y - Utils.intCast(outline.shuRadius / 4)
	    );

	    OutlineHelpers.addWanGouStuff(outline, topLeft, refPoints[0], refPoints.splice(1), true);
	  }
	};


/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addXieGouExceptTop(outline, outline.getLastOutlinePoint().toPoint(), refPoints[1],
	        refPoints[2], outline.getFirstOutlinePoint().toPoint());
	  }
	};


/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[1]);
	    OutlineHelpers.addNortheastCornerPoint(outline, refPoints[2]);
	    OutlineHelpers.addHengRightEndOutlinePoints(outline, refPoints[2], refPoints[3]);
	    OutlineHelpers.addShuZheOutlineCornerPoints(outline, refPoints[2]);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[1]);
	  }
	};


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[1]);
	    OutlineHelpers.addSWGInsidePoints(outline, refPoints[2], refPoints[3]);
	    OutlineHelpers.addSCRightEndPoints(outline, refPoints[4]);
	    OutlineHelpers.addSWGOutsidePoints(outline, refPoints[2], refPoints[3]);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[1]);
	  }
	};


/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[1]);
	    OutlineHelpers.addShuTiBottomPoints(outline, refPoints[2], refPoints[3]);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[1]);
	  }
	};


/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var Point = __webpack_require__(4);
	var CdlStroke = __webpack_require__(2);
	var OutlineHelpers = __webpack_require__(10);
	var HengOutliner = __webpack_require__(9);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    if (refPoints[1].y === refPoints[0].y) {
	      // Easy, first segment is exactly horizontal
	      OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    } else { // Starts out slanted, rotation required.
	      /* First part is rotated heng */
	      var dx = refPoints[1].x - refPoints[0].x;
	      var dy = refPoints[1].y - refPoints[0].y;
	      var hypotenuse = Utils.hypotenuse(dx, dy);

	      /* First make all points relative to refPoints[0] */
	      var flatPoints = [];
	      flatPoints[0] = new Point(0, 0);
	      flatPoints[1] = new Point(hypotenuse, 0);
	      var tail = outline.tail; // save
	      outline.tail = CdlStroke.STROKE_TAIL_CUT;
	      HengOutliner.addPoints(outline, flatPoints);
	      outline.tail = tail; // restore
	      /* Now rotate around origin, and add refPoints[0] */
	      outline.rotateAndTranslate(refPoints[0], dx, dy, hypotenuse);

	      // discard last two points (right end of heng)
	      outline.deleteLastPoint();
	      outline.deleteLastPoint();
	    }
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[1]);
	    if (refPoints[2].x === refPoints[1].x) {
	      OutlineHelpers.addShuGouBottomOutline(outline, refPoints[2], refPoints[3]);
	    } else {
	      OutlineHelpers.addWanGouBottomOutline(outline, refPoints[1], refPoints[2], refPoints[3], true);
	    }
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[1]);
	  }
	};


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);
	var OutlinePoint = __webpack_require__(11);
	var Point = __webpack_require__(4);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[1]);
	    var curveStartPoint = outline.getLastOutlinePoint().toPoint();
	    var curveEndPoint = new Point(
	      refPoints[1].x - outline.shuRadius,
	      refPoints[1].y - outline.hengRadius
	    );
	    OutlineHelpers.addXieGouExceptTop(outline, curveStartPoint, refPoints[2], refPoints[3], curveEndPoint);
	    outline.addPoint(curveEndPoint, OutlinePoint.ON_CURVE);
	  }
	};


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addNortheastCornerPoint(outline, refPoints[1]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[2]);
	    OutlineHelpers.addShuBottomOutlinePoints(outline, refPoints[3]);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[2]);
	    OutlineHelpers.addShuZheOutlineCornerPoints(outline, refPoints[1]);
	  }
	};


/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);
	var Point = __webpack_require__(4);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addNortheastCornerPoint(outline, refPoints[1]);
	    if (refPoints[3].x > refPoints[1].x) { // make the bottom a straight hook, not curved
	      OutlineHelpers.addHengGouRightEndOutlinePoints(outline, refPoints[2], refPoints[3]);
	    } else { // bottom curved pie
	      // TODO: figure out how to test this branch
	      OutlineHelpers.addHengPieOutlineCornerPoints(outline, refPoints[2]);
	      var curveStartPoint = outline.getLastOutlinePoint().toPoint();
	      outline.deleteLastPoint(); // don't add curveStartPoint twice!
	      var bottomRefPoint = new Point(
	        refPoints[2].x - outline.shuRadius,
	        refPoints[2].y - outline.hengRadius
	      );
	      OutlineHelpers.addPieTipOutline(outline, curveStartPoint, refPoints[3], bottomRefPoint, false);
	    }
	    OutlineHelpers.addShuZheOutlineCornerPoints(outline, refPoints[1]);
	  }
	};


/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addSWGInsidePoints(outline, refPoints[1], refPoints[2]);
	    OutlineHelpers.addSWGRightEndPoints(outline, refPoints[3], refPoints[4]);
	    OutlineHelpers.addSWGOutsidePoints(outline, refPoints[1], refPoints[2]);
	  }
	};


/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[1]);
	    OutlineHelpers.addNortheastCornerPoint(outline, refPoints[2]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[3]);
	    OutlineHelpers.addShuBottomOutlinePoints(outline, refPoints[4]);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[3]);
	    OutlineHelpers.addShuZheOutlineCornerPoints(outline, refPoints[2]);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[1]);
	  }
	};


/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	var Point = __webpack_require__(4);
	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[1]);
	    OutlineHelpers.addNortheastCornerPoint(outline, refPoints[2]);
	    OutlineHelpers.addHengPieOutlineCornerPoints(outline, refPoints[3]);
	    var curveStartPoint = outline.getLastOutlinePoint().toPoint();
	    outline.deleteLastPoint(); // don't add curveStartPoint twice!

	    var bottomRefPoint = new Point(
	      refPoints[3].x - outline.shuRadius,
	      refPoints[3].y - outline.hengRadius
	    );
	    OutlineHelpers.addPieTipOutline(outline, curveStartPoint, refPoints[4], bottomRefPoint, false);
	    OutlineHelpers.addShuZheOutlineCornerPoints(outline, refPoints[2]);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[1]);
	  }
	};


/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var Point = __webpack_require__(4);
	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    if (refPoints[2].x === refPoints[1].x) {
	      OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[1]);
	      OutlineHelpers.addSWGInsidePoints(outline, refPoints[2], refPoints[3]);
	      OutlineHelpers.addSWGRightEndPoints(outline, refPoints[4], refPoints[5]);
	      OutlineHelpers.addSWGOutsidePoints(outline, refPoints[2], refPoints[3]);
	      OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[1]);
	    } else {
	      OutlineHelpers.addHengPieOutlineCornerPoints(outline, refPoints[1]);

	      /* This point is interpolated. */
	      /* '10,0 90,0 [20,62] 0,104 33,128 128,128 128,84' */
	      var interp = new Point(
	          Utils.skPercent(refPoints[1].x, 22) + Utils.skPercent(refPoints[2].x, 78),
	          Utils.skPercent(refPoints[1].y, 40) + Utils.skPercent(refPoints[2].y, 60)
	      );
	      OutlineHelpers.addHZWGYOutline(outline, interp, refPoints);
	    }
	  }
	};


/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);
	var CdlStroke = __webpack_require__(2);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    /* The head is always cut. */
	    outline.head = CdlStroke.STROKE_HEAD_CUT;
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    var kLeft  = refPoints[2].clone();
	    var kRight = refPoints[2].clone();
	    kRight.x += outline.shuRadius;
	    kRight.y += outline.hengRadius;

	    OutlineHelpers.addHengPieOutlineCornerPoints(outline, refPoints[1]);
	    OutlineHelpers.addWanGouStuff(outline, kLeft, kRight, refPoints.slice(3), false /* don't fix hook */);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[1]);
	  }
	};


/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addNortheastCornerPoint(outline, refPoints[1]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[2]);
	    OutlineHelpers.addWanGouBottomOutline(outline, refPoints[2], refPoints[3], refPoints[4], true);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[2]);
	    OutlineHelpers.addShuZheOutlineCornerPoints(outline, refPoints[1]);
	  }
	};


/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[0]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[1]);
	    OutlineHelpers.addNortheastCornerPoint(outline, refPoints[2]);
	    OutlineHelpers.addHengzheOutlineCornerPoints(outline, refPoints[3]);
	    OutlineHelpers.addWanGouBottomOutline(outline, refPoints[3], refPoints[4], refPoints[5], true);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[3]);
	    OutlineHelpers.addShuZheOutlineCornerPoints(outline, refPoints[2]);
	    OutlineHelpers.addSouthwestCornerPoint(outline, refPoints[1]);
	  }
	};


/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	var Point = __webpack_require__(4);
	var OutlineHelpers = __webpack_require__(10);
	var OutlinePoint = __webpack_require__(11);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var seven = OutlineHelpers.getBezierSevenFromFour(refPoints);
	    var tt = OutlineHelpers.getBezierSevenFromFour(seven);
	    tt.pop();
	    tt = tt.concat(OutlineHelpers.getBezierSevenFromFour(seven.slice(3)));
	    var p = OutlineHelpers.getBezierSevenFromFour(tt);
	    p.pop();
	    p = p.concat(OutlineHelpers.getBezierSevenFromFour(tt.slice(3)));
	    p.pop();
	    p = p.concat(OutlineHelpers.getBezierSevenFromFour(tt.slice(6)));
	    p.pop();
	    p = p.concat(OutlineHelpers.getBezierSevenFromFour(tt.slice(9)));

	    var edge = [];
	    for (var i = 0; i < 25 - 3; i += 3) {
	      var parallelPoints = OutlineHelpers.getTwoParallelPoints(p.slice(i), outline.shuRadius);
	      edge[i] = parallelPoints[0];
	      edge[i + 1] = parallelPoints[1];
	      parallelPoints = OutlineHelpers.getTwoParallelPoints(p.slice(i + 2), outline.shuRadius);
	      edge[i + 2] = parallelPoints[0];
	      edge[i + 3] = parallelPoints[1];
	    }
	    for (i = 0; i < 25; i++) {
	      outline.addPoint(edge[i], ((i % 3) === 0) ? OutlinePoint.ON_CURVE : OutlinePoint.OFF_CURVE_CUBIC);
	    }
	    /* For opposite edge, just reflect the first edge's points symmetrically
	        across the center. */
	    for (i = 25 - 1; i >= 0; i--) {
	      var e = new Point(2 * p[i].x - edge[i].x, 2 * p[i].y - edge[i].y);
	      outline.addPoint(e, ((i % 3) === 0) ? OutlinePoint.ON_CURVE : OutlinePoint.OFF_CURVE_CUBIC);
	    }
	  }
	};


/***/ },
/* 50 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var Point = __webpack_require__(4);
	var BezierOutliner = __webpack_require__(49);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var xStart = refPoints[0].x;
	    var yStart = refPoints[0].y;
	    var xEnd   = refPoints[1].x;
	    var yEnd   = refPoints[1].y;

	    var bPoints = [];
	    bPoints[0] = refPoints[0];
	    bPoints[3] = refPoints[1];
	    /* For conic control points, should be 0.586 (2-sqrt(2))
	        distance from corner to each end. */
	    if ((yEnd > yStart && xEnd > xStart) || (yEnd < yStart && xEnd < xStart)) {
	      // want xmid closer to xEnd, ymid closer to yStart
	      bPoints[1] = new Point(Utils.intCast(xStart + 0.586 * (xEnd - xStart)), yStart);
	      bPoints[2] = new Point(xEnd,  Utils.intCast(yStart + 0.586 * (yEnd - yStart)));
	    } else {
	      // want xmid closer to xStart, ymid closer to yEnd
	      bPoints[1] = new Point(xStart, Utils.intCast(yEnd + 0.586 * (yStart - yEnd)));
	      bPoints[2] = new Point(Utils.intCast(xEnd + 0.586 * (xStart - xEnd)), yEnd);
	    }
	    BezierOutliner.addPoints(outline, bPoints);
	  }
	};


/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var OutlinePoint = __webpack_require__(11);
	var OutlineHelpers = __webpack_require__(10);

	module.exports = {
	  addPoints: function(outline, refPoints) {
	    var hrad = outline.hengRadius;
	    var srad = outline.shuRadius;
	    var delta = Utils.skPercent(srad, 30); // shu segment wants a long tail

	    OutlineHelpers.addShuTopOutlinePoints(outline, refPoints[0]);

	    var hangover = hrad + Utils.skPercent(srad, 80);
	    var y = refPoints[1].y - hangover - srad;
	    outline.addPoint(refPoints[1].x + srad, y + srad, OutlinePoint.ON_CURVE);
	    outline.addPoint(refPoints[1].x + delta, y + delta, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(refPoints[1].x - delta, y, OutlinePoint.OFF_CURVE_CUBIC);
	    outline.addPoint(refPoints[1].x - srad, y, OutlinePoint.ON_CURVE);
	    outline.addPoint(refPoints[1].x - srad, refPoints[1].y - hrad, OutlinePoint.ON_CURVE);
	    OutlineHelpers.addHengLeftEndOutlinePoints(outline, refPoints[2]);
	    outline.addPoint(refPoints[1].x - srad, refPoints[1].y + hrad, OutlinePoint.ON_CURVE);
	  }
	};


/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	var OutlinePoint = __webpack_require__(11);
	var CdlStroke = __webpack_require__(2);
	var Utils = __webpack_require__(5);

	var Outline = function(hengRadius, shuRadius, head, tail) {
	  this.outlinePoints = [];
	  this.hengRadius = hengRadius;
	  this.shuRadius = shuRadius;
	  this.head = head || CdlStroke.STROKE_HEAD_NORMAL;
	  this.tail = tail || CdlStroke.STROKE_TAIL_NORMAL;
	};

	// ----- getters -----

	Outline.prototype.isHeadCut = function() { return this.head === CdlStroke.STROKE_HEAD_CUT; };
	Outline.prototype.isTailCut = function() { return this.tail === CdlStroke.STROKE_TAIL_CUT; };
	Outline.prototype.isTailLong = function() { return this.tail === CdlStroke.STROKE_TAIL_LONG; };

	Outline.prototype.getFirstOutlinePoint = function() { return this.outlinePoints[0]; };
	Outline.prototype.getLastOutlinePoint = function() { return this.outlinePoints[this.outlinePoints.length - 1]; };

	// ----- mutators -----

	// accepts either:
	//  x, y, and flag args
	// or a Point and a flag arg
	// or a single OutlinePoint arg
	Outline.prototype.addPoint = function() {
	  if (arguments.length === 3) {
	    this.outlinePoints.push(new OutlinePoint(arguments[0], arguments[1], arguments[2]));
	  } else if (arguments.length === 2) {
	    this.outlinePoints.push(new OutlinePoint(arguments[0].x, arguments[0].y, arguments[1]));
	  } else {
	    this.outlinePoints.push(arguments[0]);
	  }
	};

	Outline.prototype.deleteLastPoint = function() {
	  this.outlinePoints.pop();
	};

	Outline.prototype.rotateAndTranslate = function(origin, dx, dy, hypotenuse) {
	  this.outlinePoints.forEach(function(point) {
	    var x = point.x;
	    var y = point.y;
	    point.x = origin.x + Utils.intCast((x * dx - y * dy) / hypotenuse);
	    point.y = origin.y + Utils.intCast((y * dx + x * dy) / hypotenuse);
	  });
	};

	module.exports = Outline;


/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);
	var Point = __webpack_require__(4);

	// TODO: add path and o types
	var strokeSegments = {
	  'h': ['h'],
	  't': ['L'],
	  's': ['s'],
	  'sg': ['s', 'L'],
	  'p': ['p'],
	  'wp': ['P'],
	  'sp': ['s', 'P'],
	  'd': ['d'],
	  'n': ['n'],
	  'dn': ['d', 'n'],
	  'pn': ['c', 'h'],
	  'tn': ['L', 'n'],
	  'tpn': ['L', 'c', 'h'],
	  'hz': ['h', 's'],
	  'hp': ['h', 'p'],
	  'hg': ['h', 'L'],
	  'sz': ['s', 'h'],
	  'sw': ['s', 'c', 'h'],
	  'st': ['s', 'L'],
	  'pz': ['p', 'L'],
	  'pd': ['p', 'd'],
	  'pg': ['p', 'L'],
	  'wg': ['d', 'P', 'L'],
	  'xg': ['N', 's'],
	  'hzz': ['h', 's', 'h'],
	  'hzw': ['h', 's', 'c', 'h'],
	  'hzt': ['h', 's', 'L'],
	  'hzg': ['h', 'p', 'L'],
	  'hxg': ['h', 'N', 'L'],
	  'szz': ['s', 'h', 's'],
	  'szp': ['L', 'h', 'L'],
	  'swg': ['s', 'c', 'h', 's'],
	  'hzzz': ['h', 's', 'h', 's'],
	  'hzzp': ['h', 'L', 'h', 'p'],
	  'hzwg': ['h', 'L', 'c', 'h', 's'],
	  'hpwg': ['h', 'p', 'd', 'P', 'L'],
	  'szzg': ['s', 'h', 'P', 'L'],
	  'hzzzg': ['h', 'L', 'h', 'P', 'L'],
	  'b': ['z'],
	  'c': ['c'],
	  'bd': ['B'],
	  'swz': ['s', 'L'],
	  'bxg': ['s', 'c', 'h', 's'],
	  'hxwg': ['h', 'L', 'c', 'h', 's']
	};

	var SZPAlternateSegs = ['L', 'h', 'p'];
	var HZWGAlternateSegs = ['h', 'L', 'B', 'c', 'h', 's'];

	var svgPlainX = function(val) {
	  return val / 64.0;
	};
	var svgPlainY = svgPlainX;

	var typeCInterpolateCurveXY = function(curvePoints, pointA, pointB) {
	  /* Support all four quadrants. Direction is counter-clockwise from (xa, ya) to (xb, yb).
	      Endpoints of segment determine quadrant.
	      If we do this right, U+3007 〇 should not be lopsided!
	      Watch out for rounding errors (no pun intended). */
	  if ((pointA.x < pointB.x && pointA.y < pointB.y) || (pointA.x > pointB.x && pointA.y > pointB.y)) {
	    // bottom-left or top-right quadrant
	    curvePoints[1] = new Point(pointA.x, (pointA.y + pointB.y) / 2);
	    curvePoints[2] = new Point((pointA.x + pointB.x) / 2, pointB.y);
	  } else { // bottom-right or top-left quadrant
	    curvePoints[1] = new Point((pointA.x + pointB.x) / 2, pointA.y);
	    curvePoints[2] = new Point(pointB.x, (pointA.y + pointB.y) / 2);
	  }
	  return curvePoints;
	};

	var interpolateCurveXY = function(pointA, pointB, segType) {
	  var curvePoints = [];
	  curvePoints[0] = pointA.clone();
	  curvePoints[3] = pointB.clone();
	  if (segType === 'c') {
	    return typeCInterpolateCurveXY(curvePoints, pointA, pointB);
	  }
	  var interpolations = {
	    d: [80, 36, 124, 80],
	    b: [46, 36, 4, 80],
	    p: [106, 60, 54, 106],
	    n: [22, 62, 72, 106],
	    P: [128, 76, 104, 98],
	    N: [0, 76, 24, 98]
	  };
	  var xy = interpolations[segType];
	  if (!xy) {
	    throw new Error('Invalid Segtype ' + segType);
	  }
	  if (pointA.x > pointB.x) { /* do this AFTER assigning curvex[0], etc. */
	    Point.swapXs(pointA, pointB);
	  }
	  if (pointA.y > pointB.y) {
	    Point.swapYs(pointA, pointB);
	  }
	  var wid = pointB.x - pointA.x;
	  var hi =  pointB.y - pointA.y;
	  curvePoints[1] = new Point(
	    pointA.x + Utils.xyScaleMulFloat(xy[0], wid),
	    pointA.y + Utils.xyScaleMulFloat(xy[1], hi)
	  );
	  curvePoints[2] = new Point(
	    pointA.x + Utils.xyScaleMulFloat(xy[2], wid),
	    pointA.y + Utils.xyScaleMulFloat(xy[3], hi)
	  );
	  return curvePoints;
	};

	// Adjust the array of stroke segments if appropriate for the given stroke type and coordinates.
	var adjustSegmentsForSomeStrokeTypes = function(strokeType, segments, points) {
	  var adjustedPoints = points.slice(0);
	  var adjustedSegments = segments.slice(0);
	  if (strokeType === 'd') {
	    if (points[1].x < points[0].x) {
	      /* Make left-falling dian (formerly called "d2") same as pie. */
	      adjustedSegments = strokeSegments.p;
	    }
	  } else if (strokeType === 'szp') {
	    /* Change last segment from "l" (line) to "p" if appropriate. */
	    if (points[3].x <= points[1].x) {
	      adjustedSegments = SZPAlternateSegs; // "Lhp";
	    }
	  } else if (strokeType === 'hzwg') {
	    /* Interpolate one point if appropriate. */
	    if (points[2].x !== points[1].x) {
	      // adjustedSegments = "hLBchs";
	      adjustedSegments = HZWGAlternateSegs;
	      var interPoint = new Point(
	        Utils.skPercent(points[1].x, 22) + Utils.skPercent(points[3].x, 78),
	        Utils.skPercent(points[1].y, 40) + Utils.skPercent(points[3].y, 60)
	      );
	      adjustedPoints.splice(2, 0, interPoint);
	    }
	  }
	  return { segments: adjustedSegments, points: adjustedPoints };
	};

	module.exports = {
	  getPathString: function(strokeType, points) {
	    var segments = strokeSegments[strokeType];
	    var adjustments = adjustSegmentsForSomeStrokeTypes(strokeType, segments, points);
	    var adjustedPoints = adjustments.points;
	    var adjustedSegments = adjustments.segments;

	    var pathString = Utils.getSvgPathStartString(
	      svgPlainX(adjustedPoints[0].x),
	      svgPlainY(adjustedPoints[0].y)
	    );

	    var pointsIndex = 0;
	    for (var i = 0; i < adjustedSegments.length; i++) {
	      var segment = adjustedSegments[i];
	      if (segment === 'h' || segment === 's' || segment === 'L') {
	        pathString += Utils.getSvgLineString(
	          svgPlainX(adjustedPoints[pointsIndex + 1].x),
	          svgPlainY(adjustedPoints[pointsIndex + 1].y)
	        );
	        pointsIndex += 1;
	      } else if (segment === 'z') { /* BEZIER */
	        pathString += Utils.getSvgCubicCurveString(
	          svgPlainX(adjustedPoints[pointsIndex + 1].x), svgPlainY(adjustedPoints[pointsIndex + 1].y),
	          svgPlainX(adjustedPoints[pointsIndex + 2].x), svgPlainY(adjustedPoints[pointsIndex + 2].y),
	          svgPlainX(adjustedPoints[pointsIndex + 3].x), svgPlainY(adjustedPoints[pointsIndex + 3].y)
	        );
	        pointsIndex += 3;
	      } else {
	        var curvePoints = interpolateCurveXY(adjustedPoints[pointsIndex], adjustedPoints[pointsIndex + 1], segment);
	        pathString += Utils.getSvgCubicCurveString(
	          svgPlainX(curvePoints[1].x), svgPlainY(curvePoints[1].y),
	          svgPlainX(curvePoints[2].x), svgPlainY(curvePoints[2].y),
	          svgPlainX(curvePoints[3].x), svgPlainY(curvePoints[3].y)
	        );
	        pointsIndex += 1;
	      }
	    }
	    return pathString;
	  }
	};



/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	var OutlinePoint = __webpack_require__(11);
	var Utils = __webpack_require__(5);

	module.exports = {
	  getPathString: function(outlinePoints, y, height) {
	    if (outlinePoints.length === 0) {
	      return null;
	    }
	    // endpoint same as starting point -- needed for 'pz' at least
	    var end = new OutlinePoint(outlinePoints[0].x, outlinePoints[0].y, OutlinePoint.ON_CURVE);
	    outlinePoints.push(end);

	    /* Divide by 64, to make up for FreeType conversion (which was << FT_SHIFT).
	        Flip the y value around the midpoint, since in SVG the y coordinate increases downward.
	        The midpoint is yMid = y + height / 2.
	        The transformation is yNew = 2 * yMid - yOld,
	            which is the same as yNew = flipHeight - yOld,
	            where flipHeight = 2 * yMid = y * 2 + height. */
	    var flipHeight = y * 2 + height;

	    var svgSongX = function(xVal) { return xVal / 64; };
	    var svgSongY = function(yVal) { return (flipHeight - yVal) / 64; };

	    var pathString = Utils.getSvgPathStartString(
	      svgSongX(outlinePoints[0].x),
	      svgSongY(outlinePoints[0].y)
	    );
	    for (var i = 1; i < outlinePoints.length;) {
	      if (outlinePoints[i].flag === OutlinePoint.ON_CURVE) {
	        pathString += Utils.getSvgLineString(
	          svgSongX(outlinePoints[i].x),
	          svgSongY(outlinePoints[i].y)
	        );
	        i += 1;
	      } else if (outlinePoints[i].flag === OutlinePoint.OFF_CURVE_QUADRATIC) {
	        pathString += Utils.getSvgQuadraticCurveString(
	          svgSongX(outlinePoints[i + 0].x), svgSongY(outlinePoints[i + 0].y),
	          svgSongX(outlinePoints[i + 1].x), svgSongY(outlinePoints[i + 1].y)
	        );
	        i += 2;
	      } else if (outlinePoints[i].flag === OutlinePoint.OFF_CURVE_CUBIC) {
	        pathString += Utils.getSvgCubicCurveString(
	          svgSongX(outlinePoints[i + 0].x), svgSongY(outlinePoints[i + 0].y),
	          svgSongX(outlinePoints[i + 1].x), svgSongY(outlinePoints[i + 1].y),
	          svgSongX(outlinePoints[i + 2].x), svgSongY(outlinePoints[i + 2].y)
	        );
	        i += 3;
	      } else {
	        break;
	      }
	    }
	    return pathString + '\tz';
	  }
	};


/***/ },
/* 55 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {/* There are 2 XML parser implementations: browser and node.js.
	When javascript is running in the browser it can use the browser's built-in XML parser,
	which is not available in node.js.
	See: http://stackoverflow.com/questions/7949752/cross-browser-javascript-xml-parsing
	*/
	var parseXml;
	if (global.window) {
	  if (typeof window.DOMParser !== 'undefined') {
	    parseXml = function(xmlStr) {
	      return ( new window.DOMParser() ).parseFromString(xmlStr, 'text/xml');
	    };
	  } else if (typeof window.ActiveXObject !== 'undefined' &&
	       new window.ActiveXObject('Microsoft.XMLDOM')) {
	    parseXml = function(xmlStr) {
	      var xmlDoc = new window.ActiveXObject('Microsoft.XMLDOM');
	      xmlDoc.async = 'false';
	      xmlDoc.loadXML(xmlStr);
	      return xmlDoc;
	    };
	  } else {
	    throw new Error('No XML parser found');
	  }
	} else {
	  parseXml = function() {
	    throw new Error('DOM XML parsing not available in Node');
	  };
	}

	/* --- getChildren:
	    Get the child nodes of the given xml node, excluding text and comment nodes.

	    ---param xmlNode.
	    ---return the array of children.

	    Can't just use xmlNode.children because IE :(
	*/
	var getChildren = function(xmlNode) {
	  var children = [];
	  for (var i = 0; i < xmlNode.childNodes.length; i++) {
	    var child = xmlNode.childNodes[i];
	    if (child.nodeName !== '#text' && child.nodeName !== '#comment') {
	      children.push(child);
	    }
	  }
	  return children;
	};

	/* --- recursiveTransform:
	    Turn the output from the native DOM api into the same format as xml2js.
	*/
	var recursiveTransform = function(parsedXmlNode) {
	  var transformedNode = {
	    '#name': parsedXmlNode.nodeName,
	    '$': {}
	  };
	  var attrs = parsedXmlNode.attributes;
	  for (var i = 0; i < attrs.length; i++) {
	    var attr = attrs[i];
	    transformedNode.$[attr.name] = attr.value;
	  }
	  var children = getChildren(parsedXmlNode);
	  if (children.length > 0) {
	    transformedNode.$$ = [];
	    for (i = 0; i < children.length; i++) {
	      transformedNode.$$.push(recursiveTransform(children[i]));
	    }
	  }
	  return transformedNode;
	};

	var DomXmlParser = {
	  parseString: function(xml, xmlParsingOpts, callback) {
	    try {
	      var parsedXml = parseXml(xml).documentElement;
	      callback(null, recursiveTransform(parsedXml));
	    } catch (e) {
	      callback(e);
	    }
	  }
	};

	module.exports = DomXmlParser;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(5);

	var xmlDbLoader = function(cdlDbXml) {
	  var parsedDb;

	  return function(unicode, variant, xmlParser) {
	    return Promise.resolve().then(function() {
	      if (!parsedDb) {
	        return Utils.parseXml(cdlDbXml, xmlParser).then(function(parsedXml) {
	          parsedDb = {};
	          parsedXml.$$.forEach(function(cdlDef) {
	            var uniAttr = cdlDef.$.uni;
	            var variantAttr = cdlDef.$.variant || 0;
	            parsedDb[uniAttr + ':' + variantAttr] = cdlDef;
	          });
	        });
	      }
	    }).then(function() {
	      return parsedDb[unicode + ':' + (variant || 0)];
	    });
	  };
	};

	module.exports = xmlDbLoader;


/***/ },
/* 57 */
/***/ function(module, exports) {

	var DEFAULT_API_URL = 'https://api.wenlincdl.com';

	var httpGet = function(url, apiKey) {
	  return new Promise(function(resolve, reject) {
	    var xhr = new XMLHttpRequest();
	    if (xhr.overrideMimeType) { // IE 9 and 10 don't seem to support this...
	      xhr.overrideMimeType('application/json');
	    }
	    xhr.open('GET', url, true);
	    xhr.setRequestHeader('x-api-key', apiKey);
	    xhr.onreadystatechange = function() {
	      // TODO: add error handling
	      if (xhr.readyState === 4 && xhr.status === 200) {
	        resolve(xhr.responseText);
	      }
	    };
	    xhr.send(null);
	  });
	};

	// options.apiKey: the user's API key
	// options.apiUrl: the base URL of the api. You probably don't need to change this.

	var apiDbLoader = function(options) {
	  var baseUrl = options.apiUrl || DEFAULT_API_URL;

	  return function(unicode, variant, xmlParser) {
	    var url = baseUrl + '/cdl/' + unicode + '.xml?variant=' + variant + '&recursive=true';
	    return httpGet(url, options.apiKey);
	  };
	};

	module.exports = apiDbLoader;


/***/ }
/******/ ]);