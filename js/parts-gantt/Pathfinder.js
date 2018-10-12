/**
 * (c) 2016 Highsoft AS
 * Authors: Øystein Moseng, Lars A. V. Cabrera
 *
 * License: www.highcharts.com/license
 */
'use strict';
import H from '../parts/Globals.js';
import '../parts/Point.js';
import '../parts/Utilities.js';
import pathfinderAlgorithms from 'PathfinderAlgorithms.js';
import 'ArrowSymbols.js';

var defined = H.defined,
    deg2rad = H.deg2rad,
    extend = H.extend,
    each = H.each,
    addEvent = H.addEvent,
    isNumber = H.isNumber,
    merge = H.merge,
    pick = H.pick,
    max = Math.max,
    min = Math.min;

/*
 TODO:
     - Test dynamics, hiding/adding/removing/updating chart/series/points/axes
     - Test connecting to multiple points
     - Add demos/samples
     - Document how to write your own algorithms
     - Consider adding a Point.pathTo method that wraps creating a connection
       and rendering it
*/


// Set default Pathfinder options
extend(H.defaultOptions, {
    /**
     * The Pathfinder module allows you to define connections between points,
     * represented as lines - optionally with markers for the start and end
     * points. Multiple algorithms are available for selecting how the
     * connecting lines are drawn.
     *
     * Pathfinder functionality requires Highcharts Gantt or the Pathfinder
     * module to be loaded.
     *
     * @optionparent pathfinder
     */
    pathfinder: {
        /**
         * Enable the pathfinder for this chart. Requires the pathfinder.js
         * module, or Highcharts Gantt.
         *
         * @type {boolean}
         * @default true
         * @since 7.0.0
         * @apioption pathfinder.enabled
         */

        /**
         * Set the default dash style for this chart's Pathfinder connecting
         * lines.
         *
         * @type {string}
         * @default solid
         * @since 7.0.0
         * @apioption pathfinder.dashStyle
         */

        /**
         * Set the default color for this chart's Pathfinder connecting lines.
         * Defaults to the color of the point being connected.
         *
         * @type {Color}
         * @default null
         * @since 7.0.0
         * @apioption pathfinder.lineColor
         */

        /**
         * Set the default pathfinder margin to use, in pixels. Some Pathfinder
         * algorithms attempt to avoid obstacles, such as other points in the
         * chart. These algorithms use this margin to determine how close lines
         * can be to an obstacle. The default is to compute this automatically
         * from the size of the obstacles in the chart.
         *
         * To draw connecting lines close to existing points, set this to a low
         * number. For more space around existing points, set this number
         * higher.
         *
         * @type {number}
         * @default null
         * @since 7.0.0
         * @apioption pathfinder.algorithmMargin
         */

        /**
         * Set the default pathfinder algorithm to use for this chart. It is
         * possible to define your own algorithms by adding them to the
         * Highcharts.Pathfinder.prototype.algorithms object after the chart
         * has been created.
         *
         * The default algorithms are as follows:
         *
         * straight:        Draws a straight line between the connecting points.
         *                  Does not avoid other points when drawing.
         *
         * simpleConnect:   Finds a path between the points using right angles
         *                  only. Takes only starting/ending points into
         *                  account, and will not avoid other points.
         *
         * fastAvoid:       Finds a path between the points using right angles
         *                  only. Will attempt to avoid other points, but its
         *                  focus is performance over accuracy. Works well with
         *                  less dense datasets.
         *
         * @type {string}
         * @default straight
         * @since 7.0.0
         * @apioption pathfinder.type
         */
        type: 'straight',

        /**
         * Set the default pixel width for this chart's Pathfinder connecting
         * lines.
         *
         * @type {number}
         * @default 1
         * @since 7.0.0
         * @apioption pathfinder.lineWidth
         */
        lineWidth: 1,

        /**
         * Marker options for this chart's Pathfinder connectors.
         *
         * @type {object}
         * @since 7.0.0
         * @apioption pathfinder.marker
         */
        marker: {
            /**
             * Set the radius of the pathfinder markers. The default is
             * automatically computed based on the algorithmMargin setting.
             *
             * Setting marker.width and marker.height will override this
             * setting.
             *
             * @type {number}
             * @default null
             * @since 7.0.0
             * @apioption pathfinder.marker.radius
             */

            /**
             * Set the width of the pathfinder markers. If not supplied, this
             * is inferred from the marker radius.
             *
             * @type {number}
             * @default null
             * @since 7.0.0
             * @apioption pathfinder.marker.width
             */

            /**
             * Set the height of the pathfinder markers. If not supplied, this
             * is inferred from the marker radius.
             *
             * @type {number}
             * @default null
             * @since 7.0.0
             * @apioption pathfinder.marker.height
             */

            /**
             * Set the color of the pathfinder markers. By default this is the
             * same as the connector color.
             *
             * @type {Color}
             * @default null
             * @since 7.0.0
             * @apioption pathfinder.marker.color
             */

            /**
             * Set the line/border color of the pathfinder markers. By default
             * this is the same as the marker color.
             *
             * @type {Color}
             * @default null
             * @since 7.0.0
             * @apioption pathfinder.marker.lineColor
             */

            /**
             * Enable markers for the connectors.
             */
            enabled: false,

            /**
             * Horizontal alignment of the markers relative to the points.
             */
            align: 'center',

            /**
             * Vertical alignment of the markers relative to the points.
             */
            verticalAlign: 'middle',

            /**
             * Whether or not to draw the markers inside the points.
             */
            inside: false,

            /**
             * Set the line/border width of the pathfinder markers.
             */
            lineWidth: 1
        },

        /**
         * Marker options specific to the start markers for this chart's
         * Pathfinder connectors. Overrides the generic marker options.
         *
         * @type {object}
         * @since 7.0.0
         * @extends pathfinder.marker
         * @apioption pathfinder.startMarker
         */
        startMarker: {
            /**
             * Set the symbol of the pathfinder start markers.
             */
            symbol: 'diamond'
        },

        /**
         * Marker options specific to the end markers for this chart's
         * Pathfinder connectors. Overrides the generic marker options.
         *
         * @type {object}
         * @since 7.0.0
         * @extends pathfinder.marker
         * @apioption pathfinder.endMarker
         */
        endMarker: {
            /**
             * Set the symbol of the pathfinder end markers.
             */
            symbol: 'arrow-filled'
        }
    }
});

