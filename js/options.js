import { THINK_TIME, HOME_TIME, FITTS_CONSTANT, SYSTEM_RESPONSE_TIME } from './constants.js';
import { getGlobalState, constantsKey, getSettings } from './utils.js';

const aTimeSection = document.querySelector('#a-time-section');
const bTimeSection = document.querySelector('#b-time-section');
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
        chrome.storage.sync.set(completeState, function () {
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
            settings: { aTime, bTime, thinkTime, homeTime, systemResponseTime }
        } = getSettings(data);
        aTimeSection.querySelector('input').value = aTime;
        bTimeSection.querySelector('input').value = bTime;
        homeTimeSection.querySelector('input').value = homeTime;
        thinkTimeSection.querySelector('input').value = thinkTime;
        systemResponseTimeSection.querySelector('input').value = systemResponseTime;

        addSaveListener(aTimeSection, aTime, 'aTime', data);
        addSaveListener(bTimeSection, bTime, 'bTime', data);
        addSaveListener(thinkTimeSection, THINK_TIME, 'thinkTime', data);
        addSaveListener(homeTimeSection, HOME_TIME, 'homeTime', data);
        addSaveListener(systemResponseTimeSection, SYSTEM_RESPONSE_TIME, 'systemResponseTime', data);
    }
});
