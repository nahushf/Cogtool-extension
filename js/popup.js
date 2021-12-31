import { marshallRecord } from './Record.js';
import { thinkTimeKey, recordKey } from './utils.js';

const TEXT_AREA_HEADER = 'Clicked on a <Tag> with "Text": ms,x,y,width,height,date,time\n';

function toggleDrawer(e) {
    const { target } = e;
    const node = target.closest('.record-drawer');
    const isOpen = node.classList.contains('open');
    if (isOpen) {
        node.classList.remove('open');
    } else {
        node.classList.add('open');
    }
}

document.querySelector('#logs').addEventListener('click', toggleDrawer);

class Renderer {
    header;
    emptyMessage = `<p class="no-actions">No actions recorded</p>`;
    storage;
    constructor(container, storage, tabKey) {
        this.container = container;
        this.storage = storage;
        this.tabKey = tabKey;
    }

    _getRecords(callback) {
        return this.storage.get(this.tabKey, data => {
            const tabData = data[this.tabKey] || [];
            if (tabData.length && !this.header?.length) {
                const headers = [];
                Object.entries(tabData[0]).map(([key]) => headers.push(key));
                this.header = headers.join(', ');
            }

            callback(tabData.map(record => marshallRecord(record)));
        });
    }

    _setValue(value, callback) {
        this.storage.set({ [this.tabKey]: value }, callback);
    }

    setup() {
        this._getRecords(tabData => {
            if (!tabData.length) {
                this.container.innerHTML = this.emptyMessage;
                return;
            }
            let totalTime = 0;
            tabData.forEach(record => {
                this.container.innerHTML += this.renderRecord(record);
                totalTime += record.time;
            });
        });
    }

    getThinkTimeFlag(callback) {
        this.storage.get(thinkTimeKey(this.tabKey), data => {
            const thinkTimeFlag = !!data[thinkTimeKey(this.tabKey)];
            callback(thinkTimeFlag);
        });
    }

    getRecordingFlag(callback) {
        this.storage.get(recordKey(this.tabKey), data => {
            const recordingFlag = data[recordKey(this.tabKey)];
            callback(recordingFlag);
        });
    }

    clear() {
        this._setValue([], () => {
            this.container.innerHTML = this.emptyMessage;
        });
    }

    renderRecord(record) {
        return `<div class="record-drawer" >
            <div class="drawer-toggle" >${record.renderHeader()}${record.renderTime()}</div>
            <div class="drawer-content">${record.renderJSON()}</div>
            </div>`;
    }

    getCSV(callback) {
        this._getRecords(tabData => {
            if (!tabData.length) {
                callback('');
            } else {
                const csv = tabData
                    .map(record => {
                        return Object.entries(record.record)
                            .map(tuple => tuple[1])
                            .join(', ');
                    })
                    .join('\n');
                callback(csv);
            }
        });
    }

    setRecBadge(isRecording) {
        chrome.browserAction.setBadgeText({ tabId: Number(this.tabKey), text: isRecording ? 'rec' : null });
    }
}

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tabKey = `${tabs[0].id}`;

    const logsContainer = document.querySelector('#logs');
    const renderer = new Renderer(logsContainer, chrome.storage.local, tabKey);
    renderjson.set_icons('+', '-');
    renderer.setup();

    const clearBtn = document.querySelector('.clear-board');
    const thinkTimeCheckbox = document.querySelector('#think-time-checkbox');
    const recordingCheckbox = document.querySelector('#recording-checkbox');

    clearBtn.onclick = () => {
        renderer.clear();
    };
    let exportBtn = document.querySelector('.export-csv');
    let copyBtn = document.querySelector('.copy-clipboard');

    exportBtn.onclick = e => {
        renderer.getCSV(csv => {
            if (!csv) {
                chrome.notifications.create('noCSV' + new Date().getTime(), {
                    type: 'basic',
                    title: 'No actions recorded',
                    iconUrl: 'icons/icon_32.png',
                    message: `Cannot download csv because no actions were recorded`
                });
                return;
            }
            let csvContent = 'data:text/csv;charset=utf-8,' + renderer.header + '\n';
            csvContent += csv;
            chrome.downloads.download({
                url: encodeURI(csvContent),
                filename: 'log.csv'
            });
        });
    };

    copyBtn.onclick = e => {
        renderer.getCSV(csv => {
            const clipboardAssistTextArea = document.querySelector('#clipboard-assist');
            clipboardAssistTextArea.value = csv;
            clipboardAssistTextArea.focus();
            clipboardAssistTextArea.select();
            document.execCommand('copy');
            let label = copyBtn.innerText;
            copyBtn.innerText = 'Copied';
            setTimeout(() => (copyBtn.innerText = label), 800);
        });
    };

    thinkTimeCheckbox.addEventListener('change', e => {
        chrome.storage.local.set({ [thinkTimeKey(tabKey)]: e.target.checked });
    });

    recordingCheckbox.addEventListener('change', ({ target: { checked } }) => {
        chrome.storage.local.set({ [recordKey(tabKey)]: checked });
        renderer.setRecBadge(checked);
    });

    renderer.getThinkTimeFlag(checked => (thinkTimeCheckbox.checked = checked));

    renderer.getRecordingFlag(recording => {
        recordingCheckbox.checked = recording;
    });
});
