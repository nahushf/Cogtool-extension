import { thinkTimeKey, recordKey } from './utils.js';

const TEXT_AREA_HEADER = 'Clicked on a <Tag> with "Text": ms,x,y,width,height,date,time\n';

class Renderer {
    header;
    emptyMessage = `<p>No actions recorded</p>`;
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
            callback(tabData);
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
            tabData.forEach(record => {
                this.container.innerHTML += this.renderRecord(record);
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
            console.log(data);
            callback(recordingFlag);
        });
    }

    clear() {
        this._setValue([], () => {
            this.container.innerHTML = this.emptyMessage;
        });
    }

    renderRecord(record) {
        switch (record.eventType) {
            case 'keystroke': {
                return this.renderKeyStrokeRecord(record);
            }
            case 'click': {
                return this.renderClickRecord(record);
            }
            case 'think': {
                return this.renderThinkRecord(record);
            }
        }
        return this[record.eventType === 'keystroke' ? 'renderKeyStrokeRecord' : 'renderClickRecord'](record);
    }

    renderKeyStrokeRecord(record) {
        return `<div class="record-row-container keystroke-record"><span class="record-row-title" >Tapped on the ${
            record.key
        } key</span>: ${JSON.stringify(record)}</div>`;
    }

    renderClickRecord(record) {
        return `<div class="record-row-container"><span class="record-row-title" >Clicked on a "${
            record.type == 'a' ? 'anchor' : record.type
        }" with text ${record.nodeName}</span>: ${JSON.stringify(record)}</div>`;
    }

    renderThinkRecord(record) {
        return `<div class='record-row-container think-record'><span class="record-row-title">Think</span></div>`;
    }
    getCSV(callback) {
        this._getRecords(tabData => {
            if (!tabData.length) {
                return '';
            } else {
                const csv = tabData
                    .map(record => {
                        return Object.entries(record)
                            .map(tuple => tuple[1])
                            .join(', ');
                    })
                    .join('\n');
                callback(csv);
            }
        });
    }
}

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tabKey = `${tabs[0].id}`;

    const logsContainer = document.querySelector('#logs');
    const renderer = new Renderer(logsContainer, chrome.storage.local, tabKey);
    renderjson.set_icons('+', '-');
    renderer.setup();
    chrome.browserAction.setBadgeBackgroundColor({ color: '#D2042D' });

    const clearBtn = document.querySelector('.clear-board');
    const thinkTimeCheckbox = document.querySelector('#think-time-checkbox');
    const recordingCheckbox = document.querySelector('#recording-checkbox');

    clearBtn.onclick = () => {
        renderer.clear();
    };
    // chrome.storage.local.get({ [key]: [] }, data => {
    // let records = data[key];
    let exportBtn = document.querySelector('.export-csv');
    let copyBtn = document.querySelector('.copy-clipboard');
    // const clearBtn = document.querySelector('.clear-board');
    // let textArea = document.querySelector('#logArea');

    // const renderer = new Renderer(textArea);
    // function resetBoard() {
    // textArea.value = TEXT_AREA_HEADER;
    // chrome.storage.local.set({ [key]: [] });
    // }

    // if (!records.length) return disable('No events were captured.');
    // received = true;
    // resetBoard();
    // records.forEach(record => {
    // renderer.renderRecord(record);
    // });
    // textArea.value += records
    // .map(
    // i =>
    // `Clicked on a <${i.type}> with text "${i.nodeName}": ${i.ms},${i.x},${i.y},${i.width},${i.height},${i.date},${i.time}`
    // )
    // .join('\n');

    exportBtn.onclick = e => {
        renderer.getCSV(csv => {
            let csvContent = 'data:text/csv;charset=utf-8,' + renderer.header + '\n';
            csvContent += csv;
            chrome.downloads.download({
                url: encodeURI(csvContent),
                filename: 'log.csv'
            });
        });
    };

    copyBtn.onclick = e => {
        renderer.getCSV(csv => {});
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        let label = copyBtn.innerText;
        copyBtn.innerText = 'Copied';
        setTimeout(() => (copyBtn.innerText = label), 800);
    };

    thinkTimeCheckbox.addEventListener('change', e => {
        chrome.storage.local.set({ [thinkTimeKey(tabKey)]: e.target.checked });
    });

    recordingCheckbox.addEventListener('change', ({ target: { checked } }) => {
        chrome.storage.local.set({ [recordKey(tabKey)]: checked });
        chrome.browserAction.setBadgeText({ tabId: Number(tabKey), text: checked ? 'rec' : null });
    });

    renderer.getThinkTimeFlag(checked => (thinkTimeCheckbox.checked = checked));

    renderer.getRecordingFlag(recording => {
        recordingCheckbox.checked = recording;
    });

    // clearBtn.onclick = e => {
    // resetBoard();
    // };

    // function disable(msg) {
    // exportBtn.disabled = true;
    // copyBtn.disabled = true;
    // textArea.disabled = true;
    // clearBtn.disabled = true;
    // textArea.value = msg;
    // }
    // });
});
