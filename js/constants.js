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
    UPDATE_ALL_RECORDS: 'update-all-records'
});

export const THINK_TIME = 1200;

export const SYSTEM_RESPONSE_TIME = 1000;

export const RECORDING_OFF_STATE = {
    recording: false,
    timestamp: null
};

// export const FITTS_CONSTANT = {
// A: 0.5958773979024193,
// B: 0.1443519845199607
// };
const WITH_MOUSE = {
    A: 0.1065124396143242,
    B: 0.22043812897329967
};
const WITHOUT_MOUSE = {
    A: 0.41790656467960263,
    B: 0.1789738911981494
};
export const FITTS_CONSTANT = WITH_MOUSE;

export const THINK_RECORD = { eventType: EVENT_TYPES.THINK, timeTaken: THINK_TIME };
export const SYSTEM_RESPONSE_RECORD = { eventType: EVENT_TYPES.RESPONSE, timeTaken: SYSTEM_RESPONSE_TIME };

