const TEXT_AREA_HEADER = 'Clicked on a <Tag> with "Text": ms,x,y,width,height,date,time\n';

class Renderer {
    header = TEXT_AREA_HEADER;
    emptyMessage = `<p>No actions recorded</p>`;
    storage;
    constructor(container, storage, tabKey) {
        this.container = container;
        this.storage = storage;
        this.tabKey = tabKey;
    }

    setup() {
        this.storage.get(this.tabKey, data => {
            const tabData = data[this.tabKey];
            if (!tabData?.length) {
                this.container.innerHTML = this.emptyMessage;
                return;
            }
            tabData.forEach(record => {
                this.container.innerHTML += this.renderRecord(record);
            });
        });
    }

    clear() {
        this.storage.set({ [this.tabKey]: [] }, () => {
            this.container.innerHTML = this.emptyMessage;
        });
    }

    renderRecord(record) {
        return this[record.eventType === 'keystroke' ? 'renderKeyStrokeRecord' : 'renderClickRecord'](record);
    }

    renderKeyStrokeRecord(record) {
        console.log(record);
        return `<div class="record-row-container keystroke-record"><span class="record-row-title" >Tapped on the ${
            record.key
        } key</span>: ${JSON.stringify(record)}</div>`;
    }

    renderClickRecord(record) {
        return `<div class="record-row-container"><span class="record-row-title" >Clicked on a "${
            record.type == 'a' ? 'anchor' : record.type
        }" with text ${record.nodeName}</span>: ${JSON.stringify(record)}</div>`;
    }
}

function renderRecord(record) {
    const jsonRecord = renderjson(record);
    return `<div class="record-row-container"><span class="record-row-title" >Clicked on a "${
        record.type == 'a' ? 'anchor' : record.type
    }" with text ${record.nodeName}</span>: ${JSON.stringify(record)}</div>`;
}

function setupLogs(logsContainer, tabKey) {
    chrome.storage.local.get(tabKey, data => {
        const tabData = data[tabKey];
        window.renderjson = renderjson;
        if (!tabData?.length) {
            logsContainer.innerHTML = '<p>No actions recorded</p>';
            return;
        }
        tabData.forEach(record => {
            logsContainer.innerHTML += renderRecord(record);
        });
    });
}

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const key = `${tabs[0].id}`;

    const logsContainer = document.querySelector('#logs');
    const renderer = new Renderer(logsContainer, chrome.storage.local, key);
    renderjson.set_icons('+', '-');
    renderer.setup();
    setupLogs(logsContainer, key);

    const clearBtn = document.querySelector('.clear-board');

    clearBtn.onclick = e => {
        renderer.clear();
    };
    // chrome.storage.local.get({ [key]: [] }, data => {
    // let records = data[key];
    // let exportBtn = document.querySelector('.export-csv');
    // let copyBtn = document.querySelector('.copy-clipboard');
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

    // exportBtn.onclick = e => {
    // let csvContent = 'data:text/csv;charset=utf-8,';
    // csvContent += textArea.value;
    // chrome.downloads.download({
    // url: encodeURI(csvContent),
    // filename: 'log.csv'
    // });
    // };

    // copyBtn.onclick = e => {
    // textArea.focus();
    // textArea.select();
    // document.execCommand('copy');
    // let label = copyBtn.innerText;
    // copyBtn.innerText = 'Copied';
    // setTimeout(() => (copyBtn.innerText = label), 800);
    // };

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
