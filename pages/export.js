
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.id == "exportedRecords") {
        document.getElementById("content").innerHTML = msg.data
    }
});


$(document).ready(function () {
    chrome.runtime.sendMessage({ id: "exportRecords" }, function() {});
});