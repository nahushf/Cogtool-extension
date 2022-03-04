import { EVENT_TYPES } from './constants.js';
const elementsList = ['BUTTON', 'A', 'SELECT', 'INPUT', 'TEXTAREA', 'DETAILS'];

export function main() {
    /**
     * Using the mousedown event instead of the click event because in case of popups, the click event
     * is fired after the popup is closed which leads to width, height, x, y as 0
     */

    chrome.runtime.sendMessage({ startup: true });
    let mouseWheelTimer;
    let mouseWheelEventLog = {};
    document.addEventListener('mousewheel', event => {
        if (!mouseWheelEventLog.length) {
            mouseWheelEventLog[Date.now()] = event;
        }
        clearTimeout(mouseWheelTimer);
        mouseWheelTimer = setTimeout(() => {
            const path = event.path || event.composedPath();
            const scrolledNode = path.find(
                node => node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth
            );
            const { x, y, width, height } = scrolledNode.getBoundingClientRect();
            const type = scrolledNode.nodeName;
            const startTime = Object.keys(mouseWheelEventLog);
            const date = new Date();
            const ms = date.getTime();
            chrome.runtime.sendMessage({
                data: {
                    eventType: EVENT_TYPES.SCROLL,
                    scrollTime: ms - startTime,
                    classList: scrolledNode.className.split(' '),
                    ms,
                    x: `${Math.round(x)}`,
                    y: `${Math.round(y)}`,
                    width: `${Math.round(width)}`,
                    height: `${Math.round(height)}`,
                    centerX: x + width / 2,
                    centerY: y + height / 2,
                    date,
                    type,
                    time: date
                        .toISOString()
                        .split('T')[1]
                        .replace('Z', '')
                }
            });
            mouseWheelEventLog = {};
        }, 100);
    });
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
                centerX: x + width / 2,
                centerY: y + height / 2,
                nodeText: target.textContent?.trim(),
                type: type.toLowerCase(),
                date,
                time: time.replace('Z', '')
            }
        });
    });

    const KEYSTROKE_TAGS = ['INPUT', 'TEXTAREA'];

    // Code to test/view clicks and distances
    // window.w = ({ x, y, angle }) => {
    // const span = document.createElement('span');
    // span.className = 'abc';
    // span.style = `position: fixed; top: ${e.y}px; left: ${e.x}px;
    // height: 5px;
    // width: 5px;
    // border-top: 2px solid red;
    // border-radius: 10px;
    // transform: translate(-50%, -50%) rotate(90deg);

    // `;
    // document.body.appendChild(span);
    // };

    // document.addEventListener('click', e => {});

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
                nodeText: e.key,
                type: '',
                date,
                time: time.replace('Z', '')
            }
        });
    });
}
