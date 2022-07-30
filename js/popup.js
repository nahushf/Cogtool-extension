import { EVENT_TYPES, THINK_RECORD } from './constants.js';
import { marshallRecord, SystemResponseRecord } from './Record.js';
import { getGlobalState, getState, setRecordState, getSettings } from './utils.js';

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
            getGlobalState({
                callback(data) {
                    getGlobalState({
                        storage: chrome.storage.sync,
                        callback: function(syncData) {
                            const settings = getSettings(syncData).settings;
                            let newRecord;
                            if (targetID === 'add-think-step') {
                                newRecord = { ...THINK_RECORD, expertTime: settings.thinkTime };
                            } else if (targetID === 'add-response-step') {
                                newRecord = { ...new SystemResponseRecord().record, expertTime: settings.systemResponseTime };
                            }
                            const records = data[tabKey];
                            const beforeArr = records.slice(0, addIndex);
                            const afterArr = records.slice(addIndex);
                            const newArr = [...beforeArr, newRecord, ...afterArr];
                            chrome.runtime.sendMessage({
                                eventType: EVENT_TYPES.UPDATE_ALL_RECORDS,
                                tabKey,
                                records: newArr
                            });
                            const newRecordNode = new DOMParser()
                                .parseFromString(renderer.renderRecord(newRecord, addIndex), 'text/html')
                                .querySelector('.record-drawer-container');
                            renderer.container.insertBefore(newRecordNode, renderer.container.children[addIndex]);
                            modalChild.classList.remove('open');
                        }
                    });
                }
            });
        }
    }
}

