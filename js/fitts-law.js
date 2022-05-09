'use strict';

import { EVENT_TYPES, FITTS_CONSTANT } from './constants.js';
import { constantsKey, getGlobalState, getState } from './utils.js';

/**
 * Create dimensions from the given values and store them for later use.
 * All values should be positive and make sense.
 * @param {number} width The outer width of the area.
 * @param {number} height The outer height of the area.
 * @param {number} top Margin form the top edge.
 * @param {number} right Margin form the right edge.
 * @param {number} bottom Margin form the bottom edge.
 * @param {number} left Margin form the left edge.
 */
function makeDimension(width, height, top, right, bottom, left) {
    return {
        width: width,
        height: height,
        innerWidth: width - (left + right),
        innerHeight: height - (top + bottom),
        top: top,
        right: right,
        bottom: bottom,
        left: left,
        cx: (width - (left + right)) / 2 + left,
        cy: (height - (top + bottom)) / 2 + top
    };
}

// set up dimensions for the plotting.
let testDimension = makeDimension(620, 400, 30, 30, 30, 30);
let plotPositionDimension = makeDimension(220, 200, 30, 30, 30, 30);
let plotVelocitiesDimension = plotPositionDimension;
let plotHitsDimension = plotPositionDimension;
let plotScatterDimension = makeDimension(220, 200, 30, 30, 30, 50);
let scatterEffectiveDimension = makeDimension(540, 300, 30, 30, 30, 50);
let positionEffectiveDimension = makeDimension(540, 200, 30, 30, 30, 40);
let speedEffectiveDimension = positionEffectiveDimension;
let histDimension = makeDimension(540, 300, 30, 30, 30, 50);

let LIVE_STAY = 1000;
let MAX_TIME = 2000;
let UPDATE_DELAY = MAX_TIME;
let MAX_SPEED = 6; // pixel/ms
let AArray = [];
let BArray = [];
function rHit(r, rTarget) {
    return (plotHitsDimension.innerWidth / 2 / rTarget) * r;
}

function v(v) {
    let colour = 'rgb(' + clampInt(0, 255, (v / MAX_SPEED) * 255) + ', 0, 0)';
    return colour;
}

let scatterX = d3.scale
    .linear()
    .domain([0.5, 5.5])
    .range([0, plotScatterDimension.innerWidth]);

let scatterY = d3.scale
    .linear()
    .domain([MAX_TIME, 0])
    .range([0, plotScatterDimension.innerHeight]);

let scaleT = d3.scale
    .linear()
    .domain([0, 1000])
    .range([0, plotVelocitiesDimension.innerWidth]);

let scaleV = d3.scale
    .linear()
    .domain([0, MAX_SPEED])
    .range([plotVelocitiesDimension.innerHeight, 0]);

let scaleX = d3.scale
    .linear()
    .domain([-20, 300])
    .range([0, plotPositionDimension.innerWidth]);

let scaleY = d3.scale
    .linear()
    .domain([-50, 50])
    .range([plotPositionDimension.innerHeight, 0]);

let effScatterX = d3.scale
    .linear()
    .domain([0.5, 6.5])
    .range([0, scatterEffectiveDimension.innerWidth]);

let effScatterY = d3.scale
    .linear()
    .domain([MAX_TIME, 0])
    .range([0, scatterEffectiveDimension.innerHeight]);

let effPositionX = d3.scale
    .linear()
    .domain([-60, 400])
    .range([0, positionEffectiveDimension.innerWidth]);

let effPositionY = d3.scale
    .linear()
    .domain([-50, 50])
    .range([positionEffectiveDimension.innerHeight, 0]);

let effSpeedX = d3.scale
    .linear()
    .domain([0, MAX_TIME])
    .range([0, speedEffectiveDimension.innerWidth]);

let effSpeedY = d3.scale
    .linear()
    .domain([0, MAX_SPEED])
    .range([speedEffectiveDimension.innerHeight, 0]);

const aValueNode = document.querySelector('.new-values .header-value.a-value .header-value__val');
const bValueNode = document.querySelector('.new-values .header-value.b-value .header-value__val');

const aCurrentValueNode = document.querySelector('.current-values .header-value.a-value .header-value__val');
const bCurrentValueNode = document.querySelector('.current-values .header-value.b-value .header-value__val');
const saveButton = document.querySelector('.save-values');
const aNewState = document.querySelector('#a-new');
const bNewState = document.querySelector('#b-new');

function calculateConstant(stateManager) {
    const values = stateManager.value
        .split(',')
        .map(value => parseFloat(value))
        .filter(value => !!value);
    if (!values.length) {
        return 0;
    }
    return parseFloat((values.reduce((a, b) => a + b) / values.length).toFixed(2));
}

function generateNewStateListener(stateNode, textNode) {
    return () => {
        const calculatedConstant = calculateConstant(stateNode);
        if (!calculatedConstant) {
            return;
        }
        setNodeHTML(textNode, calculatedConstant);
    };
}

function generateCurrentStateListener(stateNode, textNode) {
    return () => {
        setNodeHTML(textNode, stateNode.value);
    };
}

