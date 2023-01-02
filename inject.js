"use strict";

var debugLogging = false

function messageHandler(event) {
    if (event.data.msgId == "registerGame") {
        chrome.runtime.sendMessage({ id: "registerGame", gameId: event.data.gameId, gameName: event.data.gameName, providerName: event.data.providerName }, function() {});
    }
    else if (event.data.msgId == "saveSpin") {
        if (debugLogging) {
            console.log(event.data.spin)
        }
        chrome.runtime.sendMessage({ id: "saveSpin", data: event.data.spin }, function() {});
    }
    else if (event.data.msgId == "recordResponse") {
        chrome.runtime.sendMessage({ id: "recordResponse", data: event.data.record, spin: event.data.spin }, function() {});
    }
    else if (event.data.msgId == "log") {
        console.log("[Slotstats]:" + event.data.message)
    }
}

function interceptData() {
    var requestsScript = document.createElement('script');
    var slotNamesScript = document.createElement('script');
    var currenciesScript = document.createElement('script');
    var launchersScript = document.createElement('script');
    requestsScript.src = chrome.runtime.getURL('requests.js');
    requestsScript.onload = function() {
        this.remove();
    };
    document.head.prepend(requestsScript);
    
    slotNamesScript.src = chrome.runtime.getURL('slots.js');
    slotNamesScript.onload = function() {
        this.remove();
    };
    document.head.prepend(slotNamesScript);
    
    currenciesScript.src = chrome.runtime.getURL('currencies.js');
    currenciesScript.onload = function() {
        this.remove();
    };
    document.head.prepend(currenciesScript);
    
    launchersScript.src = chrome.runtime.getURL('launchers.js');
    launchersScript.onload = function() {
        this.remove();
    };
    document.head.prepend(launchersScript);
}

document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("message", messageHandler);
    interceptData();
});
