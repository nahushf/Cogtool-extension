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
