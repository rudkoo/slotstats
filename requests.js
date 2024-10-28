"use strict";

var recordingActive

const HEX_CHARACTERS = '0123456789abcdef';

function toHex(byteArray) {
    const hex = [];
    byteArray.forEach(function(b) {
        hex.push(HEX_CHARACTERS.charAt(b >> 4 & 0xf));
        hex.push(HEX_CHARACTERS.charAt(b & 0xf));
    });
    return hex.join('');
}

function fromHex(str) {
    if(typeof str !== 'string') {
        return [];
    }
    const byteArray = [];
    const characters = str.split('');
    for(let i = 0; i < characters.length; i += 2) {
        byteArray.push(HEX_CHARACTERS.indexOf(characters[i]) << 4 | HEX_CHARACTERS.indexOf(characters[i + 1]));
    }
    return byteArray;
}

function rc4(keyByteArray, inputByteArray) {
    let s = [],
        i,
        j,
        x, outputByteArray = [];

    for(i = 0; i < 256; i++) {
        s[i] = i;
    }

    for(i = 0, j = 0; i < 256; i++) {
        j = (j + s[i] + keyByteArray[i % keyByteArray.length]) % 256;
        x = s[i];
        s[i] = s[j];
        s[j] = x;
    }

    for(let y = 0, i = 0, j = 0; y < inputByteArray.length; y++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        x = s[i];
        s[i] = s[j];
        s[j] = x;
        outputByteArray.push(inputByteArray[y] ^ s[(s[i] + s[j]) % 256]);
    }
    return outputByteArray;
}

function stringToByteArray(str) {
    const encoded = encodeURIComponent(str);
    const characters = encoded.split('');
    const byteArray = [];
    for(let i = 0; i < characters.length; i++) {
        if(characters[i] === '%') {
            byteArray.push(HEX_CHARACTERS.indexOf(characters[i + 1].toLowerCase()) << 4 | HEX_CHARACTERS.indexOf(characters[i + 2].toLowerCase()));
            i += 2;
        } else {
            byteArray.push(characters[i].charCodeAt(0));
        }
    }
    return byteArray;
}

function byteArrayToString(byteArray) {
    let encoded = '';
    for(let i = 0; i < byteArray.length; i++) {
        encoded += '%' + HEX_CHARACTERS.charAt(byteArray[i] >> 4 & 0xf) + HEX_CHARACTERS.charAt(byteArray[i] & 0xf);
    }
    return decodeURIComponent(encoded);
}

const rc4Api = {
    encrypt: function(key, str) {
        return toHex(rc4(stringToByteArray(key), stringToByteArray(str)));
    },

    decrypt: function(key, str) {
        return byteArrayToString(rc4(stringToByteArray(key), fromHex(str)));
    }
};