/**
 * Override Pathfinder options for a series. Requires Highcharts Gantt or the
 * Pathfinder module.
 *
 * @since 7.0.0
 * @extends pathfinder
 * @apioption plotOptions.series.pathfinder
 * @excluding enabled,algorithmMargin
 */

/**
 * Connect to a point. Requires the Pathfinder module or Highcharts Gantt to be
 * loaded. This option can be either a string, referring to the ID of another
 * point, or an object.
 *
 * @type {string|object}
 * @since 7.0.0
 * @extends plotOptions.series.pathfinder
 * @apioption series.line.data.connect
 */

/**
 * The ID of the point to connect to.
 *
 * @type {string}
 * @since 7.0.0
 * @apioption series.line.data.connect.to
 */


/**
 * Get point bounding box using plotX/plotY and shapeArgs. If using
 * graphic.getBBox() directly, the bbox will be affected by animation.
 *
 * @param   {Highcharts.Point} point
 *          The point to get BB of.
 *
 * @return  {object}
 *          Result xMax, xMin, yMax, yMin.
 */
function getPointBB(point) {
    var shapeArgs = point.shapeArgs,
        bb;

    // Prefer using shapeArgs (columns)
    if (shapeArgs) {
        return {
            xMin: shapeArgs.x,
            xMax: shapeArgs.x + shapeArgs.width,
            yMin: shapeArgs.y,
            yMax: shapeArgs.y + shapeArgs.height
        };
    }

    // Otherwise use plotX/plotY and bb
    bb = point.graphic && point.graphic.getBBox();
    return bb ? {
        xMin: point.plotX - bb.width / 2,
        xMax: point.plotX + bb.width / 2,
        yMin: point.plotY - bb.height / 2,
        yMax: point.plotY + bb.height / 2
    } : null;
}


/**
 * Calculate margin to place around obstacles for the pathfinder in pixels.
 * Returns a minimum of 1 pixel margin.
 *
 * @param   {Array} obstacles
 *          Obstacles to calculate margin from.
 *
 * @return  {number}
 *          The calculated margin in pixels. At least 1.
 */