aNewState.addEventListener('change', generateNewStateListener(aNewState, aValueNode));
bNewState.addEventListener('change', generateNewStateListener(bNewState, bValueNode));


getGlobalState({
    callback: data => {
        const { a, b } = data[constantsKey()] || { a: FITTS_CONSTANT.A, b: FITTS_CONSTANT.B };
        setNodeHTML(aCurrentValueNode, a);
        setNodeHTML(bCurrentValueNode, b);
    }
});
chrome.storage.local.onChanged.addListener(changed => {
    const constantsKeyVal = constantsKey();
    const {
        newValue: { a, b }
    } = changed[constantsKeyVal];

    setNodeHTML(aCurrentValueNode, a);
    setNodeHTML(bCurrentValueNode, b);

    setTimeout(() => {
        alert('A and B values updated.');
    }, 0);
});

saveButton.addEventListener('click', () => {
    const a = calculateConstant(aNewState);
    const b = calculateConstant(bNewState);
    if (!a && !b) {
        alert('No values to save');
    }
    chrome.runtime.sendMessage({
        eventType: EVENT_TYPES.SAVE_CONSTANTS,
        a, b
    });
});

function setNodeHTML(node, value) {
    if ((typeof value == 'number' && value.toString().includes('.')) || (parseFloat(value) && value.includes('.'))) {
        value = parseFloat(value).toFixed(2);
    }
    node.innerHTML = value;
}

function setValue(arr, node) {
    node.value = arr;
    node.dispatchEvent(new Event('change'));
}

function updateValues(a, b) {
    if (isNaN(a) || isNaN(b)) {
        window.alert('There was some error updating values. Make sure you are clicking the dots enough times');
        return;
    }
    AArray.push(a);
    BArray.push(b);
    setValue(AArray, aNewState);
    setValue(BArray, bNewState);
    // setNodeValue(aValueNode, AArray);
    // setNodeValue(bValueNode, BArray);
}

