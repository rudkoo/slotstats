///html/body/div[5]/md-dialog/form/md-dialog-actions/div/button

//const originalFetch = window.fetch;
//window.fetch = function() {
//    return new Promise((resolve, reject) => {
//        originalFetch.apply(this, arguments)
//            .then((response) => {
//                if (response) {
//                    response.clone().json() //the response body is a readablestream, which can only be read once. That's why we make a clone here and work with the clone
//                    .then( (json) => {
//                        console.log(json);
//                        //Do whatever you want with the json
//                        resolve(response);
//                    })
//                    .catch((error) => {
//                        console.log(error);
//                        reject(response);
//                    })
//                }
//                else {
//                    console.log(arguments);
//                    console.log('Undefined Response!');
//                    reject(response);
//                }
//            })
//            .catch((error) => {
//                console.log(error);
//                reject(response);
//            })
//    })
//}

//var XHR = XMLHttpRequest.prototype;
//var send = XHR.send;
//var open = XHR.open;
//
//XHR.open = function(method, url) {
//    this.url = url; // the request url
//    console.log("XHR Open")
//    return open.apply(this, arguments);
//}
//
//XHR.send = function() {
//    this.addEventListener('load', function() {
//        console.log("XHR Send")
//        if (this.url.includes('<url-you-want-to-intercept>')) {
//            var dataDOMElement = document.createElement('div');
//            dataDOMElement.id = '__interceptedData';
//            dataDOMElement.innerText = this.response;
//            dataDOMElement.style.height = 0;
//            dataDOMElement.style.overflow = 'hidden';
//            document.body.appendChild(dataDOMElement);
//        }               
//    });
//    return send.apply(this, arguments);
//};

//var tabId;
//chrome.runtime.sendMessage('get-tabId', function(response) {
//    tabId = response;
//});

function messageHandler(event) {
    if (event.data.msgId == "registerGame") {
        chrome.runtime.sendMessage({ id: "registerGame", gameId: event.data.currentGame }, function() {});
    }
    else if (event.data.msgId == "saveSpin") {
        console.log(event.data.spin)
        chrome.runtime.sendMessage({ id: "saveSpin", data: event.data.spin }, function() {});
    }
    else {
        //chrome.storage.local.set({"slotstats": event.data.provider + event.data.timestamp }, function() {
        //    console.log('Value is set to ' + event.data.provider);
        //});
        
    }
    
    chrome.storage.local.get(['registerGame'], function(result) {
        console.log('Value currently is ' + result.registerGame);
    });
}

function interceptData() {
    var xhrOverrideScript = document.createElement('script');
    //xhrOverrideScript.type = 'text/javascript';
    xhrOverrideScript.src = chrome.runtime.getURL('requests.js');
    xhrOverrideScript.onload = function() {
        this.remove();
    };
    document.head.prepend(xhrOverrideScript);
}

function checkForDOM() {
    console.log('checkForDOM')
    if (document.body && document.head) {
        console.log('interceptData')
        window.addEventListener("message", messageHandler);
        interceptData();
    } else {
        requestIdleCallback(checkForDOM);
    }
}

//interceptData()
requestIdleCallback(checkForDOM);