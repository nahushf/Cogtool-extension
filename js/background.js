chrome.runtime.onStartup.addListener(() => chrome.storage.local.clear())

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.local.remove(`${tabId}`)
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const key = `${sender.tab.id}`

    chrome.storage.local.get({[key]: []}, data => {
        let records = data[key]
        records.push(request.data)
        chrome.storage.local.set({[key]: records})
    })
})