let fittsTest = {
    target: { x: 0, y: 0, r: 10 },
    start: { x: 0, y: 0, t: 0 },
    last: {},

    isoPositions: [],
    currentPosition: 0,
    currentCount: 0,
    miss: 0,
    isoLimits: { minD: 120, maxD: 300, minW: 10, maxW: 100 },
    isoParams: { num: 9, distance: 200, width: 50, randomize: true },

    currentPath: [],
    active: false,

    data: [],
    currentDataSet: 0,
    dataCnt: 0,

    colour: d3.scale.category10(),

    sumID: 0,
    sumTime: 0,

    updateTimeoutHandle: undefined,

    generateTarget: function() {
        this.target = this.isoPositions[this.currentPosition];
        this.target.distance = this.isoParams.distance;
        this.currentPosition =
            (this.currentPosition + Math.ceil(this.isoPositions.length / 2)) % this.isoPositions.length;

        let target = testAreaSVG.selectAll('#target').data([this.target]);

        let insert = function(d) {
            d.attr('cx', function(d) {
                return d.x;
            })
                .attr('cy', function(d) {
                    return d.y;
                })
                .attr('r', function(d) {
                    return d.w / 2;
                });
        };

        target
            .enter()
            .append('circle')
            .attr('id', 'target')
            .style('fill', 'red')
            .call(insert);

        target.transition().call(insert);

        this.active = true;
    },

    updateISOCircles: function() {
        this.currentCount = 0;

        this.generateISOPositions(this.isoParams.num, this.isoParams.distance, this.isoParams.width);

        let circles = testAreaSVG.selectAll('circle').data(this.isoPositions);

        let insert = function(d) {
            d.attr('cx', function(d) {
                return d.x;
            })
                .attr('cy', function(d) {
                    return d.y;
                })
                .attr('r', function(d) {
                    return d.w / 2;
                });
        };

        circles
            .enter()
            .append('circle')
            .attr('class', 'iso')
            .call(insert);

        circles.transition().call(insert);

        circles
            .exit()
            .transition()
            .attr('r', 0)
            .remove();

        this.currentPosition = 0;
        this.generateTarget();
        this.active = false;
    },

    generateISOPositions: function(num, d, w) {
        // remove all data from live view
// plotHitsGroup
// .selectAll('circle.hit')
// .transition()
// .duration(LIVE_STAY)
// .ease('linear')
// .attr('r', 2)
// .style('opacity', 0)
// .remove();

// plotPositionGroup
// .selectAll('line.live')
// .transition()
// .duration(LIVE_STAY)
// .style('stroke-opacity', 0)
// .remove();

// plotVelocitiesGroup
// .selectAll('line.live')
// .transition()
// .duration(LIVE_STAY)
// .style('stroke-opacity', 0)
// .remove();

        this.isoPositions = [];

        for (let i = 0; i < num; i++) {
            this.isoPositions[i] = {
                x: testDimension.cx + (d / 2) * Math.cos((2 * Math.PI * i) / num),
                y: testDimension.cy + (d / 2) * Math.sin((2 * Math.PI * i) / num),
                w: w
            };
        }
    },

    removeTarget: function() {
        testAreaSVG
            .selectAll('#target')
            .data([])
            .exit()
            .remove();

        this.active = false;
        this.currentPath = [];
    },

    mouseClicked: function(x, y) {
        if (distance({ x: x, y: y }, this.target) < this.target.w / 2) {
            this.addDataPoint({
                start: this.start,
                target: this.target,
                path: this.currentPath,
                hit: { x: x, y: y, t: new Date().getTime() }
            });
            this.removeTarget();

            if (this.isoParams.randomize && this.currentCount >= this.isoPositions.length) {
                this.randomizeParams();
                this.currentCount = 0;
                this.currentPosition = 0;
                this.miss = 0;
                this.updateISOCircles;
                this.generateTarget();
                this.active = false;
            } else {
                this.currentCount++;
                this.generateTarget();
            }

            this.last = { x: x, y: y, t: new Date().getTime() };
            this.start = this.last;
            this.currentPath.push(this.last);
        } else {
            this.miss++;
        }
    },

    mouseMoved: function(x, y) {
        if (this.active) {
            // skip if the mouse did actually not move
            // that should practically never happen...
            if (x == this.last.x && y == this.last.y) {
                return;
            }

            // set timeout for updating plots
            if (this.updateTimeoutHandle) {
                window.clearTimeout(this.updateTimeoutHandle);
            }
            this.updateTimeoutHandle = window.setTimeout(this.updatePlots, UPDATE_DELAY, this);

            let newPoint = { x: x, y: y, t: new Date().getTime() };
            this.currentPath.push(newPoint);

            let dt = newPoint.t - this.last.t;
            let dist = distance(this.last, { x: x, y: y });
            if (dt > 0) let speed = dist / dt;
            else let speed = 0;

            testAreaSVG
                .append('line')
                // .attr('class', '')
                .attr('x1', this.last.x)
                .attr('x2', newPoint.x)
                .attr('y1', this.last.y)
                .attr('y2', newPoint.y)
                .style('stroke', v(speed))
                .transition()
                .duration(5000)
                .style('stroke-opacity', 0)
                .remove();

            this.last = newPoint;
        }
    },

    addDataPoint: function(data) {
        // add point to data array for plotting into ID/time scatter plot
        if (this.active == false) return;

        let dt = data.hit.t - data.start.t;

        if (dt < MAX_TIME) {
            // skip if obvious outlier
            let dist = distance(data.target, data.start);
            let id = shannon(dist, data.target.w);

            this.data[this.currentDataSet].data.push({
                time: dt,
                distance: data.target.distance,
                width: data.target.w,
                hit: data.hit,
                start: data.start,
                target: data.target,
                path: data.path
            });

// scatterGroup
// .append('circle')
// .attr('class', 'cat' + this.currentDataSet)
// .style('fill', this.data[this.currentDataSet].colour)
// .attr('cx', scatterX(id))
// .attr('cy', scatterY(dt))
// .attr('r', 0)
// .transition()
// .duration(200)
// .ease('bounce')
// .attr('r', 3);

            let A = data.start;
            let B = data.target;
            let path = data.path;

            let hit = {};
            let q = project(A, B, data.hit);
            hit.x = distance(q, B) * sign(q.t - 1);
            hit.y = distance(q, data.hit) * isLeft(A, B, data.hit);

// plotHitsGroup
// .append('circle')
// .attr('class', 'hit')
// .attr('cx', rHit(hit.x, data.target.w / 2))
// .attr('cy', rHit(hit.y, data.target.w / 2))
// .attr('r', 6)
// .style('fill', 'red')
// .style('opacity', 1)
// .transition()
// .duration(500)
// .ease('linear')
// .attr('r', 3);

            let last = { x: 0, y: 0, t: data.start.t, v: 0 };
            for (let i = 0; i < path.length; i++) {
                let p = path[i];

                let q = project(A, B, p);
                let x = distance(q, A) * sign(q.t);
                let y = distance(q, p) * isLeft(A, B, p);

                let dt = p.t - last.t;
                let dist = distance(last, { x: x, y: y });
                if (dt > 0) let speed = dist / dt;
                else let speed = 0;

// plotPositionGroup
// .append('svg:line')
// .attr('class', 'live')
// .attr('x1', scaleX(last.x))
// .attr('x2', scaleX(x))
// .attr('y1', scaleY(last.y))
// .attr('y2', scaleY(y))
// .style('stroke', v(speed))
// .transition()
// .duration(LIVE_STAY)
// .style('stroke-opacity', 0.5);

// plotVelocitiesGroup
// .append('svg:line')
// .attr('class', 'live')
// .attr('x1', scaleT(last.t - data.start.t))
// .attr('x2', scaleT(p.t - data.start.t))
// .attr('y1', scaleV(last.v))
// .attr('y2', scaleV(speed))

// .style('stroke', v(speed))
// .transition()
// .duration(LIVE_STAY)
// .style('stroke-opacity', 0.5);

                let last = {};
                last.x = x;
                last.y = y;
                last.t = p.t;
                last.v = speed;
            }
        }
    },

    randomizeParams: function() {
        this.isoParams.distance = Math.floor(randomAB(this.isoLimits.minD, this.isoLimits.maxD));
        this.isoParams.width = Math.floor(randomAB(this.isoLimits.minW, this.isoLimits.maxW));

        $('#sliderDistance').slider('value', this.isoParams.distance);
        $('#sliderWidth').slider('value', this.isoParams.width);

        this.updateISOCircles();
        d3.select('#sliderDistanceValue').text(this.isoParams.distance);
        d3.select('#sliderWidthValue').text(this.isoParams.width);
    },

    addDataSet: function() {
        // first update the plots
        this.updatePlots(this);

        this.dataCnt++;
        let num = this.dataCnt;
        let colour = this.colour(randomAB(0, 10));

        this.data[num] = { data: [], colour: colour };

        this.currentDataSet = num;
// let div = d3
// .select('#dataSets')
// .append('div')
// .attr('id', 'dataSet' + num)
// .text('Data Set ' + num + ' ')
// .style('background-color', colour);

        let buttonID = 'removeDataSet' + num;
// div.append('button')
// .attr('id', buttonID)
// .attr('type', 'button')
// .text('delete!');

        let that = this;

        $('#' + buttonID).click(function() {
            that.deleteDataSet(num);
            fittsTest.active = false;
        });

        $('#dataSet' + num).click(function() {
            if (assIsKey(num, that.data)) {
                that.currentDataSet = num;
                that.highlightDataSet(num);
            }
            fittsTest.active = false;
        });

        this.highlightDataSet(num);
        // add colour
    },

    deleteDataSet: function(num) {
        if (assSize(this.data) == 1) {
            alert('Cannot delete data set! Create another data set first.');
        } else {
            d3.select('#dataSet' + num).remove();
            delete this.data[num];

            scatterGroup
                .selectAll('.cat' + num)
                .transition()
                .duration(500)
                .attr('r', 0)
                .remove();

            scatterEffectiveGroup
                .selectAll('.cat' + num)
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();

            throughputGroup
                .selectAll('rect.cat' + num)
                .transition()
                .duration(500)
                .attr('width', 0)
                .remove();

            positionEffectiveGroup
                .selectAll('line.cat' + num)
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();

            speedEffectiveGroup
                .selectAll('line.cat' + num)
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();

            if (num == this.currentDataSet) {
                let first = parseInt(assFirstKey(this.data));
                this.currentDataSet = first;
                this.highlightDataSet(first);
            }

            this.updatePlots(this);
        }
    },

    highlightDataSet: function(num) {
        d3.selectAll('#dataSets div').attr('class', '');
        d3.select('#dataSet' + num).attr('class', 'active');
    },

    updatePlots: function(that) {
        // a little I candy :D
        d3.select('body')
            .append('div')
            .attr('class', 'msg')
            .text('updating plots...')
            .style('opacity', 1)
            .transition()
            .duration(2000)
            .style('opacity', 0)
            .remove();

        /* we haven't moven inside the test area, so we can as well disable
         * the test for now
         */
        that.active = false;

        // for each data set
        // compute We and IDe and Throughput for each category

        // process data
        let dataSetIndex = -1; // evil hack to make it start at 0 then.
        for (let key in that.data) {
            // for each data set

            dataSetIndex++;

            let groups = [];
            for (let i = 0; i < that.data[key].data.length; i++) {
                // for each datum
                let datum = that.data[key].data[i];
                let groupID = datum.distance.toString() + datum.width.toString();
                if (!groups[groupID]) {
                    groups[groupID] = [];
                }

                let q = project(datum.start, datum.target, datum.hit);
                // let x = distance(q, datum.start) * sign(q.t);
                let y = distance(q, datum.hit) * isLeft(datum.start, datum.target, datum.hit);

                datum.realDistance = distance(datum.start, datum.hit); // use real distance here.
                datum.projectedHitOffsetX = distance(q, datum.target) * sign(q.t - 1);
                datum.projectedHitOffsetY = y;

                groups[groupID].push(datum);
            }

            let newData = [];
            for (let group in groups) {
                if (groups[group].length < 3) {
                    // exlcude groups with length < 3
                    continue;
                }

                let xEffective =
                    4.133 *
                    Math.sqrt(
                        variance(groups[group], function(d) {
                            return d.projectedHitOffsetX;
                        })
                    );
                let yEffective =
                    4.133 *
                    Math.sqrt(
                        variance(groups[group], function(d) {
                            return d.projectedHitOffsetY;
                        })
                    );
                let dEffective = mean(groups[group], function(d) {
                    return d.realDistance;
                });

                for (let i = 0; i < groups[group].length; i++) {
                    let datum = groups[group][i];
                    let We = Math.min(xEffective, yEffective); // SMALLER-OF model (MacKenzie, Buxton 92)
                    let De = dEffective;
                    datum.IDe = shannon(De, We);
                    datum.throughput = 1000 * (datum.IDe / datum.time);
                    newData.push(datum);
                }
            }

            // insert stuff in SVG
            let colour = that.data[key].colour;

            let insert = function(d) {
                d.attr('cx', function(d) {
                    return effScatterX(d.IDe);
                })
                    .attr('cy', function(d) {
                        return effScatterY(d.time);
                    })
                    .attr('r', 5);
            };

            let circles = scatterEffectiveGroup.selectAll('circle.cat' + key).data(newData);

            circles
                .enter()
                .append('circle')
                .attr('class', 'cat' + key)
                .style('fill', colour)
                .style('opacity', 0.5)
                .call(insert);

            circles
                .transition()
                .duration(500)
                .call(insert);

            // ==================== regression ========================
            let covTIDe = cov(
                newData,
                function(d) {
                    return d.time;
                },
                function(d) {
                    return d.IDe;
                }
            );

            let varIDe = variance(newData, function(d) {
                return d.IDe;
            });

            if (varIDe > 0) let b = covTIDe / varIDe;
            else let b = 0;

            let mT = mean(newData, function(d) {
                return d.time;
            });
            let mIDe = mean(newData, function(d) {
                return d.IDe;
            });
            let a = mT - b * mIDe;

            updateValues(a, b);

            if (!isNaN(a)) {
                let makeLine = function(d) {
                    return d
                        .attr('x1', 0)
                        .attr('x2', scatterEffectiveDimension.innerWidth)
                        .attr('y1', function(d) {
                            return effScatterY(d.y1);
                        })
                        .attr('y2', function(d) {
                            return effScatterY(d.y2);
                        });
                };

                let regression = scatterEffectiveGroup
                    .selectAll('line.cat' + key)
                    .data([{ y1: a + b * 0.5, y2: a + b * 6.5 }]);

                regression
                    .enter()
                    .append('line')
                    .attr('class', 'cat' + key)
                    .style('stroke', colour)
                    .style('stroke-width', 2)
                    .call(makeLine);

                regression.transition().call(makeLine);
            }

            // ============== histogram ====================
            let histThroughput = d3.layout
                .histogram()
                .bins(20)
                .range([0, 10])
                .value(function(d) {
                    return d.throughput;
                });

            let throughputHistogramData = histThroughput(newData);

            //		histYMax = d3.max(throughputHistogramData, function(d) { return d.y; });

            let histX = d3.scale
                .ordinal()
                .domain(
                    throughputHistogramData.map(function(d) {
                        return d.x;
                    })
                )
                .rangeRoundBands([0, histDimension.innerWidth]);

            let histY = d3.scale
                .linear()
                .domain([
                    0,
                    d3.max(throughputHistogramData, function(d) {
                        return d.y;
                    })
                ])
                .range([histDimension.innerHeight, 0]);

// let throughputRect = throughputGroup.selectAll('rect.cat' + key).data(throughputHistogramData);

            let numDataSets = assSize(that.data);
            let xOffset = (histX.rangeBand() / numDataSets) * dataSetIndex;

            let makeRect = function(d) {
                d.attr(
                    'x',
                    (function(offset) {
                        return function(d) {
                            return histX(d.x) + offset;
                        };
                    })(xOffset)
                )
                    .attr(
                        'y',
                        (function(scale) {
                            return function(d) {
                                return scale(d.y);
                            };
                        })(histY)
                    )
                    .attr('width', histX.rangeBand() / numDataSets - 1)
                    .attr(
                        'height',
                        (function(scale) {
                            return function(d) {
                                return scale(0) - scale(d.y);
                            };
                        })(histY)
                    );
            };

            let histXAxis = d3.svg
                .axis()
                .scale(histX)
                .ticks(2);

            let histYAxis = d3.svg
                .axis()
                .scale(histY)
                .ticks(5);
// throughputGroup.selectAll('g.axis').remove();

// throughputGroup
// .append('g')
// .attr('class', 'axis')
// .attr('transform', 'translate(0,' + histDimension.innerHeight + ')')
// .call(histXAxis.tickSize(6, 3, 6).orient('bottom'));

            // throughputGroup.append("g")
            // .attr("class", "axis")
            // .call(histYAxis.tickSize(-histDimension.innerWidth).orient("left"));

// throughputRect
// .enter()
// .append('rect')
// .attr('class', 'cat' + key)
// .attr('rx', 2)
// .attr('ry', 2)
// .style('fill', colour)
// .call(makeRect);

// throughputRect
// .transition()
// .duration(500)
// .call(makeRect);

            // ==================== eff position and speed ===================
            // more or less copy-pasted from above
            for (let i = 0; i < newData.length; i++) {
                let last = { x: 0, y: 0, t: newData[i].start.t, v: 0 };
                let A = newData[i].start;
                let B = newData[i].target;
                let dAB = distance(A, B);
                let offset = newData[i].distance - dAB;
                offset = 0;

                for (let j = 0; j < newData[i].path.length; j++) {
                    let p = newData[i].path[j];

                    let q = project(A, B, p);
                    let x = distance(q, A) * sign(q.t);
                    let y = distance(q, p) * isLeft(A, B, p);

                    let dt = p.t - last.t;
                    let dist = distance(last, { x: x, y: y });
                    if (dt > 0) let speed = dist / dt;
                    else let speed = 0;

// positionEffectiveGroup
// .append('line')
// .attr('class', 'cat' + key)
// .attr('x1', effPositionX(last.x + offset))
// .attr('x2', effPositionX(x + offset))
// .attr('y1', effPositionY(last.y))
// .attr('y2', effPositionY(y))
// .style('stroke', colour)
// .style('opacity', 0.5);

// speedEffectiveGroup
// .append('line')
// .attr('class', 'cat' + key)
// .attr('x1', effSpeedX(last.t - A.t))
// .attr('x2', effSpeedX(p.t - A.t))
// .attr('y1', effSpeedY(last.v))
// .attr('y2', effSpeedY(speed))
// .style('stroke', colour)
// .style('opacity', 0.5);

                    let last = {};
                    last.x = x;
                    last.y = y;
                    last.t = p.t;
                    last.v = speed;
                }
            }
        }
    }
};

