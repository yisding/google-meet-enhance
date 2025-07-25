console.debug("[gme] background worker booted");

chrome.runtime.onInstalled.addListener(details => {
  console.debug("[gme] installed", details);
});

chrome.commands.onCommand.addListener(command => {
  console.debug("[gme] command", command);
}); 