
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("menuitem.overall").addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("pages/index.html") });
        window.close()
    })
    document.getElementById("menuitem.sessions").addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("pages/session.html") });
        window.close()
    })
    document.getElementById("menuitem.active_v").addEventListener("click", () => {
        chrome.windows.create({ url: chrome.runtime.getURL("pages/active_v.html"), type: "popup", width: 400, height: 440 });
        window.close()
    })
    document.getElementById("menuitem.active_h").addEventListener("click", () => {
        chrome.windows.create({ url: chrome.runtime.getURL("pages/active_h.html"), type: "popup", width: 700, height: 340 });
        window.close()
    })
});