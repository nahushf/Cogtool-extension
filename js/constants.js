/**
 * TODO: Separate out events that are recordable and events that are internal such as update all records, save constants, etc
 * */
export const EVENT_TYPES = Object.freeze({
    CLICK: 'click',
    KEYSTROKE: 'keystroke',
    THINK: 'think',
    SCROLL: 'scroll',
    SAVE_CONSTANTS: 'save-constants',
    RESPONSE: 'system-response',
    HOME: 'home',
    UPDATE_ALL_RECORDS: 'update-all-records'
});

export const THINK_TIME = 1200;
export const SCROLL_EXPERT_TIME = 1100;
export const SYSTEM_RESPONSE_TIME = 1000;
export const KEYSTROKE_EXPERT_TIME = 200;
export const HOME_TIME = 400;

export const RECORDING_OFF_STATE = {
    recording: false,
    timestamp: null
};

export const FITTS_CONSTANT = {
    A: 350,
    B: 150
};

export const HOME_EVENTS = [EVENT_TYPES.CLICK, EVENT_TYPES.KEYSTROKE];

export const THINK_RECORD = { eventType: EVENT_TYPES.THINK, timeTaken: 0, expertTime: THINK_TIME };
export const SYSTEM_RESPONSE_RECORD = { eventType: EVENT_TYPES.RESPONSE, timeTaken: 0, expertTime: SYSTEM_RESPONSE_TIME };
export const HOME_RECORD = { eventType: EVENT_TYPES.HOME, timeTaken: 0, expertTime: HOME_TIME };
