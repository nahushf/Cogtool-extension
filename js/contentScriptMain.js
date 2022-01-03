import { EVENT_TYPES } from './constants.js';
const elementsList = ['BUTTON', 'A', 'SELECT', 'INPUT', 'TEXTAREA', 'DETAILS'];

export function main() {
    // Do what you want
    /**
     * Using the mousedown event instead of the click event because in case of popups, the click event
     * is fired after the popup is closed which leads to width, height, x, y as 0
     */

    chrome.runtime.sendMessage({ startup: true });
    document.addEventListener('mousedown', e => {
        // console.log(chrome.tabs.query({ active: true, currentWindow: true }));
        let { target } = e;

        let interactive;

        if (elementsList.includes(target.nodeText)) interactive = target;
        else {
            interactive = target.closest(elementsList.join(','));
            if (!interactive) return;
        }

        let ms = Date.now();
        let { width, height, x, y } = interactive.getBoundingClientRect();
        let type = interactive.nodeName;
        let [date, time] = new Date().toISOString().split('T');

        chrome.runtime.sendMessage({
            data: {
                eventType: EVENT_TYPES.CLICK,
                ms,
                x: `${Math.round(x)}`,
                y: `${Math.round(y)}`,
                width: `${Math.round(width)}`,
                height: `${Math.round(height)}`,
                nodeText: target.textContent?.trim(),
                type: type.toLowerCase(),
                date,
                time: time.replace('Z', '')
            }
        });
    });

    const KEYSTROKE_TAGS = ['INPUT', 'TEXTAREA'];

    document.addEventListener('keyup', e => {
        if (!KEYSTROKE_TAGS.includes(document.activeElement.tagName)) {
            return;
        }
        const key = e.keycode || e.which;
        const keyChar = String.fromCharCode(96 <= key && key <= 105 ? key - 48 : key);

        let [date, time] = new Date().toISOString().split('T');
        chrome.runtime.sendMessage({
            data: {
                eventType: EVENT_TYPES.KEYSTROKE,
                ms: Date.now(),
                x: '',
                y: '',
                width: '',
                height: '',
                nodeText: e.key + `(${key})`,
                type: '',
                date,
                time: time.replace('Z', '')
            }
        });
    });
}
