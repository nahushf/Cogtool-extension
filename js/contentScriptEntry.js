(async () => {
  const src = chrome.extension.getURL('js/contentScriptMain.js');
  const contentScript = await import(src);
  contentScript.main();
})();
