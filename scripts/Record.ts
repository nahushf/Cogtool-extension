import {
    EVENT_TYPES,
    HOME_RECORD,
    HOME_TIME,
    SYSTEM_RESPONSE_RECORD,
    SYSTEM_RESPONSE_TIME,
    THINK_RECORD,
    THINK_TIME
} from './constants';

export class Record {
    record;
    time;
    constructor(record) {
        this.record = record;
    }

    renderTime() {
        return `<div class="time">
            <div class="actual"> 
            ${this.record.timeTaken} ms</div>${
            this.record.expertTime ? `<div class="expert">/${this.record.expertTime} ms</div>` : ''
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
        super(record || THINK_RECORD);
    }

    renderHeader() {
        return `<div>Mentally Prepare</div>`;
    }
}

export class HomeRecord extends Record {
    time = HOME_TIME;

    constructor(record) {
        super(record || HOME_RECORD);
    }

    renderHeader() {
        return `<div>Home</div>`;
    }
}

export class SystemResponseRecord extends Record {
    time = SYSTEM_RESPONSE_TIME;

    constructor(record = SYSTEM_RESPONSE_RECORD) {
        super(record || SYSTEM_RESPONSE_RECORD);
    }

    renderHeader() {
        return `<div>System Response</div>`;
    }
}

export class KeystrokeRecord extends Record {
    constructor(record) {
        super(record);
    }

    renderHeader() {
        return `<div>Typed ${this.record.nodeText}</div> `;
    }
}

export class ClickRecord extends Record {
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
        case EVENT_TYPES.SCROLL: {
            return new ScrollRecord(record);
        }
        case EVENT_TYPES.RESPONSE: {
            return new SystemResponseRecord(record);
        }
        case EVENT_TYPES.HOME: {
            return new HomeRecord(record);
        }
    }
}

export class ScrollRecord extends Record {
    constructor(record) {
        super(record);
    }

    renderHeader() {
        return `<div>Scrolled ${this.record.type} tag with class(es) "${this.record.classList[0]}"</div>`;
    }
}