function calculateObstacleMargin(obstacles) {
    var len = obstacles.length,
        i = 0,
        j,
        obstacleDistance,
        distances = [],
        // Compute smallest distance between two rectangles
        distance = function (a, b, bbMargin) {
            // Count the distance even if we are slightly off
            var margin = pick(bbMargin, 10),
                yOverlap = a.yMax + margin > b.yMin - margin &&
                            a.yMin - margin < b.yMax + margin,
                xOverlap = a.xMax + margin > b.xMin - margin &&
                            a.xMin - margin < b.xMax + margin,
                xDistance = yOverlap ? (
                    a.xMin > b.xMax ? a.xMin - b.xMax : b.xMin - a.xMax
                ) : Infinity,
                yDistance = xOverlap ? (
                    a.yMin > b.yMax ? a.yMin - b.yMax : b.yMin - a.yMax
                ) : Infinity;

            // If the rectangles collide, try recomputing with smaller margin.
            // If they collide anyway, discard the obstacle.
            if (xOverlap && yOverlap) {
                return (
                    margin ?
                    distance(a, b, Math.floor(margin / 2)) :
                    Infinity
                );
            }

            return min(xDistance, yDistance);
        };

    // Go over all obstacles and compare them to the others.
    for (; i < len; ++i) {
        // Compare to all obstacles ahead. We will already have compared this
        // obstacle to the ones before.
        for (j = i + 1; j < len; ++j) {
            obstacleDistance = distance(obstacles[i], obstacles[j]);
            // TODO: Magic number 80
            if (obstacleDistance < 80) { // Ignore large distances
                distances.push(obstacleDistance);
            }
        }
    }
    // Ensure we always have at least one value, even in very spaceous charts
    distances.push(80);

    return max(
        Math.floor(
            distances.sort(function (a, b) {
                return a - b;
            })[
                // Discard first 10% of the relevant distances, and then grab
                // the smallest one.
                Math.floor(distances.length / 10)
            ] / 2 - 1 // Divide the distance by 2 and subtract 1.
        ),
        1 // 1 is the minimum margin
    );
}


/**
 * Find the coordinates a path starts on.
 *
 * @param   {Array} path
 *          SVG path in array form.
 *
 * @return  {object}
 *          Object with x/y coordinates.
 */
function getStartCoords(path) {
    return path.length > 3 && path[0] === 'M' || path[0] === 'm' ?
        { x: path[1], y: path[2] } :
        { x: 0, y: 0 };
}


/**
 * Find the coordinates a path ends on.
 *
 * @param   {Array} path
 *          SVG path in array form.
 *
 * @return  {object}
 *          Object with x/y coordinates.
 */
function getEndCoords(path) {
    var lastOperator,
        segment = [],
        i = path.length,
        xAcc = 0,
        yAcc = 0,
        x,
        y;

    // Go over all the path elements and parse them
    while (i--) {
        if (isNumber(path[i])) {
            // Just a number, so store it for later
            segment.push(path[i]);
        } else {
            // We have an operator
            lastOperator = path[i];

            // If we end up at a Z, just return the start position
            if (lastOperator === 'z' || lastOperator === 'Z') {
                return getStartCoords(path);
            }

            // Test upper vs lowercase operator. Lowercase is relative.
            if (lastOperator === lastOperator.toUpperCase() && segment.length) {
                // Solid point for at least one dimension
                if (lastOperator === 'V' && y === undefined) {
                    y = segment[0] + yAcc;
                } else if (lastOperator === 'H' && x === undefined) {
                    x = segment[0] + xAcc;
                } else {
                    // We have a solid point for both dimensions
                    if (x === undefined) {
                        x = segment[1] + xAcc;
                    }
                    if (y === undefined) {
                        y = segment[0] + yAcc;
                    }
                    break;
                }
            } else if (segment.length) {
                // Add to accumulator for at least one dimension
                if (lastOperator === 'v') {
                    yAcc += segment[0];
                } else if (lastOperator === 'h') {
                    xAcc += segment[0];
                } else {
                    // Update both dimensions
                    yAcc += segment[0];
                    xAcc += segment[1];
                }
            }
            segment = [];
        }
    }

    return { x: x, y: y };
}


/**
 * Find a starting point for a path for animation purposes. Returns a path with
 * the same number and type of segments as the original, but with all segments
 * going from and to the starting point of the original path.
 *
 * @param   {Array} path
 *          SVG path in array form.
 *
 * @param   {object} animation
 *          Animation options for the path, which determines how to start the
 *              path.
 *
 * @return  {Array}
 *          The calculated starting path.
 */
function getStartingPath(path, animation) {
    var newPath = [],
        reversed = animation && animation.reversed,
        operatorMap = {
            M: ['x', 'y'],
            H: ['x'],
            V: ['y'],
            L: ['x', 'y'],
            Z: [],
            C: ['x', 'y', 'x', 'y', 'x', 'y'],
            Q: ['x', 'y', 'x', 'y'],
            S: ['x', 'y', 'x', 'y'],
            T: ['x', 'y'],
            A: [0, 0, 0, 0, 0, 'x', 'y']
        },
        pos = {},
        lowerCasePos = {
            x: 0,
            y: 0
        },
        firstOperator = path && path[0],
        len = path.length,
        positionMap;

    if (len < 3) {
        return path;
    }

    // Find the position we operate with
    if (!firstOperator) {
        return path;
    }
    pos = reversed ? getEndCoords(path) : getStartCoords(path);

    // Loop over the path and find the new one
    for (
        var i = 0, curOperator, curOperatorIndex, placeholder;
        i < len;
        ++i
    ) {
        if (!isNumber(path[i])) {
            // We have new operator, reset, and handle lower/upper case
            newPath.push(path[i]);
            positionMap = !operatorMap[path[i]] ? lowerCasePos : pos;
            curOperator = path[i].toUpperCase();
            curOperatorIndex = 0;
        } else {
            // We have a value. Find placeholder from operatorMap
            placeholder = operatorMap[curOperator][curOperatorIndex];
            newPath.push(
                isNumber(placeholder) ? placeholder : positionMap[placeholder]
            );
            curOperatorIndex++;
        }
    }

    return newPath;
}


