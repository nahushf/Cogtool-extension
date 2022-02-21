import { marshallRecord } from './Record.js';
import { getState, setRecordState, thinkTimeKey } from './utils.js';

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
    keyOrder = ['eventType', 'type', 'nodeText', 'x', 'y', 'height', 'width', 'ms', 'date', 'time'];
    storage;
    recordStartTimestamp;
    totalTimeNode = document.querySelector('#total-time .total-time__value');
    recordingCheckboxNode = document.querySelector('#recording-checkbox');
    clearBtn = document.querySelector('.clear-board');
    constructor(container, storage, tabKey) {
        this.container = container;
        this.storage = storage;
        this.tabKey = tabKey;
        this.header = this.keyOrder.join(', ');
    }

    _getRecords(callback) {
        return this.storage.get(this.tabKey, data => {
            const tabData = data[this.tabKey] || [];
            callback(tabData.map(record => marshallRecord(record)));
        });
    }

    _setValue(value, callback) {
        this.storage.set({ [this.tabKey]: value }, callback);
    }

    setTotalTime(totalTime) {
        this.totalTimeNode.innerText = totalTime.toPrecision(4) + 's';
    }

    setup() {
        chrome.browserAction.setBadgeBackgroundColor({ color: '#D2042D' });
        getState({
            tabKey: this.tabKey,
            callback: ({ records, thinkTimeFlag, recordState }) => {
                if (!records.length) {
                    this.container.innerHTML = this.emptyMessage;
                    return;
                }
                let totalTime = 0;
                records.forEach((record, index) => {
                    this.container.innerHTML += this.renderRecord(record);
                    totalTime += record.timeTaken;
                });
                this.setTotalTime(totalTime / 1000);

            }
        });
        // this._getRecords(tabData => {
        // if (!tabData.length) {
        // this.container.innerHTML = this.emptyMessage;
        // return;
        // }
        // let totalTime = 0;
        // tabData.forEach((record, index) => {
        // const previosRecord = tabData[index - 1];
        // this.container.innerHTML += this.renderRecord(record);
        // totalTime += record.time;
        // });
        // this.setTotalTime(totalTime);
        // });
        // chrome.browserAction.setBadgeBackgroundColor({ color: '#D2042D' });
        // this.getRecordingFlag(({ recording: isRecording }) => {
        // if (isRecording) {
        // this.setRecBadge(isRecording);
        // }
        // });
    }

    getThinkTimeFlag(callback) {
        this.storage.get(thinkTimeKey(this.tabKey), data => {
            const thinkTimeFlag = !!data[thinkTimeKey(this.tabKey)];
            callback(thinkTimeFlag);
        });
    }

    getRecordingFlag(callback) {
        getState({
            tabKey: this.tabKey,
            callback({ recordState: { recording } }) {
                callback(recording);
            }
        });
    }

    clear() {
        this._setValue([], () => {
            this.container.innerHTML = this.emptyMessage;
        });
    }

    renderRecord(record) {
        const recordInstance = marshallRecord(record);
        return `<div class="record-drawer" >
            <div class="drawer-toggle" >${recordInstance.renderHeader()}${recordInstance.renderTime()}</div>
            <div class="drawer-content">${recordInstance.renderJSON()}</div>
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
                            .sort((a, b) => {
                                return this.keyOrder.indexOf(a[0]) < this.keyOrder.indexOf(b[0])
                                    ? -1
                                    : this.keyOrder.indexOf(a[0]) > this.keyOrder.indexOf(b[0])
                                    ? 1
                                    : 0;
                            })
                            .map(tuple => `"${tuple[1]}"`)
                            .join(',');
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

    const clearBtn = renderer.clearBtn;
    const thinkTimeCheckbox = document.querySelector('#think-time-checkbox');
    const recordingCheckbox = renderer.recordingCheckboxNode;

    clearBtn.onclick = () => {
        renderer.clear();
        renderer.setTotalTime(0);
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
            clipboardAssistTextArea.value = renderer.header + '\n' + csv;
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
        setRecordState({
            tabKey,
            storage: chrome.storage.local,
            recording: checked,
            timestamp: checked ? Date.now() : null
        });
        renderer.setRecBadge(checked);
        clearBtn.disabled = checked;
    });

    renderer.getThinkTimeFlag(checked => (thinkTimeCheckbox.checked = checked));

    renderer.getRecordingFlag(recordingFlag => {
        recordingCheckbox.checked = recordingFlag;
        clearBtn.disabled = recordingFlag;
    });
});
