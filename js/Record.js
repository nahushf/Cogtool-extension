import { EVENT_TYPES, THINK_TIME } from './constants.js';

export class Record {
    record;
    time;
    constructor(record) {
        this.record = record;
    }

    renderTime() {
        return `<div class="time">
            <div class="actual"> 
            ${this.record.timeTaken / 1000}s</div>${
            this.record.expertTime ? `<div class="expert">/${this.record.expertTime.toFixed(2)}s</div>` : ''
        }</div> `;
    }

    renderJSON() {
        return JSON.stringify(this.record, null, 4)
            .split('\n')
            .join('<br/>')
            .split('    ')
            .join('&nbsp;&nbsp;&nbsp;&nbsp;');
    }
}

export class ThinkRecord extends Record {
    time = THINK_TIME;

    constructor(record) {
        super(record);
    }

    renderHeader() {
        return `<div>Think</div>`;
    }

    render() {
        return `<div class='record-row-container think-record'><span class="record-row-title">Think</span></div>`;
    }
}

export class KeystrokeRecord extends Record {
    time = 0.28;

    constructor(record) {
        super(record);
    }

    renderHeader() {
        return `<div>Tapped on ${this.record.nodeText}</div> `;
    }
}

export class ClickRecord extends Record {
    time = 1.1;

    constructor(record) {
        super(record);
    }

    renderHeader() {
        const { type, nodeText } = this.record;
        return `<div>Clicked: ${type == 'a' ? 'anchor' : type} with text "${nodeText}"</div>`;
    }
}

export function marshallRecord(record) {
    switch (record.eventType) {
        case EVENT_TYPES.KEYSTROKE: {
            return new KeystrokeRecord(record);
        }
        case EVENT_TYPES.CLICK: {
            return new ClickRecord(record);
        }
        case EVENT_TYPES.THINK: {
            return new ThinkRecord(record);
        }
    }
}
