import { RECORDING_OFF_STATE, FITTS_CONSTANT, THINK_TIME, HOME_TIME, SYSTEM_RESPONSE_TIME } from './constants';

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
    const constantsKeyVal = constantsKey();
    storage.get(
        {
            [tabKey]: [],
            [recordKeyVal]: RECORDING_OFF_STATE,
            [constantsKeyVal]: { a: FITTS_CONSTANT.A, b: FITTS_CONSTANT.B }
        },
        data => {
            const recordState = data[recordKeyVal];
            const records = data[tabKey];
            const constants = data[constantsKeyVal];
            callback({ recordState, records, constants });
        }
    );
}

export function getGlobalState({ storage = defaultStorage, callback }) {
    storage.get(null, data => {
        callback(data);
    });
}

export function calculateExpertTime({ targetSize, distance, a, b }) {
    const expertTime = a + b * Math.log2(distance / targetSize + 1);
    return Math.round(expertTime);
}

export function distanceBetweenCoordinates({ x1, y1, x2, y2 }) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function roundTo(v, dp) {
    return Math.round(v * Math.pow(10, dp) * (1 + Number.EPSILON)) / Math.pow(10, dp);
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
}: Record<string, number | string | boolean> & {

    eventType: string,
    scrollTime?: number,
    classList?: string[],
    ms: number,
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    centerX?: number,
    centerY?: number,
    date: string,
    type?: string,
    time: string,
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

export function getSettings(state) {
    const settingsState = state.settings || {};

    if ([null, void 0].includes(settingsState.a)) {
        settingsState.a = FITTS_CONSTANT.A;
    }

    if ([null, void 0].includes(settingsState.b)) {
        settingsState.b = FITTS_CONSTANT.B;
    }

    if ([null, void 0].includes(settingsState.thinkTime)) {
        settingsState.thinkTime = THINK_TIME;
    }

    if ([null, void 0].includes(settingsState.homeTime)) {
        settingsState.homeTime = HOME_TIME;
    }

    if ([null, void 0].includes(settingsState.systemResponseTime)) {
        settingsState.systemResponseTime = SYSTEM_RESPONSE_TIME;
    }

    state.settings = settingsState;

    return state;
}
