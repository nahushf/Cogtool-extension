(async () => {
    const src = chrome.runtime.getURL('js/contentScriptMain.js');
    const contentScript = await import(src);
    contentScript.main();
})();
