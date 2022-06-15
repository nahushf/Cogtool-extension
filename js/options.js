import { FITTS_CONSTANT, EVENT_TYPES } from './constants.js';
import { getState, getGlobalState, constantsKey } from './utils.js';

var svgns = 'http://www.w3.org/2000/svg',
    ex = document.getElementById('experiment'),
    sp = document.getElementById('scatterplot');
const aStateNode = document.getElementById('a-state');
const bStateNode = document.getElementById('b-state');
const aCurrentValueNode = document.getElementById('a-current-value');
const bCurrentValueNode = document.getElementById('b-current-value');
const aNewValueNode = document.getElementById('a-new-value');
const bNewValueNode = document.getElementById('b-new-value');
const updateButton = document.getElementById('update-values');

aStateNode.addEventListener('change', function(e) {
    const a = parseFloat(e.target.value);
    setNodeHTML(aNewValueNode, a)
});

bStateNode.addEventListener('change', function(e) {
    const b = parseFloat(e.target.value);
    setNodeHTML(bNewValueNode, b)
});

ex.setAttribute('height', window.innerHeight);
ex.setAttribute('width', window.innerHeight);
const msTimeout = 2000;
var timeout = setTimeout(inactive, msTimeout);

var MT = [],
    ID = [];
let tClick = 0;
let xClick = 0;
let yClick = 0;

const NUMBER_OF_TARGETS = 9;
experiment(ex);

function setNodeHTML(node, value) {
    if ((typeof value == 'number' && value.toString().includes('.')) || (parseFloat(value) && value.includes('.'))) {
        value = parseFloat(value).toFixed(2);
    }
    node.innerHTML = value;
}

getGlobalState({
    callback: data => {
        const { a, b } = data[constantsKey()] || { a: FITTS_CONSTANT.A, b: FITTS_CONSTANT.B };
        setNodeHTML(aCurrentValueNode, a);
        setNodeHTML(bCurrentValueNode, b);
    }
});

updateButton.addEventListener('click', function() {
    const a = parseFloat(aStateNode.value);
    const b = parseFloat(bStateNode.value);
    chrome.runtime.sendMessage({
        eventType: EVENT_TYPES.SAVE_CONSTANTS,
        a,
        b
    });
});

chrome.storage.local.onChanged.addListener(changed => {
    const constantsKeyVal = constantsKey();
    const {
        newValue: { a, b }
    } = changed[constantsKeyVal];

    setNodeHTML(aCurrentValueNode, a);
    setNodeHTML(bCurrentValueNode, b);

    setTimeout(() => {
        alert('Values for a and b updated.');
    }, 0);
});

function inactive() {
    if (MT.length > 2) {
        let lr = linreg(MT, ID);
        const a = parseFloat(lr.b.toFixed(2));
        const b = parseFloat(lr.m.toFixed(2));
        document.getElementById('error1').innerHTML =
            '<em>MT</em> = ' +
            a +
            ' + ' +
            b +
            ' <em>ID</em>' +
            '<br /><em>r</em> = ' +
            lr.r.toFixed(2) +
            `<br /> <br />
            `;

        aStateNode.value = a;
        bStateNode.value = b;
        aStateNode.dispatchEvent(new Event('change'));
        bStateNode.dispatchEvent(new Event('change'));
        updateButton.disabled = false;
        while (sp.lastElementChild) sp.removeChild(sp.lastElementChild); // If replotting, clear previous plot first.
        plot(sp, ID, MT, lr);
    }
}

function experiment(ex) {
    let xMid = 0.5 * ex.getAttribute('width');
    let yMid = 0.5 * ex.getAttribute('height');
    // for (let i = 0; i < num; i++) {
    // isoPositions[i] = {
    // x: testDimension.cx + (d / 2) * Math.cos((2 * Math.PI * i) / num),
    // y: testDimension.cy + (d / 2) * Math.sin((2 * Math.PI * i) / num),
    // w: w
    // };
    // }

    let id = 1;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 9; k++) {
                let cx = Math.round(xMid + (50 + j * 50) * Math.cos((8 / 9) * k * Math.PI));
                let cy = Math.round(yMid + (50 + j * 50) * Math.sin((8 / 9) * k * Math.PI));
                let circle = document.createElementNS(svgns, 'circle');
                circle.setAttributeNS(null, 'id', id);
                circle.setAttributeNS(null, 'display', 'none');
                circle.setAttributeNS(null, 'cx', cx);
                circle.setAttributeNS(null, 'cy', cy);
                circle.setAttributeNS(null, 'r', 10 + 20 * i + (4 * Math.random() - 2));
                circle.setAttributeNS(null, 'fill', 'rgba(255, 0, 0, 1)');
                circle.addEventListener('click', e => hit(e));
                ex.appendChild(circle);
                id++;
            }
        }
    }
    document.getElementById(1).setAttribute('display', 'block');
}

function hit(evt) {
    clearTimeout(timeout); // reset 2000 ms user inactivity timer
    timeout = setTimeout(inactive, msTimeout);

    let t = evt.timeStamp,
        interval = t - tClick;
    let circle = evt.target;
    let x = circle.getAttribute('cx');
    let y = circle.getAttribute('cy');

    if (interval < msTimeout && tClick > 0) {
        let w = circle.getAttribute('r');
        let d = Math.sqrt(Math.pow(x - xClick, 2) + Math.pow(y - yClick, 2));
        let difficulty = Math.log2(d / w + 1);
        MT.push(Math.round(interval));
        ID.push(difficulty);
    }
    tClick = t;
    xClick = x;
    yClick = y;
    let id = circle.getAttribute('id');
    circle.setAttribute('display', 'none');
    let next = document.getElementById(parseInt(id) + 1);
    if (next == null) next = document.getElementById(1);
    next.setAttribute('display', 'block');
}