/**
 * The Connection class. Used internally to represent a connection between two
 * points.
 *
 * @private
 * @class Connection
 *
 * @param   {Highcharts.Point} from
 *          Connection runs from this Point.
 *
 * @param   {Highcharts.Point} to
 *          Connection runs to this Point.
 *
 * @param   {object} [options]
 *          Connection options.
 */
function Connection(from, to, options) {
    this.init(from, to, options);
}
Connection.prototype = {

    /**
     * Initialize the Connection object. Used as constructor only.
     *
     * @function Highcharts.Connection#init
     *
     * @param   {Highcharts.Point} from
     *          Connection runs from this Point.
     *
     * @param   {Highcharts.Point} to
     *          Connection runs to this Point.
     *
     * @param   {object} [options]
     *          Connection options.
     *
     * @return  {void}
     */
    init: function (from, to, options) {
        this.fromPoint = from;
        this.toPoint = to;
        this.options = options;
        this.chart = from.series.chart;
        this.pathfinder = this.chart.pathfinder;
    },

    /**
     * Add (or update) this connection's path on chart. Stores reference to the
     * created element on this.graphics.path.
     *
     * @function Highcharts.Connection#renderPath
     *
     * @param   {Array} path
     *          Path to render, in array format. E.g. ['M', 0, 0, 'L', 10, 10]
     *
     * @param   {object} [attribs]
     *          SVG attributes for the path.
     *
     * @param   {object} [animation]
     *          Animation options for the rendering.
     *
     * @param   {Function} [complete]
     *          Callback function when the path has been rendered and animation
     *          is complete.
     *
     * @return  {void}
     */
    renderPath: function (path, attribs, animation, complete) {
        var connection = this,
            chart = this.chart,
            pathfinder = chart.pathfinder,
            animate = !chart.options.chart.forExport && animation !== false,
            pathGraphic = connection.graphics && connection.graphics.path,
            pathStartingPoint = getStartingPath(path, animation);

        // Add the SVG element of the pathfinder group if it doesn't exist
        if (!pathfinder.group) {
            pathfinder.group = chart.renderer.g()
                .addClass('highcharts-pathfinder-group')
                .attr({ zIndex: -1 })
                .add(chart.seriesGroup);
        }

        // Shift the group to compensate for plot area.
        // Note: Do this always (even when redrawing a path) to avoid issues
        // when updating chart in a way that changes plot metrics.
        pathfinder.group.translate(chart.plotLeft, chart.plotTop);

        // Create path if does not exist
        if (!(pathGraphic && pathGraphic.renderer)) {
            pathGraphic = chart.renderer.path(pathStartingPoint, animation)
                /*= if (build.classic) { =*/
                .attr({
                    opacity: 0
                })
                /*= } =*/
                .add(pathfinder.group);
        }

        // Set path attribs and animate to the new path
        pathGraphic.attr(attribs);
        pathGraphic[animate ? 'animate' : 'attr']({
            /*= if (build.classic) { =*/
            opacity: 1,
            /*= } =*/
            d: path
        }, animate ? animation : null, complete);

        // Store reference on connection
        this.graphics = this.graphics || {};
        this.graphics.path = pathGraphic;
    },

    /**
     * Calculate and add marker graphics for connection to the chart. The
     * created/updated elements are stored on this.graphics.start and
     * this.graphics.end.
     *
     * @function Highcharts.Connection#addMarker
     *
     * @param   {string} type
     *          Marker type, either 'start' or 'end'.
     *
     * @param   {object} options
     *          All options for this marker. Not calculated or merged with other
     *          options.
     *
     * @param   {Array} path
     *          Connection path in array format. This is used to calculate the
     *          rotation angle of the markers.
     *
     * @return  {void}
     */
    addMarker: function (type, options, path) {
        var connection = this,
            chart = connection.fromPoint.series.chart,
            pathfinder = chart.pathfinder,
            renderer = chart.renderer,
            point = (
                type === 'start' ?
                connection.fromPoint :
                connection.toPoint
            ),
            anchor = point.getPathfinderAnchorPoint(options),
            markerVector,
            radians,
            rotation,
            box,
            width,
            height,
            pathVector;


        if (!options.enabled) {
            return;
        }

        // Last vector before start/end of path, used to get angle
        if (type === 'start') {
            pathVector = {
                x: path[4],
                y: path[5]
            };
        } else { // 'end'
            pathVector = {
                x: path[path.length - 5],
                y: path[path.length - 4]
            };
        }

        // Get angle between pathVector and anchor point and use it to create
        // marker position.
        radians = point.getRadiansToVector(pathVector, anchor);
        markerVector = point.getMarkerVector(
            radians,
            options.radius,
            anchor
        );

        // Rotation of marker is calculated from angle between pathVector and
        // markerVector.
        // (Note:
        //  Used to recalculate radians between markerVector and pathVector,
        //  but this should be the same as between pathVector and anchor.)
        rotation = -radians / deg2rad;

        if (options.width && options.height) {
            width = options.width;
            height = options.height;
        } else {
            width = height = options.radius * 2;
        }

        // Add graphics object if it does not exist
        connection.graphics = connection.graphics || {};
        box = {
            x: markerVector.x - (width / 2),
            y: markerVector.y - (height / 2),
            width: width,
            height: height,
            rotation: rotation,
            rotationOriginX: markerVector.x,
            rotationOriginY: markerVector.y
        };

        if (!connection.graphics[type]) {

            // Create new marker element
            connection.graphics[type] = renderer.symbol(
                    options.symbol
                )
                .addClass(
                    'highcharts-point-connecting-path-' + type + '-marker'
                )
                .attr(box)

                /*= if (build.classic) { =*/
                .attr({
                    fill: options.color || connection.fromPoint.color,
                    stroke: options.lineColor,
                    'stroke-width': options.lineWidth
                })
                /*= } =*/
                .add(pathfinder.group);
        } else {
            connection.graphics[type].animate(box);
        }
    },

    /**
     * Calculate and return connection path.
     * Note: Recalculates chart obstacles on demand if they aren't calculated.
     *
     * @function Highcharts.Connection#getPath
     *
     * @param   {object} options
     *          Pathfinder options. Not calculated or merged with other options.
     *
     * @return  {Array}
     *          Calculated SVG path data in array format.
     */
    getPath: function (options) {
        var pathfinder = this.pathfinder,
            chart = this.chart,
            algorithm = pathfinder.algorithms[options.type],
            chartObstacles = pathfinder.chartObstacles;

        if (typeof algorithm !== 'function') {
            H.error(
                '"' + options.type + '" is not a Pathfinder algorithm.'
            );
            return;
        }

        // This function calculates obstacles on demand if they don't exist
        if (algorithm.requiresObstacles && !chartObstacles) {
            chartObstacles =
                pathfinder.chartObstacles =
                pathfinder.getChartObstacles(options);

            // If the algorithmMargin was computed, store the result in default
            // options.
            chart.options.pathfinder.algorithmMargin = options.algorithmMargin;

            // Cache some metrics too
            pathfinder.chartObstacleMetrics =
                pathfinder.getObstacleMetrics(chartObstacles);
        }

        // Get the SVG path
        return algorithm(
            // From
            this.fromPoint.getPathfinderAnchorPoint(options.startMarker),
            // To
            this.toPoint.getPathfinderAnchorPoint(options.endMarker),
            merge({
                chartObstacles: chartObstacles,
                lineObstacles: pathfinder.lineObstacles || [],
                obstacleMetrics: pathfinder.chartObstacleMetrics,
                hardBounds: {
                    xMin: 0,
                    xMax: chart.plotWidth,
                    yMin: 0,
                    yMax: chart.plotHeight
                },
                obstacleOptions: {
                    margin: options.algorithmMargin
                },
                startDirectionX: pathfinder.getAlgorithmStartDirection(
                                options.startMarker
                            )
            }, options)
        );
    },

    /**
     * (re)Calculate and (re)draw the connection.
     *
     * @function Highcharts.Connection#render
     */
    render: function () {
        var connection = this,
            fromPoint = connection.fromPoint,
            series = fromPoint.series,
            chart = series.chart,
            pathfinder = chart.pathfinder,
            pathResult,
            path,
            options = merge(
                chart.options.pathfinder, series.options.pathfinder,
                fromPoint.options.pathfinder, connection.options
            ),
            attribs = {};

        // Set path attribs
        /*= if (build.classic) { =*/
        attribs.stroke = options.lineColor || fromPoint.color;
        attribs['stroke-width'] = options.lineWidth;
        if (options.dashStyle) {
            attribs.dashstyle = options.dashStyle;
        }
        /*= } =*/

        attribs.class = 'highcharts-point-connecting-path ' +
            'highcharts-color-' + fromPoint.colorIndex;
        options = merge(attribs, options);

        // Set common marker options
        if (!defined(options.marker.radius)) {
            options.marker.radius = min(max(
                Math.ceil((options.algorithmMargin || 8) / 2) - 1, 1
            ), 5);
        }
        // Get the path
        pathResult = connection.getPath(options);
        path = pathResult.path;

        // Always update obstacle storage with obstacles from this path.
        // We don't know if future calls will need this for their algorithm.
        if (pathResult.obstacles) {
            pathfinder.lineObstacles = pathfinder.lineObstacles || [];
            pathfinder.lineObstacles =
                pathfinder.lineObstacles.concat(pathResult.obstacles);
        }

        // Add the calculated path to the pathfinder group
        connection.renderPath(path, attribs, options.animation, function () {
            // Render the markers on complete
            connection.addMarker(
                'start',
                merge(options.marker, options.startMarker),
                path
            );
            connection.addMarker(
                'end',
                merge(options.marker, options.endMarker),
                path
            );
        });
    },

    /**
     * Destroy connection by destroying the added graphics elements.
     *
     * @function Highcharts.Connection#destroy
     */
    destroy: function () {
        if (this.graphics) {
            H.objectEach(this.graphics, function (val) {
                val.destroy();
            });
            delete this.graphics;
        }
    }
};


