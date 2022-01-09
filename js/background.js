import { EVENT_TYPES, THINK_TIME } from './constants.js';
import { recordKey, thinkTimeKey, getState } from './utils.js';
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
            const { eventType, time, nodeText, type } = request.data;
            const lastRecord = records[records.length - 1];
            const timeTaken = request.data.ms - (lastRecord?.ms || recordState.timestamp);

            chrome.notifications.create(eventType + time, {
                type: 'basic',
                title: 'Event Logged',
                iconUrl: 'icons/icon_32.png',
                message: `${eventType} event on a <${type}> with text "${nodeText}"`
            });
            records.push({
                ...request.data,
                timeTaken
            });
            chrome.storage.local.set({ [tabKey]: records });
        }
    });
});