// scatterplot of x, y on SVG sp with regression line lr
function plot(sp, x, y, lr) {
    const textStyle = 'font-family: sans-serif; font-size: 10',
        gridStyle = 'stroke: rgb(220, 220, 220); stroke-width: 1',
        pointStyle = 'fill: rgba(40, 100, 200, 0.6)',
        regStyle = 'stroke: rgba(40, 100, 200, 0.6); stroke-width: 1.5';
    const leftPad = 30,
        rightPad = 10,
        topPad = 10,
        btmPad = 15,
        w = sp.getAttribute('width') - leftPad - rightPad,
        h = sp.getAttribute('height') - topPad - btmPad;

    let xBound = bounds(x),
        xMax = xBound.ub,
        xMin = xBound.lb,
        xBy = xBound.by,
        yBound = bounds(y),
        yMax = yBound.ub,
        yMin = yBound.lb,
        yBy = yBound.by;

    // vertical labels and grid lines
    for (let xLine = xMin; xLine <= xMax; xLine += xBy) {
        let xPos = leftPad + (w * (xLine - xMin)) / (xMax - xMin);
        let data = document.createTextNode(xLine);
        let text = document.createElementNS(svgns, 'text');
        text.setAttributeNS(null, 'x', xPos);
        text.setAttributeNS(null, 'y', topPad + h + btmPad);
        text.setAttributeNS(null, 'style', textStyle);
        text.setAttributeNS(null, 'text-anchor', 'middle');
        text.appendChild(data);
        sp.appendChild(text);

        let line = document.createElementNS(svgns, 'line');
        line.setAttributeNS(null, 'x1', xPos);
        line.setAttributeNS(null, 'y1', topPad);
        line.setAttributeNS(null, 'x2', xPos);
        line.setAttributeNS(null, 'y2', topPad + h + 4);
        line.setAttributeNS(null, 'style', gridStyle);
        sp.appendChild(line);
    }
    // horizontal labels and grid lines
    for (let yLine = yMin; yLine <= yMax; yLine += yBy) {
        let yPos = topPad + h - (h * (yLine - yMin)) / (yMax - yMin);

        let data = document.createTextNode(yLine);
        let text = document.createElementNS(svgns, 'text');
        text.setAttributeNS(null, 'x', leftPad - 7);
        text.setAttributeNS(null, 'y', yPos + 4);
        text.setAttributeNS(null, 'style', textStyle);
        text.setAttributeNS(null, 'text-anchor', 'end');
        text.appendChild(data);
        sp.appendChild(text);

        let line = document.createElementNS(svgns, 'line');
        line.setAttributeNS(null, 'x1', leftPad - 5);
        line.setAttributeNS(null, 'y1', yPos);
        line.setAttributeNS(null, 'x2', leftPad + w);
        line.setAttributeNS(null, 'y2', yPos);
        line.setAttributeNS(null, 'style', gridStyle);
        sp.appendChild(line);
    }
    // points
    for (let i = 0; i < x.length; i++) {
        let circle = document.createElementNS(svgns, 'circle');
        circle.setAttributeNS(null, 'cx', leftPad + (w * (x[i] - xMin)) / (xMax - xMin));
        circle.setAttributeNS(null, 'cy', topPad + h - (h * (y[i] - yMin)) / (yMax - yMin));
        circle.setAttributeNS(null, 'r', 4);
        circle.setAttributeNS(null, 'style', pointStyle);
        sp.appendChild(circle);
    }
    // regression line
    let line = document.createElementNS(svgns, 'line');
    line.setAttributeNS(null, 'x1', leftPad);
    line.setAttributeNS(null, 'y1', topPad + h - (h * (lr.b + lr.m * xMin - yMin)) / (yMax - yMin));
    line.setAttributeNS(null, 'x2', leftPad + w);
    line.setAttributeNS(null, 'y2', topPad + h - (h * (lr.b + lr.m * xMax - yMin)) / (yMax - yMin));
    line.setAttributeNS(null, 'style', regStyle);
    sp.appendChild(line);
}

// find bounds, positive values only
function bounds(x) {
    let b = {},
        max = Math.max(...x),
        min = Math.min(...x),
        range = max - min,
        j = 0.5;
    for (let i = 1; 20 < range / j; i += 1) {
        if (i % 3 != 0) j = 2 * j;
        else j = 2.5 * j;
    }
    let lb = 0;
    for (var ub = 0; ub < max; ub += j) if (ub < min) lb = ub;
    b['lb'] = lb;
    b['ub'] = ub;
    b['by'] = j;
    return b;
}

// linear regression
function linreg(y, x) {
    let lr = {};
    let n = y.length;
    let sum_x = 0;
    let sum_y = 0;
    let sum_xy = 0;
    let sum_xx = 0;
    let sum_yy = 0;
    for (let i = 0; i < n; i++) {
        sum_x += x[i];
        sum_y += y[i];
        sum_xy += x[i] * y[i];
        sum_xx += x[i] * x[i];
        sum_yy += y[i] * y[i];
    }
    // slope, y-intercept, correlation coefficient
    lr['m'] = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
    lr['b'] = (sum_y - lr.m * sum_x) / n;
    lr['r'] = (n * sum_xy - sum_x * sum_y) / Math.sqrt((n * sum_xx - sum_x * sum_x) * (n * sum_yy - sum_y * sum_y));
    return lr;
}
