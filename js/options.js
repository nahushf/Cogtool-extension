import { THINK_TIME, HOME_TIME, FITTS_CONSTANT, SYSTEM_RESPONSE_TIME } from './constants.js';
import { getGlobalState, constantsKey, getSettings } from './utils.js';

const aSection = document.querySelector('#a-time-section');
const bSection = document.querySelector('#b-time-section');
const thinkTimeSection = document.querySelector('#think-time-section');
const homeTimeSection = document.querySelector('#home-time-section');
const systemResponseTimeSection = document.querySelector('#system-response-time-section');

const titleNode = document.querySelector('#page-title');
titleNode.innerHTML = chrome.runtime.getManifest().name + ' Options';

const AValueContainerNode = document.querySelector('#a-value');
const BValueContainerNode = document.querySelector('#b-value');
const ABValueClass = 'value-value';

function addSaveListener(sectionNode, defaultValue, key, completeState) {
    const saveButton = systemResponseTimeSection.querySelector('button');
    saveButton.addEventListener('click', function() {
        const nodeValue = sectionNode.querySelector('.value-input').value;
        let newValue = [null, void 0].includes(nodeValue) ? defaultValue : parseFloat(nodeValue);
        newValue = isNaN(newValue) ? defaultValue : newValue;
        completeState.settings[key] = newValue;
        chrome.storage.sync.set(completeState, function() {
            saveButton.innerHTML = 'Updated';
            saveButton.classList.add('success');
            setTimeout(function() {
                saveButton.innerHTML = 'Update';

                saveButton.classList.remove('success');
            }, 1000);
        });
    });
}

getGlobalState({
    storage: chrome.storage.sync,
    callback: function(data) {
        const {
            settings: { a, b, thinkTime, homeTime, systemResponseTime }
        } = getSettings(data);
        aSection.querySelector('input').value = a;
        bSection.querySelector('input').value = b;
        homeTimeSection.querySelector('input').value = homeTime;
        thinkTimeSection.querySelector('input').value = thinkTime;
        systemResponseTimeSection.querySelector('input').value = systemResponseTime;

        addSaveListener(aSection, a, 'a', data);
        addSaveListener(bSection, b, 'b', data);
        addSaveListener(thinkTimeSection, THINK_TIME, 'thinkTime', data);
        addSaveListener(homeTimeSection, HOME_TIME, 'homeTime', data);
        addSaveListener(systemResponseTimeSection, SYSTEM_RESPONSE_TIME, 'systemResponseTime', data);
    }
});