// _empirical_ covariance
function cov(data, extractorA, extractorB) {
    if (data.length <= 1) {
        // no covariance for 0 or 1 element.
        return 0;
    }

    let mA = mean(data, extractorA);
    let mB = mean(data, extractorB);

    let cov = 0;
    for (let i = 0; i < data.length; i++) {
        cov += (extractorA(data[i]) - mA) * (extractorB(data[i]) - mB);
    }

    return cov / (data.length - 1);
}

function variance(data, extractor) {
    return cov(data, extractor, extractor);
}

function mean(data, extractor) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += extractor(data[i]);
    }
    return sum / data.length;
}

function randomAB(a, b) {
    return a + Math.random() * (b - a);
}

function assSize(assArr) {
    let size = 0;
    for (let _ in assArr) {
        size++;
    }
    return size;
}

function assFirstKey(assArr) {
    for (let key in assArr) {
        return key;
        break;
    }
}

function assIsKey(needle, assArr) {
    for (let key in assArr) {
        if (needle == key) {
            return true;
        }
    }
    return false;
}

/**
 * Project a point q onto the line p0-p1
 * Code taken from: http://www.alecjacobson.com/weblog/?p=1486
 */
function project(A, B, p) {
    let AB = minus(B, A);
    let AB_squared = dot(AB, AB);
    if (AB_squared == 0) {
        return A;
    } else {
        let Ap = minus(p, A);
        let t = dot(Ap, AB) / AB_squared;
        return { x: A.x + t * AB.x, y: A.y + t * AB.y, t: t };
    }
}

