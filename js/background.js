import { EVENT_TYPES, THINK_TIME, FITTS_CONSTANT } from './constants.js';
import { getState, recordKey, thinkTimeKey, calculateExpertTime, distanceBetweenCoordinates } from './utils.js';
chrome.runtime.onStartup.addListener(() => chrome.storage.local.clear());

chrome.tabs.onRemoved.addListener(tabId => {
    getState({
        tabId,
        callback: (...args) => {
            chrome.storage.local.remove([tabId, thinkTimeKey(tabId), recordKey(tabId)], () => {});
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
                chrome.browserAction.setBadgeText({
                    tabId: Number(tabKey),
                    text: recordingFlag ? 'rec' : null
                });
            }
        });
    });
}

chrome.runtime.onMessage.addListener(async (request, sender) => {
    const tabKey = `${sender.tab.id}`;
    getState({
        tabKey,
        callback: ({ recordState, thinkTimeFlag, records }) => {
            if (request.startup) {
                setBadge();
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
            const record = marshallRecord(request.data, lastRecord, recordState);
            const { eventType, time, type, nodeText } = record;
            records.push(record);
            chrome.notifications.create(eventType + time, {
                type: 'basic',
                title: 'Event Logged',
                iconUrl: 'icons/icon_32.png',
                message: `${eventType} event on a <${type}> with text "${nodeText}"`
            });
            chrome.storage.local.set({ [tabKey]: records });
        }
    });
});

function marshallRecord(recordData, lastRecord, recordState) {
    let { centerX, centerY, width, height, ms } = recordData;
    centerX = centerX || 0;
    centerY = centerY || 0;
    let timeTaken = 0;
    let expertTime = 0;
    if (lastRecord) {
        timeTaken = ms - (lastRecord?.ms || recordState.timestamp);
        if (recordData.eventType === EVENT_TYPES.CLICK) {
            let { centerX: previousCenterX, centerY: previousCenterY } = lastRecord;
            previousCenterY = previousCenterY || 0;
            previousCenterX = previousCenterX || 0;
            const distance = distanceBetweenCoordinates({
                x1: previousCenterX,
                x2: centerX,
                y1: previousCenterY,
                y2: centerY
            });
            expertTime = calculateExpertTime({ distance, targetSize: Math.min(height, width) });
        }
    }
    return {
        ...recordData,
        expertTime,
        timeTaken
    };
}