(() => {
    recordingActive = false
    class HttpRequest {
        constructor(data) {
            this.method = data.method;
            this.url = data.url;
            this.headers = data.headers;
            this.body = data.body;
            this.response = data.response;
        }
    }
    
    class WebSocketMessage {
        constructor(data) {
            this.url = data.url;
            this.data = data.data;
        }
    }
    
    class Injector {
        inject() { }
        
        notifyWatchers(httpRequest) {
            //window.postMessage({ msgId: "log", message: httpRequest.url }, "*")
            for (let processor of Injector.processors) {
                if (processor.isValidProcessor(httpRequest)) {
                    return processor.processRequest(httpRequest)
                }
            }
        }
        notifyWsRequestListeners(wsRequest) {
            for (let processor of Injector.wsProcessors) {
                if (processor.isValidProcessor(wsRequest)) {
                    processor.processWsRequest(wsRequest)
                }
            }
        }
        notifyWsMessageListeners(wsMessage) {
            for (let processor of Injector.wsProcessors) {
                if (processor.isValidProcessor(wsMessage)) {
                    processor.processWsMessage(wsMessage)
                }
            }
        }
        notifyWsMessageSpecialListeners(webSocket, wsMessage) {
            for (let processor of Injector.wsProcessors) {
                if (processor.isValidProcessor(wsMessage)) {
                    return processor.processWsMessageSpecial(webSocket, wsMessage)
                }
            }
            return wsMessage
        }
    }
    Injector.processors = []

    class XMLHttpRequestInjector extends Injector {
        inject() {
            const xhr = window.XMLHttpRequest;
            const processRequest = e => {
                    const request = new HttpRequest(e);
                    try {
                        this.notifyWatchers(request);
                    } catch (e) {
                        window.postMessage({ msgId: "log", message: "Error: " + e.toString() + "\n" + e.stack  }, "*")
                    }
                };
            
            class XMLHttpRequestWrapper extends XMLHttpRequest{
                constructor() {
                    super()
                    this.addEventListener("load", function (e) {
                        processRequest(this)
                    });
                }
                open(e, t, r, n, s) {
                    super.open(e, t, r, n, s)
                    this.method = e, this.url = t, this.headers = {}, this.body = null
                }
                send(e) {
                    super.send(e)
                    this.body = e
                }
            }
            window.XMLHttpRequest = XMLHttpRequestWrapper
        }
    }
    
    class HacksawXMLHttpRequestInjector extends Injector {
        inject() {
            const xhr = window.XMLHttpRequest;
            const processRequest = e => {
                    const request = new HttpRequest(e);
                    try {
                        return this.notifyWatchers(request);
                    } catch (e) {
                        window.postMessage({ msgId: "log", message: "Error: " + e.toString() + "\n" + e.stack  }, "*")
                    }
                };
            
            class XMLHttpRequestWrapper {
                constructor() {
                    const obj = this;
                    this.listeners = {};
                    this.headers = {};
                    this.wrappedObj = new xhr;
                    this.overridenResponse = null
                    let events = ["readyState", "response", "responseText", "responseType", "responseURL", "responseXML", "status", "statusText", "timeout", "upload", "withCredentials"];
                    events.forEach((e => {
                        Object.defineProperty(this, e, {
                            get: function() {
                                if (e == "response" && this.overridenResponse) {
                                    return this.overridenResponse
                                } else {
                                    return this.wrappedObj[e]
                                }
                            },
                            set: function(value) {
                                this.wrappedObj[e] = value
                            }
                        })
                    }));
                    events = ["onloadstart", "onprogress", "onabort", "onerror", "ontimeout", "onloadend"];
                    events.forEach((e => {
                        obj.wrappedObj[e] = function() {
                            obj[e] && obj[e].apply(obj, arguments)
                        }
                    }));
                    this.loaded = false;
                    this.wrappedObj.onreadystatechange = function() {
                        if (this.wrappedObj.readyState === 4 && !this.loaded) {
                            this.loaded = true
                            let newResponse = processRequest(this)
                            if (newResponse) {
                                this.overridenResponse = newResponse
                            }
                        }
                        this.onreadystatechange && this.onreadystatechange.apply(this, arguments)
                    }.bind(this);
                    this.wrappedObj.onload = function() {
                        if (!this.loaded) {
                            this.loaded = true
                            let newResponse = processRequest(this)
                        }
                        this.onload && this.onload.apply(this, arguments)
                    }.bind(this);
                }
                open(e, t, r, n, s) {
                    this.method = e, this.url = t, this.headers = {}, this.body = null, this.loaded = false;
                    if (this.url.indexOf("gameError") < 0) {
                        this.wrappedObj.open.apply(this.wrappedObj, arguments)
                    }
                }
                overrideMimeType() {
                    return this.wrappedObj.overrideMimeType.apply(this.wrappedObj, arguments)
                }
                setRequestHeader(e, t) {
                    return this.headers[e] = t, this.wrappedObj.setRequestHeader.apply(this.wrappedObj, arguments)
                }
                abort() {
                    return this.wrappedObj.abort.apply(this.wrappedObj, arguments)
                }
                send(e) {
                    if (this.url.indexOf("gameError") < 0) {
                        return this.body = e, this.wrappedObj.send.apply(this.wrappedObj, arguments)
                    } else {
                        console.log(e)
                    }
                }
                getAllResponseHeaders(e) {
                    return this.wrappedObj.getAllResponseHeaders.apply(this.wrappedObj, arguments)
                }
                getResponseHeader(e) {
                    return this.wrappedObj.getResponseHeader.apply(this.wrappedObj, arguments)
                }
                addEventListener(e, t, r) {
                    e in this.listeners || (this.listeners[e] = []);
                    const n = function() {
                        t.apply(this, arguments)
                    };
                    this.listeners[e].push({
                        orig: t,
                        wrap: n
                    }), this.wrappedObj.addEventListener(e, n, r)
                }
                removeEventListener(e, t) {
                    if (!(e in this.listeners)) return;
                    const r = this.listeners[e];
                    for (let n = 0, s = r.length; n < s; n++)
                        if (r[n].orig === t) return this.wrappedObj.removeEventListener(e, r[n].wrap), void r.splice(n, 1)
                }
                dispatchEvent(e) {
                    return this.wrappedObj.dispatchEvent(e)
                }
            } ["UNSENT", "OPENED", "HEADERS_RECEIVED", "LOADING", "DONE", "READYSTATE_UNINITIALIZED", "READYSTATE_LOADING", "READYSTATE_LOADED", "READYSTATE_INTERACTIVE", "READYSTATE_COMPLETE"].forEach((t => {
                var n;
                n = t, {}.propertyIsEnumerable.call(xhr, n) && (XMLHttpRequestWrapper[n] = xhr[n])
            }))
            window.postMessage({ msgId: "log", message: "injecting XMLHttpRequest" }, "*")
            window.XMLHttpRequest = XMLHttpRequestWrapper
        }
    }
    
    class FetchInjector extends Injector {
        inject() {
            const origFetch = window.fetch;
            window.fetch = (url, data) => new Promise((resolve, reject) => {
                origFetch(url, data).then((result => {
                    if (result.headers.has("Content-Type") && result.headers.get("Content-Type").match(/json/)) {
                        result.text().then((text => {
                            if (!data) {
                                data = {};
                            }
                            let method = data.method ? data.method : "GET";
                            let headers = data.headers ? data.headers : {};
                            const request = new HttpRequest({
                                method: method,
                                url: url,
                                headers: headers,
                                body: data.body,
                                response: text
                            });
                            
                            try {
                                let replaceText = this.notifyWatchers(request)
                                if (replaceText) {
                                    text = replaceText
                                }
                            } catch (e) {
                                window.postMessage({ msgId: "log", message: "Error: " + e.toString() + "\n" + e.stack }, "*")
                            }
                            const response = new Response(text, result);
                            resolve(response);
                            
                        })).catch((err => { reject(err) }))
                    } else {
                        resolve(result);
                    }
                })).catch((err => { reject(err) }))
            })
        }
    }
    
    class WebSocketInjector extends Injector {
        inject() {
            const processRequest = e => {
                const message = new WebSocketMessage(e);
                try {
                    this.notifyWsRequestListeners(message);
                } catch (e) {
                    window.postMessage({ msgId: "log", message: "Error: " + e.toString() + "\n" + e.stack  }, "*")
                }
            };
            const processMessage = e => {
                const message = new WebSocketMessage(e);
                try {
                    this.notifyWsMessageListeners(message);
                } catch (e) {
                    window.postMessage({ msgId: "log", message: "Error: " + e.toString() + "\n" + e.stack  }, "*")
                }
            };
            const specialProcessMessage = (webSocket, e) => {
                const message = new WebSocketMessage(e);
                try {
                    return this.notifyWsMessageSpecialListeners(webSocket, message);
                } catch (e) {
                    window.postMessage({ msgId: "log", message: "Error: " + e.toString() + "\n" + e.stack  }, "*")
                }
                return e;
            };
            
            class WebSocketWrapper extends WebSocket{
                
                constructor(url, protocols) {
                    super(url, protocols)
                    this.addEventListener("message", function (e) {
                        processMessage({ url: this.url, data: e.data })
                    });
                    
                    this.onmessageFunc = null
                    this.sendingDisabled = false
                    Object.defineProperty(this, "onmessage", {
                        set(func) {
                            this.onmessageFunc = func
                            this.addEventListener("message", function (e) {
                                let resultMessage = specialProcessMessage(this, { url: this.url, data: e.data })
                                if (resultMessage) {
                                    let newEvent = new MessageEvent(e.type, { data: resultMessage.data, origin: e.origin, lastEventId: e.lastEventId, source: e.source, ports: e.ports })
                                    func(newEvent)
                                }
                            })
                        }
                    })
                }

                send(data) {
                    if (!this.sendingDisabled) {
                        super.send(data)
                        processRequest({ url: this.url, data: data })
                    }
                }
            }
            window.WebSocket = WebSocketWrapper
        }
    }
    
    class Spin {
        constructor() {
            this.provider = "unknown"
            this.gameId = "unknown"
            this.gameName = "unknown"
            this.bet = 0
            this.baseBet = 0
            this.win = 0
            this.multiplier = 0
            this.isFunGame = false
            this.isBonus = false
            this.isFreeBonus = true
            this.timestamp = null
            this.currency = ""
        }
    }
    
    class RequestProcessor {
        
        constructor() {
            this.uriPatterns = []
        }
        
        isValidProcessor(httpRequest) {
            //window.postMessage({ msgId: "log", message: "[isValidProcessor]: " + httpRequest.url }, "*")
            for (let pattern of this.uriPatterns) {
                if (httpRequest.url.match(pattern)) {
                    //window.postMessage({ msgId: "log", message: "[isValidProcessor]: matched " + pattern }, "*")
                    return true;
                }
            }
            return false;
        }
        
        processRequest(httpRequest) {
        }
        
        processWsRequest(wsMessage) {
        }
        
        processWsMessage(wsMessage) {
        }
        
        processWsMessageSpecial(webSocket, wsMessage) {
        }
    }
    
    class YggdrasilRequestProcessor extends RequestProcessor {
        constructor() {
            super()
            this.uriPatterns = [
                ".*://.*.yggdrasilgaming.com/slots/.*/.*",
                ".*://.*.yggdrasilgaming.com/app/.*/.*",
                ".*://.*.yggdrasilgaming.com/init/launchClient.html.*",
                ".*://.*.yggdrasilgaming.com/game.web/service.*",
                ".*://.*.pff-ygg.com/slots/.*/.*",
                ".*://.*.pff-ygg.com/app/.*/.*",
                ".*://.*.pff-ygg.com/init/launchClient.html.*",
                ".*://.*.pff-ygg.com/game.web/service.*",
                ".*://.*localhost.*/slotstats_tester/pragmatic.cgi.*"
            ]
            this.provider = "Yggdrasil"
            this.currentSpin = null
        }
        
        isBoughtBonus(requestParams, gameInfo) {
            let boughtBonus = gameInfo ? gameInfo[requestParams.get("cmd")] : false
            if (boughtBonus || (requestParams.has("cmd") && requestParams.get("cmd").match(/buy/i))) {
                return true
            } else {
                return false
            }
        }
        
        isHigherChanceSpin(requestParams, gameInfo) {
            if (gameInfo && gameInfo.higherChanceSpin && requestParams.get("cmd") in gameInfo.higherChanceSpin) {
                return true
            } else {
                return false
            }
        }
        
        isBonus(spinInfo, requestParams, gameInfo) {
            let cmd = requestParams.get("cmd")
            if (gameInfo && cmd in gameInfo) {
                return true
            }
            if (cmd && cmd.match(/free.?spin.*/i)) {
                return true
            }
            for (let i = 0; i < spinInfo.length; ++i) {
                if ('eventdata' in spinInfo[i]) {
                    if ('freeSpinsAwarded' in spinInfo[i].eventdata && spinInfo[i].eventdata.freeSpinsAwarded > 0) {
                        return true
                    }
                    if (spinInfo[i].eventdata.response != null && spinInfo[i].eventdata.response.clientData != null) {
                        let state = {}
                        if ('state' in spinInfo[i].eventdata.response.clientData && ("string" === typeof spinInfo[i].eventdata.response.clientData.state || spinInfo[i].eventdata.response.clientData.state instanceof String)) {
                            state = JSON.parse(atob("" + spinInfo[i].eventdata.response.clientData.state))
                        }
                        
                        if ('freeSpinsAwarded' in spinInfo[i].eventdata.response.clientData && parseInt(spinInfo[i].eventdata.response.clientData.freeSpinsAwarded) > 0) {
                            return true
                        } else if ('freeSpinsAwarded' in spinInfo[i].eventdata.response.clientData && parseInt(spinInfo[i].eventdata.response.clientData.freeSpinsAwarded) > 0) {
                            return true
                        } else if ('bonusTriggered' in spinInfo[i].eventdata.response.clientData && spinInfo[i].eventdata.response.clientData.bonusTriggered) {
                            return true
                        } else if ('slot_data' in state && 'state' in state.slot_data && 'feature_data' in state.slot_data.state && state.slot_data.state.feature_data.length > 1) {
                            return true
                        } else if ('data' in spinInfo[i].eventdata.response.clientData && spinInfo[i].eventdata.response.clientData.data.state == "FREE_SPINS") {
                            return true
                        } else if ('type' in spinInfo[i].eventdata.response.clientData && spinInfo[i].eventdata.response.clientData.type.match(/freespin/i)) {
                            return true
                        } else if ('bonus' in spinInfo[i].eventdata.response.clientData && spinInfo[i].eventdata.response.clientData.bonus) {
                            return true
                        } else if ('gameMode' in spinInfo[i].eventdata.response.clientData && spinInfo[i].eventdata.response.clientData.gameMode.match(/free.?spin/i)) {
                            return true
                        } else if ('output' in spinInfo[i].eventdata.response.clientData && spinInfo[i].eventdata.response.clientData.output.length > 0 && 'bonusInfo' in spinInfo[i].eventdata.response.clientData.output[0]) {
                            for (let j = 0; j < spinInfo[i].eventdata.response.clientData.output[0].bonusInfo.length; ++j) {
                                if (spinInfo[i].eventdata.response.clientData.output[0].bonusInfo[j].bonusName.match(/freespin/i)) {
                                    return true
                                }
                            }
                        }
                    }
                }
            }
            
            return false
        }
        
        processRequest(httpRequest) {
            
            if (typeof(httpRequest.response) != "string") {
                return
            }
            
            let postParams = window._POST_PARAMS_
            let response = JSON.parse(httpRequest.response)
            
            if (response.data && response.data.wager && response.data.wager.bets) {
                let requestParams = new URLSearchParams(httpRequest.body);
                let gameId = postParams.gameid
                let gameInfo = yggdrasilSlots[gameId]
                let spinInfo = response.data.wager.bets
                let isBonus = this.isBonus(spinInfo, requestParams, gameInfo)
                let isFinished = response.data.wager.status.match(/finished/i) != null
                let spin = new Spin()
                let spinToBeSaved = null
                let gameName = gameInfo ? gameInfo["name"] : gameId
                let isBoughtBonus = this.isBoughtBonus(requestParams, gameInfo)
                let isHigherChanceSpin = this.isHigherChanceSpin(requestParams, gameInfo)
                
                spin.provider = this.provider
                spin.gameId = gameId
                spin.gameName = gameName
                spin.isBonus = isBonus
                spin.isFunGame = !("key" in postParams && postParams.key != "")
                spin.currency = spinInfo[0].betcurrency
                
                if (spinInfo[0].step == 1) {
                    spin.bet = parseFloat(spinInfo[0].betamount)
                    if (isHigherChanceSpin) {
                        spin.baseBet = spin.bet / gameInfo.higherChanceSpin[requestParams.get("cmd")]
                    } else if (isBoughtBonus) {
                        let multiplier = gameInfo ? gameInfo[requestParams.get("cmd")] : 1
                        spin.baseBet = spin.bet / multiplier
                        spin.isFreeBonus = false
                    } else {
                        spin.baseBet = spin.bet
                    }
                    this.currentSpin = spin
                }
                
                if (isBonus || (this.currentSpin && this.currentSpin.isBonus)) {
                    if (!this.currentSpin.isBonus) {
                        this.currentSpin.isBonus = isBonus
                    }
                    
                    if (isFinished) {
                        this.currentSpin.timestamp = response.data.wager.timestamp
                        this.currentSpin.win = parseFloat(spinInfo[0].wonamount)
                        this.currentSpin.multiplier = this.currentSpin.win / this.currentSpin.baseBet
                        spinToBeSaved = this.currentSpin
                        this.currentSpin = null
                    }
                } else if (isFinished) {
                    this.currentSpin.win = parseFloat(spinInfo[0].wonamount)
                    this.currentSpin.multiplier = this.currentSpin.win / this.currentSpin.baseBet
                    this.currentSpin.timestamp = response.data.wager.timestamp
                    spinToBeSaved = this.currentSpin
                    this.currentSpin = null
                }
                
                if (spinToBeSaved) {
                    window.postMessage({ msgId: "saveSpin", spin: spinToBeSaved }, "*")
                }
                    
                if (recordingActive) {
                    httpRequest.body = httpRequest.body.toString()
                    window.postMessage({ msgId: "recordResponse", record: httpRequest, spin: spinToBeSaved }, "*")                  
                }
            }
        }
    }
    
    class PragmaticRequestProcessor extends RequestProcessor {
        
        constructor() {
            super()
            this.provider = "Pragmatic Play"
            this.currentSpin = null
            this.lastBet = 0
            this.respinCount = 0
        }
        
        parseSessionId(httpRequest) {
            let mgckey = requestParams.get("mgckey")
            let sessionId = mgckey.match(/SESSION@([^@~]+)/)[1]
            return sessionId
        }
        
        processRequest(httpRequest) {
            let requestParams = new URLSearchParams(httpRequest.body);
            let params = new URLSearchParams(httpRequest.response);
            let action = requestParams.get("action")
            let gameId = requestParams.get("symbol")
            let gameInfo = pragmaticSlots[gameId]
            let gameName = gameInfo ? gameInfo["name"] : document.title
            let spinToBeSaved = null
            
            if (action == "doInit") {
                setTimeout(()=>{
                    let maxPotential = window.XT.GetInt("WinLimit_TotalBetMultiplier");
                    window.postMessage({ msgId: "registerGame", gameId: gameId, gameName: gameName, providerName: this.provider, maxPotential: maxPotential }, "*")
                }, 500)
            } else if (action == "doSpin" || action == "doBonus") {
                let isBonus = params.has("fsmul") || params.has("fs_total") || params.has("rsb_c") || requestParams.has("pur")
                let spin = new Spin()
                let continued = (params.has("rs_more") && parseInt(params.get("rs_more")) == 1) || params.has("rs_c") || params.has("rs_m") || params.has("rs_p") || params.has("rs_t") || params.has("end")
                let totalWin = params.has("tw") ? parseFloat(params.get("tw").replace(",", "")) : parseFloat(params.get("w"))
                let continuedEnd = params.has("tw") && params.has("end") && (parseInt(params.get("end")) == 1)
                spin.provider = this.provider
                spin.gameId = gameId
                spin.win = params.has("w") ? parseFloat(params.get("w").replace(",", "")) : 0
                spin.isFunGame = httpRequest.url.includes("demogamesfree")
                spin.isBonus = isBonus
                spin.isFreeBonus = !requestParams.has("pur")
                spin.timestamp = parseInt(params.get("stime"))
                spin.currency = window.UHT_GAME_CONFIG ? window.UHT_GAME_CONFIG.CURRENCY : ""
                spin.gameName = gameName
                
                if (params.has("c") && params.has("l")) {
                    spin.baseBet = parseFloat(params.get("c")) * parseFloat(params.get("l"))
                    this.lastBet = spin.baseBet
                } else if (this.lastBet) {
                    spin.baseBet = this.lastBet
                }
                
                if (isBonus || (this.currentSpin && this.currentSpin.isBonus)) {
                    if (!this.currentSpin) {
                        this.currentSpin = spin
                    }
                    if (params.has("fs_total") || (params.has("rsb_m") && params.has("rsb_c") && parseInt(params.get("rsb_m")) == parseInt(params.get("rsb_c")))) {
                        this.currentSpin.win = totalWin
                        this.currentSpin.multiplier = this.currentSpin.win / this.currentSpin.baseBet
                    }
                    if (requestParams.has("pur")) {
                        let bonusIndex = parseInt(requestParams.get("pur"))
                        if (window.XT.GetObject(Vars.FeaturePurchase).purchaseCosts) {
                            this.currentSpin.bet = window.XT.GetObject(Vars.FeaturePurchase).purchaseCosts[bonusIndex] * (window.CoinManager.GetNextBet() * 1E3) / 1E3
                        } else if (gameInfo && gameInfo["bonus_buy"][bonusIndex]) {
                            this.currentSpin.bet = gameInfo["bonus_buy"][bonusIndex] * this.currentSpin.baseBet
                        }
                    }
                } else {
                    spin.bet = spin.baseBet
                    if (continued) {
                        if (params.has("rs_p")) {
                            this.respinCount = parseInt(params.get("rs_p")) + 1
                        }
                        if (params.has("end") && (parseInt(params.get("end")) == 0)) {
                            return
                        }
                        if (continuedEnd || (params.has("rs_t") && this.respinCount == parseInt(params.get("rs_t")))) {
                            spin.win = totalWin
                            spin.multiplier = spin.win / spin.baseBet
                            spinToBeSaved = spin
                        }
                    } else if (params.has("c") && params.has("l")) {
                        spin.multiplier = spin.win / spin.baseBet
                        spinToBeSaved = spin
                    }
                }
            } else if (action == "doCollect" || action == "doCollectBonus") {
                if (this.currentSpin) {
                    spinToBeSaved = this.currentSpin
                    this.currentSpin = null
                }
            }
            
            if (spinToBeSaved) {
                window.postMessage({ msgId: "saveSpin", spin: spinToBeSaved }, "*")
            }
            
            if (recordingActive) {
                window.postMessage({ msgId: "recordResponse", record: httpRequest, spin: spinToBeSaved }, "*")
            }
        }
    }
    
    class PragmaticV3RequestProcessor extends PragmaticRequestProcessor {
        
        constructor() {
            super()
            this.uriPatterns = [
                ".*://.*.pragmaticplay.net/gs2c/v3/gameService.*",
                ".*://.*.pragmaticplay.net/gs2c/ge/v3/gameService.*",
                ".*://.*.ppgames.net/gs2c/v3/gameService.*",
                ".*://.*.ppgames.net/gs2c/ge/v3/gameService.*",
                ".*://.*.jtmmizms.net/gs2c/v3/gameService.*",
                ".*://.*.jtmmizms.net/gs2c/ge/v3/gameService.*",
                ".*://.*.jzwidrtl.net/gs2c/v3/gameService.*",
                ".*://.*.jzwidrtl.net/gs2c/ge/v3/gameService.*"
            ]
        }
    }
    
    class PragmaticV4RequestProcessor extends PragmaticRequestProcessor {
        
        constructor() {
            super()
            this.uriPatterns = [
                ".*://.*.pragmaticplay.net/gs2c/v4/gameService.*",
                ".*://.*.pragmaticplay.net/gs2c/ge/v4/gameService.*",
                ".*://.*.ppgames.net/gs2c/v4/gameService.*",
                ".*://.*.ppgames.net/gs2c/ge/v4/gameService.*",
                ".*://.*.jtmmizms.net/gs2c/v4/gameService.*",
                ".*://.*.jtmmizms.net/gs2c/ge/v4/gameService.*",
                ".*://.*.jzwidrtl.net/gs2c/v4/gameService.*",
                ".*://.*.jzwidrtl.net/gs2c/ge/v4/gameService.*"
            ]
        }
    }
    
    class HacksawGamingProcessor extends RequestProcessor {
        constructor() {
            super()
            this.uriPatterns = [".*://.*.hacksawgaming.com/api/play/bet.*", ".*://.*.hacksawgaming.com/api/play/gameLaunch.*"]
            this.provider = "Hacksaw Gaming"
            this.decoder = new TextDecoder()
            this.currentSpin = null
            this.currency = null
            this.isFunMode = true
            this.gameId = null
            this.gameName = null
            this.featureBuyData = {}
            this.maxPotential = null
            let processor = this
            
            if (window.hacksawCasino) {
                window.hacksawCasino.PubSub.getChannel("casino").subscribe("startGame", function(e) {
                    if (e.featureBuyData) {
                        for (let bonus of e.featureBuyData) {
                            processor.featureBuyData[bonus.bonusGameId] = parseInt(bonus.betCostMultiplier)
                        }
                        processor.maxPotential = parseInt(e.gameInfoData.maximumWinMultiplier)
                    }
                })
                window.hacksawCasino.PubSub.getChannel("casino").subscribe("initData", function(e) {
                    processor.currency = e.currency
                    processor.isFunMode = e.mode.match(/demo/i) != null
                    processor.gameId = e.gameId
                    processor.gameName = e.gameName
                    window.postMessage({ msgId: "registerGame", gameId: e.gameId, gameName: e.gameName, providerName: processor.provider, maxPotential: processor.maxPotential }, "*")
                })
            }
        }
        
        getBonusEnterEvent(spinInfo) {
            if (spinInfo.round.events) {
                for (let eventItem of spinInfo.round.events) {
                    if (eventItem.etn == "feature_enter") {
                        return eventItem
                    }
                }
            }
            return null
        }
        
        isBonus(spinInfo) {
            let eventItem = this.getBonusEnterEvent(spinInfo)
            return eventItem != null
        }
        
        isFreeBonus(spinInfo, request) {
            let eventItem = this.getBonusEnterEvent(spinInfo)
            return (eventItem && (!("buyBonus" in request.bets[0]) || eventItem.c.bonusFeatureWon != request.bets[0].buyBonus))
        }
        
        getBonusWin(spinInfo) {
            for (let eventItem of spinInfo.round.events) {
                if (eventItem.etn == "feature_exit") {
                    return parseInt(eventItem.awa)
                }
            }
            return 0
        }
        
        getBonusBetMultiplier(request) {
            if ("bets" in request && request.bets.length > 0 && "buyBonus" in request.bets[0]) {
                return this.featureBuyData[request.bets[0].buyBonus]
            } else {
                return 1
            }
        }
        
        processRequest(httpRequest) {
            let requestParams = new URLSearchParams(httpRequest.body);
            
            if (httpRequest.url.endsWith("bet")) {
                let request = JSON.parse(httpRequest.body)
                let response = JSON.parse(this.decoder.decode(httpRequest.response))
                let spinToBeSaved = null
                let spin = new Spin()
                spin.provider = this.provider
                spin.gameId = this.gameId
                spin.gameName = this.gameName
                spin.isBonus = this.isBonus(response)
                spin.isFunGame = this.isFunMode
                spin.currency = this.currency
                
                if (this.currentSpin == null) {
                    let baseBet = parseInt(request.bets[0].betAmount) / 100
                    let bonusBetMultiplier = this.getBonusBetMultiplier(request)
                    this.currentSpin = spin
                    this.currentSpin.bet = baseBet * bonusBetMultiplier
                    this.currentSpin.baseBet = baseBet
                    
                    if (this.currentSpin.isBonus) {
                        this.currentSpin.isFreeBonus = this.isFreeBonus(response, request)
                    }
                }
                
                if (response.round.events.length > 0 && "awa" in response.round.events[response.round.events.length - 1]) {
                    this.currentSpin.win = parseInt(response.round.events[response.round.events.length - 1].awa) / 100
                }
                
                if (response.round.status && response.round.status.match(/completed/i)) {
                    this.currentSpin.multiplier = this.currentSpin.win / this.currentSpin.baseBet
                    this.currentSpin.timestamp = new Date(response.serverTime).getTime()
                    spinToBeSaved = this.currentSpin
                    this.currentSpin = null
                }
                
                if (spinToBeSaved) {
                    window.postMessage({ msgId: "saveSpin", spin: spinToBeSaved }, "*")
                }
                    
                if (recordingActive) {
                    window.postMessage({ msgId: "recordResponse", record: httpRequest, spin: spinToBeSaved }, "*")
                }
                
                if (this.gameName && this.gameName.match(/wanted dead or a wild/i) && response.round && response.round.events && response.round.events.length > 0 && 
                    request.bets && request.bets.length > 0 && request.bets[0].buyBonus == "freespins_duel" && this.currentSpin && this.currentSpin.win < 10) {
                    
                    let baseWinAmount = 2000 * this.currentSpin.baseBet
                    let winAmount = baseWinAmount * 10
                    baseWinAmount += ""
                    winAmount += ""
                    let encoder = new TextEncoder()
                    let rounds = [
                        {
                            "grid": "--3+/2,232),*.3),*//31*.1(3",
                            "actions": [
                                { "at": "duel", "data": { "position": "0", "winner": "2", "loser": "10" } },
                                { "at": "duel", "data": { "position": "6", "winner": "2", "loser": "20" } },
                                { "at": "duel", "data": { "position": "12", "winner": "2", "loser": "50" } },
                                { "at": "duel", "data": { "position": "18", "winner": "2", "loser": "10" } },
                                { "at": "duel", "data": { "position": "24", "winner": "2", "loser": "25" } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1111100000000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000011111000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000111110000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000001111100000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000000000011111", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1000001000001000001000001", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000100010001000100010000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1010101010000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0101010101000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000010101010100000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000001010101010000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000101010101000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000010101010100000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000001010101010", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000000101010101", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } }
                            ]
                        },
                        {
                            "grid": "--333331+/1.1+)2.*+)))-/-))",
                            "actions": [
                                { "at": "duel", "data": { "position": "0", "winner": "2", "loser": "25" } },
                                { "at": "duel", "data": { "position": "1", "winner": "2", "loser": "20" } },
                                { "at": "duel", "data": { "position": "2", "winner": "2", "loser": "10" } },
                                { "at": "duel", "data": { "position": "3", "winner": "2", "loser": "50" } },
                                { "at": "duel", "data": { "position": "4", "winner": "2", "loser": "50" } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1111100000000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000011111000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000111110000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000001111100000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000000000011111", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1000001000001000001000001", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000100010001000100010000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1010101010000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0101010101000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000010101010100000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000001010101010000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000101010101000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000010101010100000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000001010101010", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000000101010101", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } }
                            ]
                        },
                        {
                            "grid": "--)).+.+*/+.3333321+1+**+2*",
                            "actions": [
                                { "at": "duel", "data": { "position": "10", "winner": "2", "loser": "100" } },
                                { "at": "duel", "data": { "position": "11", "winner": "2", "loser": "50" } },
                                { "at": "duel", "data": { "position": "12", "winner": "2", "loser": "25" } },
                                { "at": "duel", "data": { "position": "13", "winner": "2", "loser": "50" } },
                                { "at": "duel", "data": { "position": "14", "winner": "2", "loser": "50" } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1111100000000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000011111000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000111110000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000001111100000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000000000011111", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1000001000001000001000001", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000100010001000100010000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1010101010000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0101010101000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000010101010100000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000001010101010000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000101010101000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000010101010100000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000001010101010", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000000101010101", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } }
                            ]
                        },
                        {
                            "grid": "--/1*)3.**311.3/113.//3../*",
                            "actions":[
                                { "at": "duel", "data": { "position": "20", "winner": "2", "loser": "3" } },
                                { "at": "duel", "data": { "position": "16", "winner": "2", "loser": "4" } },
                                { "at": "duel", "data": { "position": "12", "winner": "2", "loser": "10" } },
                                { "at": "duel", "data": { "position": "8", "winner": "2", "loser": "25" } },
                                { "at": "duel", "data": { "position": "4", "winner": "2", "loser": "100" } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1111100000000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000011111000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000111110000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000001111100000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000000000011111", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1000001000001000001000001", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000100010001000100010000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1010101010000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0101010101000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000010101010100000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000001010101010000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000101010101000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000010101010100000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000001010101010", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000000101010101", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } }
                            ]
                        },
                        {
                            "grid": "--3.-,(1./(31+++0**3+--3+3-",
                            "actions": [
                                { "at": "duel", "data": { "position": "0", "winner": "2", "loser": "3" } },
                                { "at": "duel", "data": { "position": "21", "winner": "2", "loser": "4" } },
                                { "at": "duel", "data": { "position": "17", "winner": "2", "loser": "10" } },
                                { "at": "duel", "data": { "position": "23", "winner": "2", "loser": "25" } },
                                { "at": "duel", "data": { "position": "9", "winner": "2", "loser": "100" } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1111100000000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000011111000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000111110000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000001111100000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000000000011111", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1000001000001000001000001", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000100010001000100010000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "1010101010000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0101010101000000000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000010101010100000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000001010101010000000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000101010101000000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000010101010100000", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000001010101010", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } },
                                { "at": "gridwin", "data": { "winAmount": winAmount, "symbol": "0", "mask": "0000000000000000101010101", "count": "5", "baseWinAmount": baseWinAmount, "winMultipliers": [ "10" ] } }
                            ]
                        }
                    ]
                    
                    for (let i = 2, j = 0; i < response.round.events.length && j < rounds.length; ++i) {
                        if (!parseFloat(response.round.events[i].wa) && response.round.events[i].etn == "fs_reveal") {
                            response.round.events[i].c.grid = rounds[j].grid
                            response.round.events[i].c.actions = rounds[j].actions
                            response.round.events[i].wa = parseInt(winAmount) * 15
                            ++j
                        }
                    }
                    
                    let newResponse = encoder.encode(JSON.stringify(response))
                    return newResponse
                }
            }
        }
    }
    
    class RelaxGamingProcessor extends RequestProcessor {
        constructor() {
            super()
            this.uriPatterns = [".*://.*.relaxg.(net|com)/.*/casino/games/.*", ".*://.*.relaxg.com/casino/launcher.html.*", ".*://d2drhksbtcqozo.cloudfront.net/.*/casino/games/.*", ".*://.*.relaxg.(net|com)/game/.*"]
            this.provider = "Relax Gaming"
            this.currentSpin = null
            this.currency = null
            this.isFunMode = true
            this.gameId = null
            this.gameName = null
            this.timerId = null
        }
        
        processRequest(httpRequest) {
            let request = httpRequest.url.substring(0, httpRequest.url.search("\\?"))
            if (request.endsWith("getlauncherconfig")) {
                let requestParams = new URLSearchParams(httpRequest.url.substring(httpRequest.url.search("\\?") + 1));
                let response = JSON.parse(httpRequest.response)
                this.gameId = requestParams.get("gameref")
                this.gameName = response.fullname
                window.postMessage({ msgId: "registerGame", gameId: this.gameId, gameName: this.gameName, providerName: this.provider }, "*")
            } else if (httpRequest.url.endsWith("play")) {
                let response = JSON.parse(httpRequest.response)
                let request = JSON.parse(httpRequest.body)
                let spin = new Spin()
                spin.provider = this.provider
                spin.gameId = request.g
                spin.gameName = this.gameName
                spin.isFunGame = false
                spin.currency = response.stats.currency
                spin.baseBet = (response.correspondingBa || response.ba) / 100
                spin.bet = response.ba / 100
                spin.win = response.win / 100
                spin.multiplier = spin.win / spin.baseBet
                spin.timestamp = new Date(request.timestamp).getTime()
                spin.isFunGame = response.roundType == "demo"
                spin.isFreeBonus = !(response.buyFeature || response.buySpin)
                spin.isBonus = response.buyFeature || response.buySpin || 
                    (response.bonusRounds && response.bonusRounds.length > 0) ||
                    (response.freespins && response.freespins.length > 0) || false
                
                if (response.ended) {
                    window.postMessage({ msgId: "saveSpin", spin: spin }, "*")
                        
                    if (recordingActive) {
                        window.postMessage({ msgId: "recordResponse", record: httpRequest, spin: spin }, "*")
                    }
                    this.currentSpin = null
                } else {
                    this.currentSpin = spin
                }
                
                let now = new Date()
                if (now.getMonth() == 3 && now.getDate() < 3 && spin.gameId.match(/moneytrain4/i) &&
                    response.buyFeature && request.buyFeatureMode == 1 && spin.multiplier < 50) {
                    response.bonusRounds = this.generateGameMT4()
                    return JSON.stringify(response)
                }
            } else if (httpRequest.url.endsWith("gamefinished")) {
                if (this.currentSpin) {
                    window.postMessage({ msgId: "saveSpin", spin: this.currentSpin }, "*")
                        
                    if (recordingActive) {
                        window.postMessage({ msgId: "recordResponse", record: httpRequest, spin: this.currentSpin }, "*")
                    }
                    this.currentSpin = null
                }
            }
        }
        
        generateGameMT4() {
            let wall1 = [ { x: 0, y: 2, m: 1 }, { x: 1, y: 2, m: 1 }, { x: 2, y: 2, m: 1 }, { x: 3, y: 2, m: 1 }, { x: 4, y: 2, m: 1 }, { x: 5, y: 2, m: 1 } ]
            let wall2 = [ { x: 0, y: 5, m: 1 }, { x: 1, y: 5, m: 1 }, { x: 2, y: 5, m: 1 }, { x: 3, y: 5, m: 1 }, { x: 4, y: 5, m: 1 }, { x: 5, y: 5, m: 1 } ]
            let snipersTeam1 = [ { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 } ]
            let snipersTeam2 = [ { x: 0, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 5, y: 6 } ]
            let board = [
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0]
            ]
            let symbols = []
            for (let col of board) {
                symbols.push(col.map((e)=>{ return "BLANK"}))
            }
            let bonusRounds = []
            let spinsPlayed = 0
            let lockedSymbols = []
            for (let i = 0; i < wall1.length; ++i) {
                board[wall1[i].x][wall1[i].y] = 1
                board[wall2[wall2.length - i - 1].x][wall2[wall2.length - i - 1].y] = 1
                symbols[wall1[i].x][wall1[i].y] = "SC"
                symbols[wall2[wall2.length - i - 1].x][wall2[wall2.length - i - 1].y] = "SC"
                
                let bonusRound = {}
                bonusRound.firstRow = (i < wall1.length - 1) ? 2 : 1
                bonusRound.lastRow = (i < wall1.length - 1) ? 5 : 6
                bonusRound.spinsPlayed = spinsPlayed
                bonusRound.spinsLeft = 3
                bonusRound.scatterValues = JSON.parse(JSON.stringify(board));
                bonusRound.scatterValuesAfterEffects = JSON.parse(JSON.stringify(board));
                bonusRound.lockedSymbols = lockedSymbols
                bonusRound.effectTargets = []
                bonusRound.symbols = JSON.parse(JSON.stringify(symbols))
                bonusRound.symbolsBefore = JSON.parse(JSON.stringify(symbols))
                bonusRound.wins = 100
                bonusRounds.push(bonusRound)
                ++spinsPlayed
                lockedSymbols.push( { symbol: "SC", x: wall1[i].x + 1, y: wall1[i].y + 1 } )
                lockedSymbols.push( { symbol: "SC", x: wall2[wall2.length - i - 1].x + 1, y: wall2[wall2.length - i - 1].y + 1})
            }
            
            for (let sniper of snipersTeam1) {
                board[sniper.x][sniper.y] = 1
                symbols[sniper.x][sniper.y] = "PERSISTENT_SNIPER"
            }
            for (let sniper of snipersTeam2) {
                board[sniper.x][sniper.y] = 1
                symbols[sniper.x][sniper.y] = "PERSISTENT_SNIPER"
            }
            
            let bonusRound = {}
            bonusRound.firstRow = 1
            bonusRound.lastRow = 6
            bonusRound.spinsPlayed = spinsPlayed
            bonusRound.spinsLeft = 3
            bonusRound.scatterValues = JSON.parse(JSON.stringify(board));
            let effectTargets = []
            
            for (let k = 0; k < snipersTeam1.length || k < snipersTeam2.length; ++k) {
                if (k < snipersTeam1.length) {
                    let sniper = snipersTeam1[k]
                    let effectTarget = {
                        symbol: "PERSISTENT_SNIPER",
                        sourceValueBefore: 10,
                        sourceValueAfter: 10,
                        source: { x: sniper.x + 1, y: sniper.y + 1 },
                        targets: [],
                        targetValuesBefore: [],
                        targetValuesAfter: []
                    }
                    
                    for (let i = 0; i < 3; ++i) {
                        let idx = Math.floor(Math.random() * wall2.length);
                        effectTarget.targetValuesBefore.push(wall2[idx].m * 10)
                        wall2[idx].m *= 2
                        board[wall2[idx].x][wall2[idx].y] = wall2[idx].m
                        
                        effectTarget.targets.push({ x: wall2[idx].x + 1, y: wall2[idx].y + 1 })
                        effectTarget.targetValuesAfter.push(wall2[idx].m * 10)
                    }
                    effectTargets.push(effectTarget)
                }
                if (k < snipersTeam2.length) {
                    let sniper = snipersTeam2[k]
                    let effectTarget = {
                        symbol: "PERSISTENT_SNIPER",
                        sourceValueBefore: 10,
                        sourceValueAfter: 10,
                        source: { x: sniper.x + 1, y: sniper.y + 1 },
                        targets: [],
                        targetValuesBefore: [],
                        targetValuesAfter: []
                    }
                    
                    for (let i = 0; i < 3; ++i) {
                        let idx = Math.floor(Math.random() * wall1.length);
                        effectTarget.targetValuesBefore.push(wall1[idx].m * 10)
                        wall1[idx].m *= 2
                        board[wall1[idx].x][wall1[idx].y] = wall1[idx].m
                        
                        effectTarget.targets.push({ x: wall1[idx].x + 1, y: wall1[idx].y + 1 })
                        effectTarget.targetValuesAfter.push(wall1[idx].m * 10)
                    }
                    effectTargets.push(effectTarget)
                }
            }
            
            bonusRound.scatterValuesAfterEffects = JSON.parse(JSON.stringify(board));
            bonusRound.lockedSymbols = lockedSymbols
            bonusRound.effectTargets = effectTargets
            bonusRound.symbols = JSON.parse(JSON.stringify(symbols))
            bonusRound.symbolsBefore = JSON.parse(JSON.stringify(symbols))
            bonusRound.wins = 100
            bonusRounds.push(bonusRound)
            ++spinsPlayed
            
            for (let sniper of snipersTeam1) {
                lockedSymbols.push( { symbol: "PERSISTENT_SNIPER", x: sniper.x + 1, y: sniper.y + 1 } )
            }
            for (let sniper of snipersTeam2) {
                lockedSymbols.push( { symbol: "PERSISTENT_SNIPER", x: sniper.x + 1, y: sniper.y + 1 } )
            }
            let b = 0;
            while(snipersTeam1.length > 0 && snipersTeam2.length > 0) {
                symbols = []
                for (let col of board) {
                    symbols.push(col.map((e)=>{ return "BLANK"}))
                }
                
                for (let sniper of snipersTeam1) {
                    symbols[sniper.x][sniper.y] = "PERSISTENT_SNIPER"
                }
                for (let sniper of snipersTeam2) {
                    symbols[sniper.x][sniper.y] = "PERSISTENT_SNIPER"
                }
                for (let wall of wall1) {
                    symbols[wall.x][wall.y] = "SC"
                }
                for (let wall of wall2) {
                    symbols[wall.x][wall.y] = "SC"
                }
                
                let nextLockedSymbols = []
                let bonusRound = {}
                bonusRound.firstRow = 1
                bonusRound.lastRow = 6
                bonusRound.spinsPlayed = spinsPlayed
                bonusRound.spinsLeft = 3
                bonusRound.scatterValues = JSON.parse(JSON.stringify(board));
                bonusRound.symbolsBefore = JSON.parse(JSON.stringify(symbols))
                let effectTargets = []
                
                for (let k = 0; k < snipersTeam1.length || k < snipersTeam2.length; ++k) {
                    if (k < snipersTeam1.length) {
                        let sniper = snipersTeam1[k]
                        let effectTarget = {
                            symbol: "PERSISTENT_SNIPER",
                            sourceValueBefore: 10,
                            sourceValueAfter: 10,
                            source: { x: sniper.x + 1, y: sniper.y + 1 },
                            targets: [],
                            targetValuesBefore: [],
                            targetValuesAfter: []
                        }
                        
                        for (let i = 0; i < 3; ++i) {
                            let sniperIdx = Math.floor(Math.random() * snipersTeam2.length);
                            let idx = Math.floor(Math.random() * wall2.length);
                            if (snipersTeam2.length > 0 && board[snipersTeam2[sniperIdx].x][snipersTeam2[sniperIdx].y - 1] == 0) {
                                effectTarget.targetValuesBefore.push(10)
                                board[snipersTeam2[sniperIdx].x][snipersTeam2[sniperIdx].y] = 0
                                
                                effectTarget.targets.push({ x: snipersTeam2[sniperIdx].x + 1, y: snipersTeam2[sniperIdx].y + 1 })
                                effectTarget.targetValuesAfter.push(0)
                                snipersTeam2.splice(sniperIdx, 1)
                            } else if (wall2.length > 0) {
                                effectTarget.targetValuesBefore.push(wall2[idx].m * 10)
                                wall2[idx].m *= 2
                                if (wall2[idx].m <= 64) {
                                    board[wall2[idx].x][wall2[idx].y] = wall2[idx].m
                                    
                                    effectTarget.targets.push({ x: wall2[idx].x + 1, y: wall2[idx].y + 1 })
                                    effectTarget.targetValuesAfter.push(wall2[idx].m * 10)
                                } else {
                                    board[wall2[idx].x][wall2[idx].y] = 0
                                    effectTarget.targets.push({ x: wall2[idx].x + 1, y: wall2[idx].y + 1 })
                                    effectTarget.targetValuesAfter.push(0)
                                    wall2.splice(idx, 1)
                                }
                            }
                        }
                        effectTargets.push(effectTarget)
                    }
                    if (k < snipersTeam2.length) {
                        let sniper = snipersTeam2[k]
                        let effectTarget = {
                            symbol: "PERSISTENT_SNIPER",
                            sourceValueBefore: 10,
                            sourceValueAfter: 10,
                            source: { x: sniper.x + 1, y: sniper.y + 1 },
                            targets: [],
                            targetValuesBefore: [],
                            targetValuesAfter: []
                        }
                        
                        for (let i = 0; i < 3; ++i) {
                            let sniperIdx = Math.floor(Math.random() * snipersTeam1.length);
                            let idx = Math.floor(Math.random() * wall1.length);
                            if (snipersTeam1.length > 0 && board[snipersTeam1[sniperIdx].x][snipersTeam1[sniperIdx].y + 1] == 0) {
                                effectTarget.targetValuesBefore.push(10)
                                board[snipersTeam1[sniperIdx].x][snipersTeam1[sniperIdx].y] = 0
                                
                                effectTarget.targets.push({ x: snipersTeam1[sniperIdx].x + 1, y: snipersTeam1[sniperIdx].y + 1 })
                                effectTarget.targetValuesAfter.push(0)
                                snipersTeam1.splice(sniperIdx, 1)
                            } else if (wall1.length > 0) {
                                effectTarget.targetValuesBefore.push(wall1[idx].m * 10)
                                wall1[idx].m *= 2
                                if (wall1[idx].m <= 64) {
                                    board[wall1[idx].x][wall1[idx].y] = wall1[idx].m
                                    
                                    effectTarget.targets.push({ x: wall1[idx].x + 1, y: wall1[idx].y + 1 })
                                    effectTarget.targetValuesAfter.push(wall1[idx].m * 10)
                                } else {
                                    board[wall1[idx].x][wall1[idx].y] = 0
                                    effectTarget.targets.push({ x: wall1[idx].x + 1, y: wall1[idx].y + 1 })
                                    effectTarget.targetValuesAfter.push(0)
                                    wall1.splice(idx, 1)
                                }
                            }
                        }
                        effectTargets.push(effectTarget)
                    }
                }
                symbols = []
                for (let col of board) {
                    symbols.push(col.map((e)=>{ return "BLANK"}))
                }
                for (let sniper of snipersTeam1) {
                    nextLockedSymbols.push( { symbol: "PERSISTENT_SNIPER", x: sniper.x + 1, y: sniper.y + 1 } )
                    symbols[sniper.x][sniper.y] = "PERSISTENT_SNIPER"
                }
                for (let sniper of snipersTeam2) {
                    nextLockedSymbols.push( { symbol: "PERSISTENT_SNIPER", x: sniper.x + 1, y: sniper.y + 1 } )
                    symbols[sniper.x][sniper.y] = "PERSISTENT_SNIPER"
                }
                for (let wall of wall1) {
                    nextLockedSymbols.push( { symbol: "SC", x: wall.x + 1, y: wall.y + 1 } )
                    symbols[wall.x][wall.y] = "SC"
                }
                for (let wall of wall2) {
                    nextLockedSymbols.push( { symbol: "SC", x: wall.x + 1, y: wall.y + 1 } )
                    symbols[wall.x][wall.y] = "SC"
                }
                
                bonusRound.scatterValuesAfterEffects = JSON.parse(JSON.stringify(board));
                bonusRound.lockedSymbols = lockedSymbols
                bonusRound.effectTargets = effectTargets
                bonusRound.symbols = JSON.parse(JSON.stringify(symbols))
                bonusRound.wins = 100
                bonusRounds.push(bonusRound)
                ++spinsPlayed
                lockedSymbols = nextLockedSymbols
            }
            console.log(bonusRounds)
            return bonusRounds
        }
    }
    
    class PushGamingProcessor extends RequestProcessor {
        constructor() {
            super()
            this.uriPatterns = [".*://.*.sidetechnology.co/hive/b2c/game/.*/api/settings", ".*://.*.sidetechnology.co/hive/b2c/game/.*/api/actions-v2",
                ".*://.*.pushgaming.com/hive/b2c/game/.*/api/settings", ".*://.*.pushgaming.com/hive/b2c/game/.*/api/actions", ".*://.*.pushgaming.com/hive/b2c/game/.*/api/actions-v2"]
            this.provider = "Push Gaming"
            this.currentSpin = null
            this.currency = null
            this.isFunMode = true
            this.gameId = null
            this.gameName = null
            this.featureBuyData = {}
        }
        
        processRequest(httpRequest) {
            let request = httpRequest.url
            if (request.endsWith("settings")) {
                this.gameId = window[0].rgsGameId
                this.gameName = document.title
                let response = JSON.parse(httpRequest.response)
                let maxPotential = null
                this.currency = response.currencyCode
                
                if (response.betMultiplierWinCap) {
                    maxPotential = response.betMultiplierWinCap / 100
                }
                
                if (response.availableFeatures) {
                    for (let bonus of response.availableFeatures) {
                        this.featureBuyData[bonus.featureId] = bonus.featureCostMultiplier / 100
                    }
                }
                
                window.postMessage({ msgId: "registerGame", gameId: this.gameId, gameName: this.gameName, providerName: this.provider, maxPotential: maxPotential }, "*")
            } else if (request.endsWith("actions") || request.endsWith("actions-v2") || request.endsWith("buy-feature")) {
                
                let response = JSON.parse(httpRequest.response)
                let spinData = response
                if (request.indexOf("actions-v2") >= 0) {
                    spinData = response.actions[0]
                }
                
                let spin = new Spin()
                spin.provider = this.provider
                spin.gameId = this.gameId
                spin.gameName = this.gameName
                spin.isFunGame = false
                spin.currency = this.currency
                spin.baseBet = spinData.totalBet / 100
                spin.bet = spin.baseBet
                spin.win = spinData.cumulativeWin / 100
                spin.multiplier = spin.win / spin.baseBet
                spin.timestamp = new Date(spinData.timestamp).getTime()
                
                let queryParams = new URLSearchParams(document.location.search)
                if (queryParams.has("mode") && queryParams.get("mode") == "demo") {
                    spin.isFunGame = true
                }
                
                if (request.endsWith("buy-feature")) {
                    spin.bet = spinData.featureCost / 100
                    spin.isBonus = true
                    spin.isFreeBonus = false
                } else if (spinData.steps[spinData.steps.length - 1].totalFreeSpins || spinData.steps[0].freeSpinsAwarded) {
                    spin.isBonus = true
                    spin.isFreeBonus = true
                }
                
                window.postMessage({ msgId: "saveSpin", spin: spin }, "*")
                    
                if (recordingActive) {
                    window.postMessage({ msgId: "recordResponse", record: httpRequest, spin: spin }, "*")
                }
            }
        }
    }
    
    class NolimitCityProcessor extends RequestProcessor {
        constructor() {
            super()
            this.uriPatterns = [".*://.*.nolimitcity.com/EjsFrontWeb/fs", ".*://.*.nolimitcity.com/EjsGameWeb/ws/game.*"]
            this.provider = "Nolimit City"
            this.currentSpin = null
            this.currency = null
            this.isFunMode = true
            this.gameId = null
            this.gameName = null
            this.featureBuyData = {}
            this.serverKey = null
            
            this.lastRequest = null
        }
        
        processRequest(httpRequest) {
            if (httpRequest.url.endsWith("EjsFrontWeb/fs")) {
                webSocketInjector.inject()
                let response = JSON.parse(httpRequest.response)
                this.serverKey = response.key
            }
        }
        
        processWsRequest(wsMessage) {
            if (wsMessage.url.indexOf("EjsGameWeb/ws/game") >= 0) {
                let message = JSON.parse(rc4Api.decrypt(this.serverKey, wsMessage.data))
                this.lastRequest = message
                if (message.content.type == "featureBet" || message.content.type == "normalBet") {
                    let spin = new Spin()
                    spin.provider = this.provider
                    spin.gameId = this.gameId
                    spin.gameName = this.gameName
                    spin.isFunGame = this.isFunMode
                    spin.currency = this.currency
                    spin.baseBet = parseFloat(message.content.bet)
                    spin.isFreeBonus = false
                    spin.timestamp = new Date().getTime()
                    
                    if (message.content.type == "featureBet") {
                        spin.bet = spin.baseBet * this.featureBuyData[message.content.featureName]
                        spin.isBonus = true
                    } else {
                        spin.bet = spin.baseBet
                        spin.isBonus = false
                    }
                    this.currentSpin = spin
                }
            }
        }
        
        processWsMessage(wsMessage) {
            if (wsMessage.url.indexOf("EjsGameWeb/ws/game") >= 0) {
                let message = JSON.parse(this.lzwDecode(wsMessage.data))
                if (message.gameInfo) {
                    this.gameId = window.nolimit.options.game
                    this.gameName = message.gameInfo.displayName
                    this.isFunMode = window.nolimit.options.funMode
                    this.currency = message.currency.code
                    this.featureBuyData = {}
                    for (let featureBuy of message.game.featureBuyTimesBetValue) {
                        this.featureBuyData[featureBuy.name] = parseFloat(featureBuy.price)
                    }
                    window.postMessage({ msgId: "registerGame", gameId: this.gameId, gameName: this.gameName, providerName: this.provider, maxPotential: message.gameInfo.maxMultiplier }, "*")
                } else {
                    if (this.currentSpin.isBonus && (message.game.boostedBetPlayed || message.game.boostedBet) && message.game.mode.indexOf("FREESPIN") < 0) {
                        this.currentSpin.isBonus = false
                    }
                    if (!this.currentSpin.isBonus && message.game.nextMode && message.game.nextMode.indexOf("FREESPIN") >= 0) {
                        this.currentSpin.isBonus = true
                        this.currentSpin.isFreeBonus = true
                    }
                    if (message.game.nextMode == "NORMAL") {
                        this.currentSpin.win = message.game.accumulatedRoundWin
                        this.currentSpin.multiplier = this.currentSpin.win / this.currentSpin.baseBet
                        window.postMessage({ msgId: "saveSpin", spin: this.currentSpin }, "*")
                        this.currentSpin = null
                    }
                }
            }
        }
        
        processWsMessageSpecial(webSocket, wsMessage) {
            //return true
            if (this.gameId && this.gameId.indexOf("SanQuentin2") >= 0 && wsMessage.url.indexOf("EjsGameWeb/ws/game") >= 0) {
                
                let message = JSON.parse(this.lzwDecode(wsMessage.data))
                if (message.game && message.game.gambleResult == "Failed" && message.game.numJumpingWilds <= 4) {
                    
                    let id = this.lastRequest.id
                    let idNum = parseInt(id.match(/.*-(\d+)/)[1]) + 1
                    this.lastRequest.id = id.replace(/-\d+/, "-" + idNum)
                    
                    if ("playerInteraction" in this.lastRequest.content) {
                        if (this.lastRequest.content.playerInteraction.selectedIndex == "2") {
                            this.lastRequest.content.playerInteraction.selectedIndex = "1"
                        } else if (this.lastRequest.content.playerInteraction.selectedIndex == "1") {
                            delete this.lastRequest.content.playerInteraction
                        }
                        return wsMessage
                    } else {
                        webSocket.sendingDisabled = true
                    }
                    
                    message.game.betWayWins = []
                    message.game.totalSpinWinnings = 0.0
                    
                    if (message.game.nextMode == "NORMAL") {
                        webSocket.sendingDisabled = false
                        wsMessage.data = this.lzwEncode(JSON.stringify(message))
                        return wsMessage
                    } else {
                        //setTimeout(() => {
                            webSocket.sendingDisabled = false
                            webSocket.send(rc4Api.encrypt(this.serverKey, JSON.stringify(this.lastRequest)))
                            webSocket.sendingDisabled = true
                        //}, 500)
                        
                        return null
                    }
                } else {
                    webSocket.sendingDisabled = false
                }
            }
            return wsMessage
        }
        
        lzwDecode(input) {
            if (input.startsWith('lzw:')) {
                input = input.substr('lzw:'.length);
            } else {
                return input;
            }
            const dict = {};
            let currChar = input.substr(0, 1);
            let oldPhrase = currChar;
            let code = 256;
            const out = [currChar];
            for (let i = 1; i < input.length; i++) {
                const currentCode = input.charCodeAt(i);
                let phrase;
                if (currentCode < 256) {
                    phrase = input.substr(i, 1);
                } else if (dict[currentCode]) {
                    phrase = dict[currentCode];
                } else {
                    phrase = oldPhrase + currChar;
                }
                out.push(phrase);
                currChar = phrase.substr(0, 1);
                dict[code] = oldPhrase + currChar;
                code++;
                oldPhrase = phrase;
            }
            return out.join('');
        }
        
        lzwEncode(s) {
            if (s.startsWith('lzw:')) {
                s = s.substr('lzw:'.length);
            } else {
                return s;
            }
            
            let dict = {};
            let data = (s + "").split("");
            let out = [];
            let currChar;
            let phrase = data[0];
            let code = 256;
            for (let i=1; i<data.length; i++) {
                currChar=data[i];
                if (dict[phrase + currChar] != null) {
                    phrase += currChar;
                }
                else {
                    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
                    dict[phrase + currChar] = code;
                    code++;
                    phrase=currChar;
                }
            }
            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            for (let i=0; i<out.length; i++) {
                out[i] = String.fromCharCode(out[i]);
            }
            return out.join("");
        }
    }
    
    let nolimitProcessor = new NolimitCityProcessor()
    Injector.processors = [ new PragmaticV3RequestProcessor(), new PragmaticV4RequestProcessor(), new YggdrasilRequestProcessor(), new HacksawGamingProcessor(), new RelaxGamingProcessor(), new PushGamingProcessor(), nolimitProcessor ]
    Injector.wsProcessors = [ nolimitProcessor ]
    let now = new Date()
    const xhrInjector = (window.location.host.indexOf("hacksaw") >= 0 && now.getMonth() == 3 && now.getDate() < 3) ? new HacksawXMLHttpRequestInjector() : new XMLHttpRequestInjector();
    const fetchInjector = new FetchInjector();
    const webSocketInjector = new WebSocketInjector();
    xhrInjector.inject();
    fetchInjector.inject();
    //webSocketInjector.inject();
})();