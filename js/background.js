import { thinkTimeKey, recordKey } from './utils.js';
chrome.runtime.onStartup.addListener(() => chrome.storage.local.clear());

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.local.remove(`${tabId}`);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const tabKey = `${sender.tab.id}`;

    const recordKeyVal = recordKey(tabKey);
    const thinkTimeKeyVal = thinkTimeKey(tabKey);
    chrome.storage.local.get({ [tabKey]: {}, [recordKeyVal]: false, [thinkTimeKeyVal]: false }, data => {
        const recordingFlag = data[recordKeyVal];
        const thinkTimeFlag = data[thinkTimeKeyVal];
        if (!recordingFlag) {
            return;
        }
        let records = data[tabKey];
        if (thinkTimeFlag) {
            records.push({ eventType: 'think' });
        }
        records.push(request.data);
        chrome.storage.local.set({ [tabKey]: records });
    });
});
