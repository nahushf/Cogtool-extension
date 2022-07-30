import { THINK_TIME, HOME_TIME, FITTS_CONSTANT, SYSTEM_RESPONSE_TIME } from './constants.js';
import { getGlobalState, constantsKey, getSettings } from './utils.js';

const thinkTimeSection = document.querySelector('#think-time-section');
const homeTimeSection = document.querySelector('#home-time-section');
const systemResponseTimeSection = document.querySelector('#system-response-time-section');

const titleNode = document.querySelector('#page-title');
titleNode.innerHTML = chrome.runtime.getManifest().name + ' Options';

const AValueContainerNode = document.querySelector('#a-value');
const BValueContainerNode = document.querySelector('#b-value');
const ABValueClass = 'value-value';

function addSaveListener(sectionNode, defaultValue, key, completeState) {
    const saveButton = sectionNode.querySelector('button');
    saveButton.addEventListener('click', function() {
        const nodeValue = sectionNode.querySelector('.value-input').value;
        let newValue = [null, void 0].includes(nodeValue) ? defaultValue : parseFloat(nodeValue);
        newValue = isNaN(newValue) ? defaultValue : newValue;
        completeState.settings[key] = newValue;
        chrome.storage.sync.set(completeState, function () {
            saveButton.innerHTML = 'Saved!!';
            saveButton.classList.add('success');
            setTimeout(function() {
                saveButton.innerHTML = 'Save';

            saveButton.classList.remove('success');
            }, 2000);
        });
    });
}

getGlobalState({
    storage: chrome.storage.sync,
    callback: function(data) {
        const { a, b } = data[constantsKey()] || { a: FITTS_CONSTANT.A, b: FITTS_CONSTANT.B };
        AValueContainerNode.querySelector('.' + ABValueClass).innerHTML = a;
        BValueContainerNode.querySelector('.' + ABValueClass).innerHTML = b;

        const {
            settings: { thinkTime, homeTime, systemResponseTime }
        } = getSettings(data);
        homeTimeSection.querySelector('input').value = homeTime;
        thinkTimeSection.querySelector('input').value = thinkTime;
        systemResponseTimeSection.querySelector('input').value = systemResponseTime;

        addSaveListener(thinkTimeSection, THINK_TIME, 'thinkTime', data);
        addSaveListener(homeTimeSection, HOME_TIME, 'homeTime', data);
        addSaveListener(systemResponseTimeSection, SYSTEM_RESPONSE_TIME, 'systemResponseTime', data);
    }
});
