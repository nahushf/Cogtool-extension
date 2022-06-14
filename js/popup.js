import { EVENT_TYPES, THINK_RECORD, THINK_TIME } from './constants.js';
import { marshallRecord, SystemResponseRecord, ThinkRecord } from './Record.js';
import { getState, setRecordState, thinkTimeKey } from './utils.js';

function handleLogClick(e, renderer, tabKey) {
    const { target } = e;
    const containerNode = target.closest('.record-drawer-container');
    const recordDrawerNode = target.closest('.record-drawer');
    const closestAddStepNode = target.closest('.record-drawer__add-step');
    const closestModalNode = target.closest('.add-step-modal');
    const closestModalContentNode = target.closest('.add-step-modal__content');
    const addStepClicked = !!closestAddStepNode;
    const modalContentClicked = !!closestModalContentNode;
    const modalOverlayClicked = !!closestModalNode && !modalContentClicked;
    const modalChild = containerNode.querySelector('.add-step-modal');
    if (recordDrawerNode) {
        const isOpen = recordDrawerNode.classList.contains('open');
        if (isOpen) {
            recordDrawerNode.classList.remove('open');
        } else {
            recordDrawerNode.classList.add('open');
        }
    } else if (addStepClicked) {
        modalChild.classList.add('open');
    } else if (modalOverlayClicked) {
        modalChild.classList.remove('open');
    } else if (modalContentClicked) {
        if (target.tagName === 'BUTTON') {
            const targetID = target.getAttribute('id');
            const addIndex = parseInt(containerNode.getAttribute('data-record-index')) + 1;
            let newRecord;
            if (targetID === 'add-think-step') {
                newRecord = THINK_RECORD;
            } else if (targetID === 'add-response-step') {
                newRecord = new SystemResponseRecord().record;
            }
            getState({
                tabKey,
                callback: ({ records }) => {
                    const beforeArr = records.slice(0, addIndex);
                    const afterArr = records.slice(addIndex);
                    const newArr = [...beforeArr, newRecord, ...afterArr];
                    chrome.runtime.sendMessage({ eventType: EVENT_TYPES.UPDATE_ALL_RECORDS, tabKey, records: newArr });
                    renderer.container.innerHTML = null;
                    renderer.renderRecords(newArr);
                }
            });
        }
    }
}

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
            console.log(tabData);
            callback(tabData.map(record => marshallRecord(record)));
        });
    }

    _setValue(value, callback) {
        this.storage.set({ [this.tabKey]: value }, callback);
    }

    addRecord(record, addAfterIndex) {
        this._getRecords(records => {
            const beforeArr = records.slice(0, addAfterIndex + 1);
            const afterArr = records.slice(addAfterIndex + 1);
            const newArr = { ...beforeArr, record, ...afterArr };
            this._setValue(newArr);
        });
    }

    setTotalTime(totalTime) {
        this.totalTimeNode.innerText = totalTime.toPrecision(4) + 's';
    }

    setup() {
        document.querySelector('#logs').addEventListener('click', e => handleLogClick(e, this, this.tabKey));
        chrome.action.setBadgeBackgroundColor({ color: '#D2042D' });
        this.fetchAndRenderRecords();
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

    fetchAndRenderRecords() {
        getState({
            tabKey: this.tabKey,
            callback: ({ records, thinkTimeFlag, recordState }) => {
                console.log(records);
                this.renderRecords(records);
            }
        });
    }

    renderRecords(records) {
        if (!records.length) {
            this.container.innerHTML = this.emptyMessage;
            return;
        }
        let totalTime = 0;
        records.forEach((record, index) => {
            this.container.innerHTML += this.renderRecord(record, index);
            totalTime += record.timeTaken;
        });
        this.setTotalTime(totalTime / 1000);
    }

    renderRecord(record, index) {
        const recordInstance = marshallRecord(record);
        return `<div class="record-drawer-container" data-record-index="${index}">
            <div class="record-drawer">
            <div class="drawer-toggle" >${recordInstance.renderHeader()}${recordInstance.renderTime()}</div>
            <div class="drawer-content">${recordInstance.renderJSON()}</div>
            </div>
            <div class="record-drawer__add-step">
                <div class="add-step-popup" >Click to add step</div>
            </div> 
            <div class="add-step-modal">
                <div class="add-step-modal__content">
                    <div class="add-step__title">Choose which step to add</div>
                    <div class="add-step__options">
                        <button id="add-think-step" >Think(M)</button>
                        <button id="add-response-step" >System Response(R)</div>
                    </div> 
                </div>
            </div>
            </div>
            `;
    }

    getCSV(callback) {
        this._getRecords(tabData => {
            if (!tabData.length) {
                callback('');
            } else {
                const tuples = [];

                tabData.forEach(({ record }) => {
                    const missingKeys = Object.keys(record).filter(key => {
                        return !this.keyOrder.includes(key);
                    });
                    this.keyOrder = [...this.keyOrder, ...missingKeys];
                });
                tabData.forEach(({ record }) => {
                    tuples.push(
                        this.keyOrder.map(key => `"${typeof record[key] === 'undefined' ? '' : record[key]}"`).join(',')
                    );
                });
                callback(this.keyOrder, tuples.join('\n'));
            }
        });
    }

    setRecBadge(isRecording) {
        chrome.action.setBadgeText({ tabId: Number(this.tabKey), text: isRecording ? 'rec' : '' });
    }
}

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tabKey = `${tabs[0].id}`;

    const logsContainer = document.querySelector('#logs');
    const renderer = new Renderer(logsContainer, chrome.storage.local, tabKey);
    renderjson.set_icons('+', '-');
    renderer.setup();

    const clearBtn = renderer.clearBtn;
    // const thinkTimeCheckbox = document.querySelector('#think-time-checkbox');
    const recordingCheckbox = renderer.recordingCheckboxNode;
    const changeConstantsButton = document.querySelector('#change-constants');

    const optionsUrl = chrome.runtime.getURL('/options.html');

    const disabledContent = document.getElementById('disabled-content');
    const enabledControls = document.getElementById('enabled-content');
    if (optionsUrl === tabs[0].url || !tabs[0].url) {
        enabledControls.style.display = 'none';
        disabledContent.style.display = 'block';
    } else {
        enabledControls.style.display = 'block';
        disabledContent.style.display = 'none';
    }

    clearBtn.onclick = () => {
        renderer.clear();
        renderer.setTotalTime(0);
    };
    let exportBtn = document.querySelector('.export-csv');
    let copyBtn = document.querySelector('.copy-clipboard');

    exportBtn.onclick = e => {
        renderer.getCSV((keyOrder, csv) => {
            if (!csv) {
                chrome.notifications.create('noCSV' + new Date().getTime(), {
                    type: 'basic',
                    title: 'No actions recorded',
                    iconUrl: 'icons/icon_32.png',
                    message: `Cannot download csv because no actions were recorded`
                });
                return;
            }
            let csvContent = 'data:text/csv;charset=utf-8,' + keyOrder + '\n';
            csvContent += csv;
            chrome.downloads.download({
                url: encodeURI(csvContent),
                filename: 'log.csv'
            });
        });
    };

    copyBtn.onclick = e => {
        renderer.getCSV((keyOrder, csv) => {
            const clipboardAssistTextArea = document.querySelector('#clipboard-assist');
            clipboardAssistTextArea.value = keyOrder + '\n' + csv;
            clipboardAssistTextArea.focus();
            clipboardAssistTextArea.select();
            document.execCommand('copy');
            let label = copyBtn.innerText;
            copyBtn.innerText = 'Copied';
            setTimeout(() => (copyBtn.innerText = label), 800);
        });
    };

    // thinkTimeCheckbox.addEventListener('change', e => {
    // chrome.storage.local.set({ [thinkTimeKey(tabKey)]: e.target.checked });
    // });

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

    changeConstantsButton.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // renderer.getThinkTimeFlag(checked => (thinkTimeCheckbox.checked = checked));

    renderer.getRecordingFlag(recordingFlag => {
        recordingCheckbox.checked = recordingFlag;
        clearBtn.disabled = recordingFlag;
    });
});