class Renderer {
    header;
    emptyMessage = `<p class="no-actions">No actions recorded</p>`;
    keyOrder = ['eventType', 'type', 'nodeText', 'x', 'y', 'width', 'height', 'ms', 'date', 'time'];
    storage;
    recordStartTimestamp;
    totalTimeNode = document.querySelector('#total-time .total-time__value');
    recordingCheckboxNode = document.querySelector('#recording-checkbox');
    clearBtn = document.querySelector('.clear-board');
    pageNumberNode = document.querySelector('#page-number');
    totalTimeStateNode = document.querySelector('#total-time-state');
    recordsPerPage = 20;
    timer;
    constructor(container, storage, tabKey) {
        this.container = container;
        this.storage = storage;
        this.tabKey = tabKey;
        this.header = this.keyOrder.join(', ');
        this.setPageNumber(0);
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

    addRecord(record, addAfterIndex) {
        this._getRecords(records => {
            const beforeArr = records.slice(0, addAfterIndex + 1);
            const afterArr = records.slice(addAfterIndex + 1);
            const newArr = { ...beforeArr, record, ...afterArr };
            this._setValue(newArr);
        });
    }

    getTotalTime(callback) {
        getState({
            tabKey: this.tabKey,
            callback: ({ records, recordState }) => {
                if (!records.length) {
                    return;
                }
                let totalTime = 0;
                records.forEach(record => {
                    totalTime += record.timeTaken;
                });
                callback(totalTime);
            }
        });
    }

    setTotalTime(totalTime) {
        this.totalTimeStateNode.value = totalTime;
        this.totalTimeStateNode.dispatchEvent(new Event('change'));
    }

    renderTotalTime(totalTime) {
        this.totalTimeNode.innerHTML = totalTime + ' ms';
    }

    setup() {
        const self = this;
        document.querySelector('#logs').addEventListener('click', e => handleLogClick(e, this, this.tabKey));
        chrome.action.setBadgeBackgroundColor({ color: '#D2042D' });
        this.addPage();
        this.getTotalTime(function(totalTime) {
            self.setTotalTime(totalTime);
        });
        this.container.addEventListener('scroll', this.handleContainerScroll.bind(this));
        this.totalTimeStateNode.addEventListener('change', function(e) {
            const time = parseFloat(e.target.value) || 0;
            self.renderTotalTime(time);
        });
    }

    handleContainerScroll() {
        const { scrollHeight, clientHeight, scrollTop } = this.container;

        const maxScrollTop = scrollHeight - clientHeight - 100;
        if (scrollTop > maxScrollTop) {
            this.addPage();
        }
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

    getPageRecords(records, pageNumber) {
        const startIndex = (pageNumber - 1) * this.recordsPerPage;
        return records.slice(startIndex, startIndex + this.recordsPerPage);
    }

    addPage() {
        getState({
            tabKey: this.tabKey,
            callback: ({ records, recordState }) => {
                if (!records.length) {
                    this.container.innerHTML = this.emptyMessage;
                    return;
                }
                const currentPageNumber = this.getPageNumber();
                const newPageNumber = currentPageNumber + 1;
                if (currentPageNumber * this.recordsPerPage >= records.length) {
                    return;
                }
                this.setPageNumber(newPageNumber);
                const pageRecords = this.getPageRecords(records, newPageNumber);
                this.appendRecords(pageRecords);
            }
        });
    }

    addPageV2(allRecords, currentPageNumber, newPageNumber) {
        const pageRecords = this.getPageRecords(allRecords, newPageNumber);
        this.appendRecords(pageRecords);
    }

    getPageNumber() {
        return parseInt(this.pageNumberNode.value);
    }

    setPageNumber(pageNumber) {
        this.pageNumberNode.value = pageNumber;
        this.pageNumberNode.dispatchEvent(new Event('change'));
    }

    appendRecords(records) {
        // let totalTime = 0;

        const documentFragment = document.createDocumentFragment();
        records.forEach((record, index) => {
            const recordNode = new DOMParser()
                .parseFromString(this.renderRecord(record, index), 'text/html')
                .firstChild.querySelector('.record-drawer-container');
            documentFragment.append(recordNode);
        });
        this.container.append(documentFragment);
        // this.setTotalTime(totalTime);
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
                                <button id="add-think-step" >Mentally Prepare (M)</button>
                                <button id="add-response-step" >System Response (R)</button>
                            </div> 
                        </div>
                    </div>
                </div>
            `
            .split('\n')
            .map(line => line.trim())
            .join('');
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
    const recordingCheckbox = renderer.recordingCheckboxNode;
    const changeConstantsButton = document.querySelector('#change-constants');

    const optionsUrl = chrome.runtime.getURL('/options.html');

    const disabledContent = document.getElementById('disabled-content');
    const enabledControls = document.getElementById('enabled-content');
    if (optionsUrl === tabs[0].url || !tabs[0].url) {
        enabledControls.style.display = 'none';
        disabledContent.style.display = 'block';
        return;
    } else {
        enabledControls.style.display = 'block';
        disabledContent.style.display = 'none';
    }

    clearBtn.onclick = () => {
        renderer.clear();
        renderer.renderTotalTime(0);
    };
    let exportBtn = document.querySelector('.export-csv');
    //    let copyBtn = document.querySelector('.copy-clipboard');

    exportBtn.onclick = e => {
        renderer.getCSV((keyOrder, csv) => {
            if (!csv) {
                chrome.notifications.create('noCSV' + new Date().getTime(), {
                    type: 'basic',
                    title: 'No actions recorded',
                    iconUrl: 'icons/icon_32.png',
                    message: `Cannot download csv because no actions were recorded.`
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

    //    copyBtn.onclick = e => {
    //        renderer.getCSV((keyOrder, csv) => {
    //            const clipboardAssistTextArea = document.querySelector('#clipboard-assist');
    //            clipboardAssistTextArea.value = keyOrder + '\n' + csv;
    //            clipboardAssistTextArea.focus();
    //            clipboardAssistTextArea.select();
    //            document.execCommand('copy');
    //            let label = copyBtn.innerHTML;
    //            copyBtn.innerHTML = 'Copied';
    //            setTimeout(() => (copyBtn.innerHTML = label), 800);
    //        });
    //    };

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

    renderer.getRecordingFlag(recordingFlag => {
        recordingCheckbox.checked = recordingFlag;
        clearBtn.disabled = recordingFlag;
    });
});