/**
 * The Pathfinder class.
 *
 * @private
 * @class Pathfinder
 *
 * @param   {Highcharts.Chart} chart
 *          The chart to operate on.
 */
function Pathfinder(chart) {
    this.init(chart);
}
Pathfinder.prototype = {

    algorithms: pathfinderAlgorithms,

    /**
     * Initialize the Pathfinder object.
     *
     * @function Highcharts.Pathfinder#init
     *
     * @param   {Highcharts.Chart} chart
     *          The chart context.
     *
     * @return  {void}
     */
    init: function (chart) {
        // Initialize pathfinder with chart context
        this.chart = chart;

        // Init connection reference list
        this.connections = [];

        // Recalculate paths/obstacles on chart redraw
        addEvent(chart, 'redraw', function () {
            this.pathfinder.update();
        });
    },

    /**
     * Update Pathfinder connections from scratch.
     *
     * @function Highcharts.Pathfinder#update
     */
    update: function () {
        var chart = this.chart,
            pathfinder = this,
            oldConnections = pathfinder.connections;

        // Rebuild pathfinder connections from options
        pathfinder.connections = [];
        each(chart.series, function (series) {
            if (series.visible) {
                each(series.points, function (point) {
                    var to,
                        connects = (
                            point.options &&
                            point.options.connect &&
                            H.splat(point.options.connect)
                        );
                    if (point.visible && point.isInside !== false && connects) {
                        each(connects, function (connect) {
                            to = chart.get(typeof connect === 'string' ?
                                connect : connect.to
                            );
                            if (
                                to instanceof H.Point &&
                                to.series.visible &&
                                to.visible &&
                                to.isInside !== false
                            ) {
                                // Add new connection
                                pathfinder.connections.push(new Connection(
                                    point, // from
                                    to,
                                    typeof connect === 'string' ? {} : connect
                                ));
                            }
                        });
                    }
                });
            }
        });

        // Clear connections that should not be updated, and move old info over
        // to new connections.
        for (
            var j = 0, k, found, lenOld = oldConnections.length,
                lenNew = pathfinder.connections.length;
            j < lenOld;
            ++j
        ) {
            found = false;
            for (k = 0; k < lenNew; ++k) {
                if (
                    oldConnections[j].fromPoint ===
                        pathfinder.connections[k].fromPoint &&
                    oldConnections[j].toPoint ===
                        pathfinder.connections[k].toPoint
                ) {
                    pathfinder.connections[k].graphics =
                        oldConnections[j].graphics;
                    found = true;
                    break;
                }
            }
            if (!found) {
                oldConnections[j].destroy();
            }
        }

        // Clear obstacles to force recalculation. This must be done on every
        // redraw in case positions have changed. Recalculation is handled in
        // Connection.getPath on demand.
        delete this.chartObstacles;
        delete this.lineObstacles;

        // Draw the pending connections
        pathfinder.renderConnections();
    },

    /**
     * Draw the chart's connecting paths.
     *
     * @function Highcharts.Pathfinder#renderConnections
     */
    renderConnections: function () {
        // Go through connections and render them. If they have not been
        // rendered before, add them to a queue rendering after animate.
        each(this.connections, function (connection) {
            var series = connection.fromPoint.series;
            if (connection.graphics || series.options.animation === false) {
                connection.render();
            } else {
                (
                    series.pathfinderConnectionsToRender =
                        series.pathfinderConnectionsToRender || []
                ).push(connection);
            }
        });
        each(this.chart.series, function (series) {
            var render = function () {
                each(series.pathfinderConnectionsToRender,
                    function (connection) {
                        connection.render();
                    }
                );
                if (series.pathfinderRemoveRenderEvent) {
                    series.pathfinderRemoveRenderEvent();
                }
                delete series.pathfinderConnectionsToRender;
                delete series.pathfinderRemoveRenderEvent;
            };
            if (series.pathfinderConnectionsToRender) {
                series.pathfinderRemoveRenderEvent = addEvent(
                    series,
                    'afterAnimate',
                    render
                );
            }
        });
    },

    /**
     * Get obstacles for the points in the chart. Does not include connecting
     * lines from Pathfinder. Applies algorithmMargin to the obstacles.
     *
     * @function Highcharts.Pathfinder#getChartObstacles
     *
     * @param   {object} options
     *          Options for the calculation. Currenlty only
     *          options.algorithmMargin.
     *
     * @return  {Array}
     *          An array of calculated obstacles. Each obstacle is defined as
     *          an object with xMin, xMax, yMin and yMax properties.
     */
    getChartObstacles: function (options) {
        var obstacles = [],
            series = this.chart.series,
            margin = pick(options.algorithmMargin, 0),
            calculatedMargin;
        for (var i = 0, sLen = series.length; i < sLen; ++i) {
            if (series[i].visible) {
                for (
                    var j = 0, pLen = series[i].points.length, bb, point;
                    j < pLen;
                    ++j
                ) {
                    point = series[i].points[j];
                    if (point.visible) {
                        bb = getPointBB(point);
                        if (bb) {
                            obstacles.push({
                                xMin: bb.xMin - margin,
                                xMax: bb.xMax + margin,
                                yMin: bb.yMin - margin,
                                yMax: bb.yMax + margin
                            });
                        }
                    }
                }
            }
        }

        // Sort obstacles by xMin for optimization
        obstacles = obstacles.sort(function (a, b) {
            return a.xMin - b.xMin;
        });

        // Add auto-calculated margin if the option is not defined
        if (!defined(options.algorithmMargin)) {
            calculatedMargin =
                options.algorithmMargin =
                calculateObstacleMargin(obstacles);
            each(obstacles, function (obstacle) {
                obstacle.xMin -= calculatedMargin;
                obstacle.xMax += calculatedMargin;
                obstacle.yMin -= calculatedMargin;
                obstacle.yMax += calculatedMargin;
            });
        }

        return obstacles;
    },

    /**
     * Utility function to get metrics for obstacles:
     *  - Widest obstacle width
     *  - Tallest obstacle height
     *
     * @function Highcharts.Pathfinder#getObstacleMetrics
     *
     * @param   {Array} obstacles
     *          An array of obstacles to inspect.
     *
     * @return  {object}
     *          The calculated metrics, as an object with maxHeight and maxWidth
     *          properties.
     */
    getObstacleMetrics: function (obstacles) {
        var maxWidth = 0,
            maxHeight = 0,
            width,
            height,
            i = obstacles.length;

        while (i--) {
            width = obstacles[i].xMax - obstacles[i].xMin;
            height = obstacles[i].yMax - obstacles[i].yMin;
            if (maxWidth < width) {
                maxWidth = width;
            }
            if (maxHeight < height) {
                maxHeight = height;
            }
        }

        return {
            maxHeight: maxHeight,
            maxWidth: maxWidth
        };
    },

    /**
     * Utility to get which direction to start the pathfinding algorithm
     * (X vs Y), calculated from a set of marker options.
     *
     * @function Highcharts.Pathfinder#getAlgorithmStartDirection
     *
     * @param   {object} markerOptions
     *          Marker options to calculate from.
     *
     * @return  {boolean}
     *          Returns true for X, false for Y, and undefined for
     *          autocalculate.
     */
    getAlgorithmStartDirection: function (markerOptions) {
        var xCenter = markerOptions.align !== 'left' &&
                        markerOptions.align !== 'right',
            yCenter = markerOptions.verticalAlign !== 'top' &&
                        markerOptions.verticalAlign !== 'bottom',
            undef;

        return xCenter ?
            (yCenter ? undef : false) : // x is centered
            (yCenter ? true : undef);   // x is off-center
    }
};

