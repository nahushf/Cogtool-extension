export const EVENT_TYPES = Object.freeze({
    CLICK: 'click',
    KEYSTROKE: 'keystroke',
    THINK: 'think',
    SCROLL: 'scroll',
    SAVE_CONSTANTS: 'save-constants'
});

export const THINK_TIME = 1200;

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
