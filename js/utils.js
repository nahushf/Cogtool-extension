import { RECORDING_OFF_STATE, FITTS_CONSTANT } from './constants.js';

export function thinkTimeKey(tabKey) {
    return `${tabKey}-think-time`;
}

export function recordKey(tabKey) {
    return `${tabKey}-recording`;
}

export function constantsKey() {
    return `FITTS_CONSTANTS`;
}

const defaultStorage = chrome.storage.local;

export function setRecordState({ tabKey, storage = defaultStorage, recording, timestamp }) {
    storage.set({ [recordKey(tabKey)]: { recording, timestamp } });
}

export function getState({ storage = defaultStorage, callback, tabKey }) {
    const recordKeyVal = recordKey(tabKey);
    const thinkTimeKeyVal = thinkTimeKey(tabKey);
    const constantsKeyVal = constantsKey();
    storage.get(
        {
            [tabKey]: [],
            [recordKeyVal]: RECORDING_OFF_STATE,
            [thinkTimeKeyVal]: false,
            [constantsKeyVal]: { a: FITTS_CONSTANT.A, b: FITTS_CONSTANT.B }
        },
        data => {
            const recordState = data[recordKeyVal];
            const thinkTimeFlag = data[thinkTimeKeyVal];
            const records = data[tabKey];
            const constants = data[constantsKeyVal];
            callback({ recordState, thinkTimeFlag, records, constants });
        }
    );
}

export function getGlobalState({ storage = defaultStorage, callback }) {
    storage.get(null, data => {
        callback(data);
    })
}

export function calculateSlope({ x2, x1, y2, y1 }) {
    return (y2 - y1) / (x2 - x1);
}

export function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Check if none of the lines are of length 0
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
        return false;
    }

    denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

    // Lines are parallel
    if (denominator === 0) {
        return false;
    }

    let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

    // is the intersection along the segments
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
        return false;
    }

    // Return a object with the x and y coordinates of the intersection
    let x = x1 + ua * (x2 - x1);
    let y = y1 + ua * (y2 - y1);

    return { x, y };
}

export function lineIntersectionOnRect({ width, height, xB, yB, xA, yA }) {
    let w = width / 2;
    let h = height / 2;

    let dx = xA - xB;
    let dy = yA - yB;

    //if A=B return B itself
    if (dx == 0 && dy == 0)
        return {
            x: xB,
            y: yB
        };

    let tan_phi = h / w;
    let tan_theta = Math.abs(dy / dx);

    //tell me in which quadrant the A point is
    let qx = Math.sign(dx);
    let qy = Math.sign(dy);
    let xI, yI;
    if (tan_theta > tan_phi) {
        xI = xB + (h / tan_theta) * qx;
        yI = yB + h * qy;
    } else {
        xI = xB + w * qx;
        yI = yB + w * tan_theta * qy;
    }

    return {
        x: xI,
        y: yI
    };
}

export function calculateExpertTime({ targetSize, distance, a, b }) {
    const expertTime = a + b * Math.log2(distance / targetSize + 1);
    return Math.round(expertTime);
}

export function distanceBetweenCoordinates({ x1, y1, x2, y2 }) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function roundTo(v, dp) {
    return Math.round( (v * Math.pow(10, dp)) * (1 + Number.EPSILON)) / Math.pow(10, dp);
}

export function sendEventMessage({
    eventType,
    scrollTime,
    classList,
    ms,
    x,
    y,
    width,
    height,
    centerX,
    centerY,
    date,
    type,
    time,
    ...remainingData
}) {
    chrome.runtime.sendMessage({
        data: {
            eventType,
            scrollTime,
            classList,
            ms,
            x,
            y,
            width,
            height,
            centerX,
            centerY,
            date,
            type,
            time,
            ...remainingData
        }
    });
}
