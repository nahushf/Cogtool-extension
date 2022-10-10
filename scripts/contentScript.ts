import { EVENT_TYPES } from './constants';
import { sendEventMessage, roundTo } from './utils';

const elementsList = ['BUTTON', 'A', 'SELECT', 'INPUT', 'TEXTAREA', 'DETAILS'];

chrome.runtime.sendMessage({ startup: true });
let mouseWheelTimer;
let mouseWheelEventLog = {};
document.addEventListener('mousewheel', (event) => {
    if (!Object.keys(mouseWheelEventLog).length) {
        mouseWheelEventLog[Date.now()] = event;
    }
    clearTimeout(mouseWheelTimer);
    mouseWheelTimer = setTimeout(() => {
        const path = (event as any).path || event.composedPath();
        const scrolledNode = path.find(
            (node) => node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth
        );
        if (!scrolledNode) {
            return;
        }
        const { x, y, width, height } = scrolledNode.getBoundingClientRect();
        const type = scrolledNode.nodeName;
        const startTime = Object.keys(mouseWheelEventLog) as any;
        const date = new Date();
        const ms = date.getTime();

        let [dateStr, time] = date.toISOString().split('T');
        sendEventMessage({
            eventType: EVENT_TYPES.SCROLL,
            scrollTime: ms - startTime,
            classList: scrolledNode.className.split(' '),
            ms,
            x: roundTo(x, 2),
            y: roundTo(y, 2),
            width: roundTo(width, 2),
            height: roundTo(height, 2),
            centerX: roundTo(x + width / 2, 2),
            centerY: roundTo(y + height / 2, 2),
            date: dateStr,
            type,
            time: time.replace('Z', '')
        });
        mouseWheelEventLog = {};
    }, 100);
});
document.addEventListener('mousedown', (e) => {
    let target = e.target as HTMLDivElement & { nodeText: any };

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

    sendEventMessage({
        eventType: EVENT_TYPES.CLICK,
        ms,
        x: roundTo(x, 2),
        y: roundTo(y, 2),
        width: roundTo(width, 2),
        height: roundTo(height, 2),
        centerX: roundTo(x + width / 2, 2),
        centerY: roundTo(y + height / 2, 2),
        nodeText: target.textContent?.trim(),
        type: type.toLowerCase(),
        date,
        time: time.replace('Z', '')
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

document.addEventListener('keypress', (e) => {
    if (!KEYSTROKE_TAGS.includes(document.activeElement.tagName)) {
        return;
    }
    const key = (e as any).keycode || e.which;
    const keyChar = String.fromCharCode(96 <= key && key <= 105 ? key - 48 : key);

    let [date, time] = new Date().toISOString().split('T');
    sendEventMessage({
        eventType: EVENT_TYPES.KEYSTROKE,
        ms: Date.now(),
        nodeText: e.key,
        date,
        time: time.replace('Z', '')
    });
});
