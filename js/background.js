import { EVENT_TYPES, THINK_TIME, FITTS_CONSTANT } from './constants.js';
import { getState, recordKey, thinkTimeKey, calculateExpertTime } from './utils.js';
chrome.runtime.onStartup.addListener(() => chrome.storage.local.clear());

chrome.tabs.onRemoved.addListener(tabId => {
    chrome.storage.local.remove(tabId, () => {});
    chrome.storage.local.remove(thinkTimeKey(tabId), () => {});
    chrome.storage.local.remove(recordKey(tabId), () => {});
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

function distanceBetweenCoordinates({ x1, y1, x2, y2 }) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
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
            let { eventType, time, nodeText, type, centerX, centerY, width, height } = request.data;
            centerX = centerX || 0;
            centerY = centerY || 0;
            const lastRecord = records[records.length - 1];
            let timeTaken = 0;
            let expertTime = 0;
            if (lastRecord) {
                let { centerX: previousCenterX, centerY: previousCenterY } = lastRecord;
                previousCenterY = previousCenterY || 0;
                previousCenterX = previousCenterX || 0;
                const distance = distanceBetweenCoordinates({
                    x1: previousCenterX,
                    x2: centerX,
                    y1: previousCenterY,
                    y2: centerY
                });
                // const angle =
                // Math.atan(calculateSlope({ x2: centerX, x1: previousCenterX, y2: centerY, y1: previousCenterY })) *
                // (180 / Math.PI);
                // const { x: intersectionX, y: intersectionY } = lineIntersectionOnRect({
                // width,
                // height,
                // xB: centerX,
                // yB: centerY,
                // xA: previousCenterX,
                // yA: previousCenterY

                // distanceBetweenCoordinates({
                // x1: previousCenterX,
                // x2: intersectionX,
                // y1: previousCenterY,
                // y2: intersectionY
                // }) * 2;
                // console.log({ centerX, centerY, intersectionDistance });
                timeTaken = request.data.ms - (lastRecord?.ms || recordState.timestamp);
                expertTime = calculateExpertTime({ distance, targetSize: Math.min(height, width) });
                // const distanceFromPrevious = Math.sqrt(
                // Math.pow(centerX - previousCenterX, 2) + Math.pow(centerY - previousCenterY, 2)
                // );
            }
            chrome.notifications.create(eventType + time, {
                type: 'basic',
                title: 'Event Logged',
                iconUrl: 'icons/icon_32.png',
                message: `${eventType} event on a <${type}> with text "${nodeText}"`
            });
            records.push({
                ...request.data,
                expertTime,
                timeTaken
            });
            chrome.storage.local.set({ [tabKey]: records });
        }
    });
});
