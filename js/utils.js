import { RECORDING_OFF_STATE } from './constants.js';

export function thinkTimeKey(tabKey) {
    return `${tabKey}-think-time`;
}

export function recordKey(tabKey) {
    return `${tabKey}-recording`;
}

const defaultStorage = chrome.storage.local;

export function setRecordState({ tabKey, storage = defaultStorage, recording, timestamp }) {
    storage.set({ [recordKey(tabKey)]: { recording, timestamp } });
}

export function getState({ storage = defaultStorage, callback, tabKey }) {
    const recordKeyVal = recordKey(tabKey);
    const thinkTimeKeyVal = thinkTimeKey(tabKey);
    storage.get({ [tabKey]: [], [recordKey(tabKey)]: RECORDING_OFF_STATE, [thinkTimeKey(tabKey)]: false }, data => {
        const recordState = data[recordKeyVal];
        const thinkTimeFlag = data[thinkTimeKeyVal];
        const records = data[tabKey];
        callback({ recordState, thinkTimeFlag, records });
    });
}