function mouseMoved() {
let m = d3.svg.mouse(this);
    fittsTest.mouseMoved(m[0], m[1]);
}

function mouseClicked() {
    let m = d3.svg.mouse(this);
    fittsTest.mouseClicked(m[0], m[1]);
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

// coutesy of http://stackoverflow.com/questions/3461453/determine-which-side-of-a-line-a-point-lies
function isLeft(A, B, p) {
    return (B.x - A.x) * (p.y - A.y) - (B.y - A.y) * (p.x - A.x) >= 0 ? 1 : -1;
}

function minus(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}

function distance(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

function sign(a) {
    return a >= 0 ? 1 : -1;
}

function rgb2Hex(r, g, b) {
    return '#' + clampInt(0, 255, r).toString(16) + clampInt(0, 255, g).toString(16) + clampInt(0, 255, b).toString(16);
}

function clampInt(lower, upper, x) {
    return Math.min(upper, Math.max(lower, Math.floor(x)));
}

function shannon(A, W) {
    return Math.log(A / W + 1) / Math.log(2);
}

function bgRect(d, dim) {
    return d
        .append('rect')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('width', dim.width)
        .attr('height', dim.height)
        .attr('class', 'back');
}

let testAreaSVG = d3
    .select('#test-area')
    .append('svg')
    .attr('width', testDimension.width)
    .attr('height', testDimension.height)
    .style('pointer-events', 'all')
    .on('mousemove', mouseMoved)
    .on('mousedown', mouseClicked)
    .call(bgRect, testDimension);

// let plotPositionSVG = d3
// .select('#plot-positions')
// .append('svg')
// .attr('width', plotPositionDimension.width)
// .attr('height', plotPositionDimension.height)
// .call(bgRect, plotPositionDimension);

// let plotPositionGroup = plotPositionSVG
// .append('g')
// .attr('transform', 'translate(' + plotPositionDimension.left + ', ' + plotPositionDimension.top + ')');

let positionXAxis = d3.svg
    .axis()
    .scale(scaleX)
    .ticks(7);
let positionYAxis = d3.svg
    .axis()
    .scale(scaleY)
    .ticks(6);

// plotPositionGroup
// .append('g')
// .attr('class', 'axis')
// .call(positionXAxis.tickSize(plotPositionDimension.innerHeight).orient('bottom'));
// plotPositionGroup
// .append('g')
// .attr('class', 'axis')
// .call(positionYAxis.tickSize(-plotPositionDimension.innerWidth).orient('left'));

// let plotHitsSVG = d3
// .select('#plot-hits')
// .append('svg')
// .attr('width', plotHitsDimension.width)
// .attr('height', plotHitsDimension.height)
// .call(bgRect, plotHitsDimension);

// let plotHitsGroup = plotHitsSVG
// .append('g')
// .attr('transform', 'translate(' + plotHitsDimension.cx + ', ' + plotHitsDimension.cy + ')');
// plotHitsGroup
// .append('circle')
// .attr('cx', 0)
// .attr('cy', 0)
// .attr('r', plotHitsDimension.innerWidth / 2)
// .style('opacity', 0.1);
// plotHitsGroup
// .append('line')
// .attr('x1', 0)
// .attr('y1', 0)
// .attr('x2', -plotHitsDimension.cx)
// .attr('y2', 0);
// plotHitsGroup
// .append('line')
// .attr('x1', 0)
// .attr('y1', 0)
// .attr('x2', -10)
// .attr('y2', -10);
// plotHitsGroup
// .append('line')
// .attr('x1', 0)
// .attr('y1', 0)
// .attr('x2', -10)
// .attr('y2', 10);

// let plotVelocitiesSVG = d3
// .select('#plot-velocities')
// .append('svg')
// .attr('width', plotVelocitiesDimension.width)
// .attr('height', plotVelocitiesDimension.height)
// .call(bgRect, plotVelocitiesDimension);

// let plotVelocitiesGroup = plotVelocitiesSVG
// .append('g')
// .attr('transform', 'translate(' + plotVelocitiesDimension.left + ', ' + plotVelocitiesDimension.top + ')');

let speedXAxis = d3.svg
    .axis()
    .scale(scaleT)
    .ticks(7);
let speedYAxis = d3.svg
    .axis()
    .scale(scaleV)
    .ticks(6);

// plotVelocitiesGroup
// .append('g')
// .attr('class', 'axis')
// .call(speedXAxis.tickSize(plotVelocitiesDimension.innerHeight).orient('bottom'));
// .append('text')
// 	.text('time in ms')
// 	.attr('x', 80)
// 	.attr('y', plotVelocitiesDimension.innerHeight + 25)
// 	.style('text-anchor', 'middle');

// plotVelocitiesGroup
// .append('g')
// .attr('class', 'axis')
// .call(speedYAxis.tickSize(-plotVelocitiesDimension.innerWidth).orient('left'));
// .append('text')
// 	.text('pixel/ms')
// 	.attr('x', -20)
// 	.attr('y', 80)
// 	.attr('transform', 'rotate(-90, -20, 80)')
// 	.style('text-anchor', 'middle');

// let scatterSVG = d3
// .select('#plot-scatter')
// .append('svg')
// .attr('width', plotScatterDimension.width)
// .attr('height', plotScatterDimension.height)
// .call(bgRect, plotScatterDimension);

// let scatterGroup = scatterSVG
// .append('g')
// .attr('transform', 'translate(' + plotScatterDimension.left + ',' + plotScatterDimension.top + ' )');

// define Axes.
let xAxis = d3.svg
    .axis()
    .scale(scatterX)
    .ticks(7)
    .tickSize(6, 3, 0);
let yAxis = d3.svg
    .axis()
    .scale(scatterY)
    .ticks(6)
    .tickSize(6, 3, 6);

// print axes
// scatterGroup
// .append('g')
// .attr('class', 'axis')
// .call(xAxis.tickSize(plotScatterDimension.innerHeight).orient('bottom'));
// .append('text')
// 	.text('ID')
// 	.attr('x', 80)
// 	.attr('y', plotScatterDimension.innerHeight + 25)
// 	.style('text-anchor', 'middle');
// scatterGroup
// .append('g')
// .attr('class', 'axis')
// .call(yAxis.tickSize(-plotScatterDimension.innerWidth).orient('left'));
// .append('text')
// 	.text('time in ms')
// 	.attr('x', -20)
// 	.attr('y', 65)
// 	.attr('transform', 'rotate(-90, -20, 80)')
// 	.style('text-anchor', 'middle');

let scatterEffectiveSVG = d3
    .select('#scatterEffective')
    .append('svg')
    .attr('width', scatterEffectiveDimension.width)
    .attr('height', scatterEffectiveDimension.height)
    .call(bgRect, scatterEffectiveDimension);

let scatterEffectiveGroup = scatterEffectiveSVG
    .append('g')
    .attr('transform', 'translate(' + scatterEffectiveDimension.left + ',' + scatterEffectiveDimension.top + ' )');

// define Axes.
let effXAxis = d3.svg
    .axis()
    .scale(effScatterX)
    .ticks(10)
    .tickSize(6, 3, 0);

let effYAxis = d3.svg
    .axis()
    .scale(effScatterY)
    .ticks(10)
    .tickSize(6, 3, 6);

// print axes
scatterEffectiveGroup
    .append('g')
    .attr('class', 'axis')
    // .attr("transform", "translate( 0, " + plotScatterDimension.height + ")")
    .call(effXAxis.tickSize(scatterEffectiveDimension.innerHeight).orient('bottom'));

scatterEffectiveGroup
    .append('g')
    .attr('class', 'axis')
    // .attr("transform", "translate( 0, " + plotScatterDimension.height + ")")
    .call(effYAxis.tickSize(-scatterEffectiveDimension.innerWidth).orient('left'));

// let throughputSVG = d3
// .select('#throughput')
// .append('svg')
// .attr('width', histDimension.width)
// .attr('height', histDimension.height)
// .call(bgRect, histDimension);

// let throughputGroup = throughputSVG
// .append('g')
// .attr('transform', 'translate(' + histDimension.left + ',' + histDimension.top + ' )');

//	.call(histYAxis.tickSize(histDimension.innerWidth).orient("left"));

// let positionEffectiveSVG = d3
// .select('#positionEffective')
// .append('svg')
// .attr('width', positionEffectiveDimension.width)
// .attr('height', positionEffectiveDimension.height)
// .call(bgRect, positionEffectiveDimension);

// let positionTargetsGroup = positionEffectiveSVG
// .append('g')
// .attr('transform', 'translate(' + positionEffectiveDimension.left + ',' + positionEffectiveDimension.top + ' )');

// let positionEffectiveGroup = positionEffectiveSVG
// .append('g')
// .attr('transform', 'translate(' + positionEffectiveDimension.left + ',' + positionEffectiveDimension.top + ' )');

let positionEffXAxis = d3.svg
    .axis()
    .scale(effPositionX)
    .ticks(10)
    .tickSize(-positionEffectiveDimension.innerHeight);

let positionEffYAxis = d3.svg
    .axis()
    .scale(effPositionY)
    .ticks(5)
    .tickSize(-positionEffectiveDimension.innerWidth);

// positionEffectiveGroup
// .append('g')
// .attr('class', 'axis')
// .attr('transform', 'translate(0, ' + positionEffectiveDimension.innerHeight + ')')
// .call(positionEffXAxis.orient('bottom'));

// positionEffectiveGroup
// .append('g')
// .attr('class', 'axis')
// .call(positionEffYAxis.orient('left'));

// let speedEffectiveSVG = d3
// .select('#speedEffective')
// .append('svg')
// .attr('width', speedEffectiveDimension.width)
// .attr('height', speedEffectiveDimension.height)
// .call(bgRect, speedEffectiveDimension);

// let speedEffectiveGroup = speedEffectiveSVG
// .append('g')
// .attr('transform', 'translate(' + speedEffectiveDimension.left + ',' + speedEffectiveDimension.top + ' )');

let speedEffXAxis = d3.svg
    .axis()
    .scale(effSpeedX)
    .ticks(10)
    .tickSize(-speedEffectiveDimension.innerHeight);

let speedEffYAxis = d3.svg
    .axis()
    .scale(effSpeedY)
    .ticks(5)
    .tickSize(-speedEffectiveDimension.innerWidth);

// speedEffectiveGroup
// .append('g')
// .attr('class', 'axis')
// .attr('transform', 'translate(0, ' + speedEffectiveDimension.innerHeight + ')')
// .call(speedEffXAxis.orient('bottom'));

// speedEffectiveGroup
// .append('g')
// .attr('class', 'axis')
// .call(speedEffYAxis.orient('left'));

// init code
// should probably go somewhere else though.
fittsTest.active = false;
fittsTest.generateISOPositions(15, 150, 10);
fittsTest.updateISOCircles();
d3.select('#sliderDistanceValue').text(fittsTest.isoParams.distance);
d3.select('#sliderWidthValue').text(fittsTest.isoParams.width);
fittsTest.addDataSet();

// setup sliders
$('#sliderDistance').slider({
    min: fittsTest.isoLimits.minD,
    max: fittsTest.isoLimits.maxD,
    step: 1,
    value: fittsTest.isoParams.distance,
    slide: function(event, ui) {
        fittsTest.isoParams.distance = ui.value;
        fittsTest.updateISOCircles();
        d3.select('#sliderDistanceValue').text(ui.value);
        $('#randomizeCheckbox').attr('checked', false);
        fittsTest.isoParams.randomize = false;
    }
});

$('#sliderWidth').slider({
    min: fittsTest.isoLimits.minW,
    max: fittsTest.isoLimits.maxW,
    step: 1,
    value: fittsTest.isoParams.width,
    slide: function(event, ui) {
        fittsTest.isoParams.width = ui.value;
        fittsTest.updateISOCircles();
        d3.select('#sliderWidthValue').text(ui.value);
        $('#randomizeCheckbox').attr('checked', false);
        fittsTest.isoParams.randomize = false;
    }
});

// $('#randomizeButton').click(function() {
// fittsTest.randomizeParams();
// $('#randomizeCheckbox').attr('checked', true);
// fittsTest.isoParams.randomize = true;
// });

$('#randomizeCheckbox').change(function(event) {
    fittsTest.isoParams.randomize = $(this).attr('checked');
});

$('#addDataSetButton').click(function() {
    fittsTest.addDataSet();
    fittsTest.active = false;
});
