import {
    EVENT_TYPES,
    THINK_TIME,
    SCROLL_EXPERT_TIME,
    KEYSTROKE_EXPERT_TIME,
    HOME_EVENTS,
    HOME_RECORD
} from './constants';
import {
    getState,
    recordKey,
    calculateExpertTime,
    distanceBetweenCoordinates,
    constantsKey,
    getGlobalState,
    getSettings
} from './utils';
chrome.runtime.onStartup.addListener(() => chrome.storage.local.clear());

chrome.tabs.onRemoved.addListener(tabId => {
    chrome.storage.local.get(data => {
        const keys = [tabId, /*thinkTimeKey(tabId),*/ recordKey(tabId)];
        for (let key of keys) {
            if (data.hasOwnProperty(key)) {
                chrome.storage.local.remove(key.toString());
            }
        }
    });
});

function setBadge() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (!tabs?.length) {
            return;
        }
        const tabKey = `${tabs[0].id}`;
        getState({
            tabKey,
            callback({ recordState: { recording: recordingFlag } }) {
                chrome.action.setBadgeText({
                    tabId: Number(tabKey),
                    text: recordingFlag ? 'rec' : ''
                });
            }
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender) => {
    const tabKey = `${sender.tab ? sender.tab.id : request.tabKey}`;
    getState({
        tabKey,
        callback: ({ recordState, thinkTimeFlag, records, constants }) => {
            getGlobalState({
                storage: chrome.storage.sync,
                callback: function(permanentData) {
                    const settings = getSettings(permanentData).settings;
                    if (request.startup) {
                        setBadge();
                        return;
                    }

                    if (request.eventType === EVENT_TYPES.SAVE_CONSTANTS) {
                        const { a, b } = request;
                        permanentData.settings.a = a;
                        permanentData.settings.b = b;
                        chrome.storage.sync.set(permanentData);
                        return;
                    }

                    if (request.eventType === EVENT_TYPES.UPDATE_ALL_RECORDS) {
                        const { records } = request;
                        chrome.storage.local.set({ [tabKey]: records });
                        return;
                    }
                    const recordingFlag = recordState.recording;
                    if (!recordingFlag) {
                        return;
                    }
                    if (thinkTimeFlag) {
                        records.push({ eventType: EVENT_TYPES.THINK, timeTaken: THINK_TIME });
                    }
                    const lastRecord = records[records.length - 1];
                    const record = marshallRecord(request.data, lastRecord, recordState, getSettings(permanentData).settings);
                    const { eventType, time, type, nodeText } = record;
                    if (
                        !lastRecord ||
                        (lastRecord.eventType !== record.eventType &&
                            HOME_EVENTS.includes(lastRecord.eventType) &&
                            HOME_EVENTS.includes(record.eventType))
                    ) {
                        records.push({ ...HOME_RECORD, ms: lastRecord?.ms || recordState.timestamp, expertTime: settings.homeTime });
                    }
                    records.push(record);
                    chrome.notifications.create(eventType + time, {
                        type: 'basic',
                        title: 'Event Logged',
                        iconUrl: 'icons/icon_32.png',
                        message: `${eventType} event on a <${type}> tag ${nodeText ? ` with text "${nodeText}"` : ''}`
                    });
                    chrome.storage.local.set({ [tabKey]: records });
                }
            });
        }
    });
    return true;
});

function marshallRecord(recordData, lastRecord, recordState, constants) {
    let { centerX, centerY, width, height, ms } = recordData;
    centerX = centerX || 0;
    centerY = centerY || 0;
    let timeTaken = 0;
    let expertTime = 0;
    let previousCenterY = 0;
    let previousCenterX = 0;
    timeTaken = ms - (lastRecord?.ms || recordState.timestamp);
    if (lastRecord) {
        previousCenterX = lastRecord.centerX || 0;
        previousCenterY = lastRecord.previousCenterY || 0;
    }
    switch (recordData.eventType) {
        case EVENT_TYPES.CLICK: {
            const distance = distanceBetweenCoordinates({
                x1: previousCenterX,
                x2: centerX,
                y1: previousCenterY,
                y2: centerY
            });
            expertTime = calculateExpertTime({
                distance,
                targetSize: Math.min(height, width),
                a: constants.a,
                b: constants.b
            });
            break;
        }
        case EVENT_TYPES.SCROLL: {
            expertTime = SCROLL_EXPERT_TIME;
            break;
        }
        case EVENT_TYPES.KEYSTROKE: {
            /**
             * http://facweb.cs.depaul.edu/cmiller/eval/goms.html
             */
            expertTime = KEYSTROKE_EXPERT_TIME;
            break;
        }
    }

    return {
        ...recordData,
        expertTime,
        timeTaken
    };
}