// Add to Highcharts namespace
H.Connection = Connection;
H.Pathfinder = Pathfinder;


// Add pathfinding capabilities to Points
extend(H.Point.prototype, /** @lends Point.prototype */ {

    /**
     * Get coordinates of anchor point for pathfinder connection.
     *
     * @private
     * @function Highcharts.Point#getPathfinderAnchorPoint
     *
     * @param   {object} markerOptions
     *          Connection options for position on point.
     *
     * @return  {object}
     *          An object with x/y properties for the position. Coordinates are
     *          in plot values, not relative to point.
     */
    getPathfinderAnchorPoint: function (markerOptions) {
        var bb = getPointBB(this),
            x,
            y;

        switch (markerOptions.align) { // eslint-disable-line default-case
            case 'right':
                x = 'xMax';
                break;
            case 'left':
                x = 'xMin';
        }

        switch (markerOptions.verticalAlign) { // eslint-disable-line default-case
            case 'top':
                y = 'yMin';
                break;
            case 'bottom':
                y = 'yMax';
        }

        return {
            x: x ? bb[x] : (bb.xMin + bb.xMax) / 2,
            y: y ? bb[y] : (bb.yMin + bb.yMax) / 2
        };
    },

    /**
     * Utility to get the angle from one point to another.
     *
     * @private
     * @function Highcharts.Point#getRadiansToVector
     *
     * @param   {object} v1
     *          The first vector, as an object with x/y properties.
     *
     * @param   {object} v2
     *          The second vector, as an object with x/y properties.
     *
     * @return  {number}
     *          The angle in degrees
     */
    getRadiansToVector: function (v1, v2) {
        var box;
        if (!defined(v2)) {
            box = getPointBB(this);
            v2 = {
                x: (box.xMin + box.xMax) / 2,
                y: (box.yMin + box.yMax) / 2
            };
        }
        return Math.atan2(v2.y - v1.y, v1.x - v2.x);
    },

    /**
     * Utility to get the position of the marker, based on the path angle and
     * the marker's radius.
     *
     * @private
     * @function Highcharts.Point#getMarkerVector
     *
     * @param   {number} radians
     *          The angle in radians from the point center to another vector.
     *
     * @param   {number} markerRadius
     *          The radius of the marker, to calculate the additional distance
     *          to the center of the marker.
     *
     * @param   {object} anchor
     *          The anchor point of the path and marker as an object with x/y
     *          properties.
     *
     * @return  {object}
     *          The marker vector as an object with x/y properties.
     */
    getMarkerVector: function (radians, markerRadius, anchor) {
        var twoPI = Math.PI * 2.0,
            theta = radians,
            bb = getPointBB(this),
            rectWidth = bb.xMax - bb.xMin,
            rectHeight = bb.yMax - bb.yMin,
            rAtan = Math.atan2(rectHeight, rectWidth),
            tanTheta = 1,
            leftOrRightRegion = false,
            rectHalfWidth = rectWidth / 2.0,
            rectHalfHeight = rectHeight / 2.0,
            rectHorizontalCenter = bb.xMin + rectHalfWidth,
            rectVerticalCenter = bb.yMin + rectHalfHeight,
            edgePoint = {
                x: rectHorizontalCenter,
                y: rectVerticalCenter
            },
            markerPoint = {},
            xFactor = 1,
            yFactor = 1;

        while (theta < -Math.PI) {
            theta += twoPI;
        }

        while (theta > Math.PI) {
            theta -= twoPI;
        }

        tanTheta = Math.tan(theta);

        if ((theta > -rAtan) && (theta <= rAtan)) {
            // Right side
            yFactor = -1;
            leftOrRightRegion = true;
        } else if (theta > rAtan && theta <= (Math.PI - rAtan)) {
            // Top side
            yFactor = -1;
        } else if (theta > (Math.PI - rAtan) || theta <= -(Math.PI - rAtan)) {
            // Left side
            xFactor = -1;
            leftOrRightRegion = true;
        } else {
            // Bottom side
            xFactor = -1;
        }

        // Correct the edgePoint according to the placement of the marker
        if (leftOrRightRegion) {
            edgePoint.x += xFactor * (rectHalfWidth);
            edgePoint.y += yFactor * (rectHalfWidth) * tanTheta;
        } else {
            edgePoint.x += xFactor * (rectHeight / (2.0 * tanTheta));
            edgePoint.y += yFactor * (rectHalfHeight);
        }

        if (anchor.x !== rectHorizontalCenter) {
            edgePoint.x = anchor.x;
        }
        if (anchor.y !== rectVerticalCenter) {
            edgePoint.y = anchor.y;
        }

        markerPoint.x = edgePoint.x + (markerRadius * Math.cos(theta));
        markerPoint.y = edgePoint.y - (markerRadius * Math.sin(theta));

        return markerPoint;
    }
});

// Initialize Pathfinder for charts
H.Chart.prototype.callbacks.push(function (chart) {
    var options = chart.options;
    if (options.pathfinder.enabled !== false) {
        this.pathfinder = new Pathfinder(this);
        this.pathfinder.update(); // First draw
    }
});
