"use strict";

var recordingActive

(() => {
    recordingActive = true
    class HttpRequest {
        constructor(data) {
            this.method = data.method;
            this.url = data.url;
            this.headers = data.headers;
            this.body = data.body;
            this.response = data.response;
        }
    }
    
    class Injector {
        inject() { }
        
        notifyWatchers(httpRequest) {
            for (let processor of Injector.processors) {
                if (processor.isValidProcessor(httpRequest)) {
                    processor.processRequest(httpRequest)
                }
            }
        }
    }
    Injector.processors = []
    
    class XMLHttpRequestInjector extends Injector {
        inject() {
            const xhr = window.XMLHttpRequest;
            const processRequest = e => {
                    //this.handleXhrLoad(e)
                    const request = new HttpRequest(e);
                    this.notifyWatchers(request);
                };
            
            class XMLHttpRequestWrapper {
                constructor() {
                    const obj = this;
                    this.listeners = {};
                    this.headers = {};
                    this.wrappedObj = new xhr;
                    let events = ["readyState", "response", "responseText", "responseType", "responseURL", "responseXML", "status", "statusText", "timeout", "upload", "withCredentials"];
                    events.forEach((e => {
                        Object.defineProperty(this, e, {
                            get: function() {
                                return this.wrappedObj[e]
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
                            processRequest(this)
                        }
                        this.onreadystatechange && this.onreadystatechange.apply(this, arguments)
                    }.bind(this);
                    this.wrappedObj.onload = function() {
                        if (!this.loaded) {
                            this.loaded = true
                            processRequest(this)
                        }
                        this.onload && this.onload.apply(this, arguments)
                    }.bind(this);
                }
                open(e, t, r, n, s) {
                    this.method = e, this.url = t, this.headers = {}, this.body = null, this.loaded = false, this.wrappedObj.open.apply(this.wrappedObj, arguments)
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
                    return this.body = e, this.wrappedObj.send.apply(this.wrappedObj, arguments)
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
            window.XMLHttpRequest = XMLHttpRequestWrapper
        }
    }
    
    class FetchInjector extends Injector {
        inject() {
            const origFetch = window.fetch;
            window.fetch = (url, data) => new Promise(((resolve, reject) => {
                origFetch(url, data).then((result => {
                    result.text().then((text => {
                        if (!data) {
                            data = {};
                        }
                        const response = new Response(text, result);
                        resolve(response);
                        let method = data.method ? data.method : "GET";
                        let headers = data.headers ? data.headers : {};
                        const request = new HttpRequest({
                            method: method,
                            url: url,
                            headers: headers,
                            body: data.body,
                            response: text
                        });
                        this.notifyWatchers(request)
                    })).catch((err => { reject(err) }))
                })).catch((err => { reject(err) }))
            }))
        }
    }
    
    class Spin {
        constructor() {
            this.provider = "unknown"
            this.gameId = "unknown"
            this.gameName = "unknown"
            this.bet = 0
            this.win = 0
            this.multiplier = 0
            this.isFunGame = false
            this.isBonus = false
            this.noOfFreeSpins = 0
            this.isFreeBonus = false
            this.timestamp = null
            this.currency = ""
            this.bonusPrice = 0
        }
    }
    
    class RequestProcessor {
        
        constructor() {
            this.uriPatterns = []
        }
        
        isValidProcessor(httpRequest) {
            for (let pattern of this.uriPatterns) {
                //console.log("pattern: " + pattern + ", url: " + httpRequest.url)
                if (httpRequest.url.match(pattern)) {
                    //console.log("match")
                    return true;
                }
            }
            return false;
        }
        
        processRequest(httpRequest) {
        }
    }
    
    class YggdrasilRequestProcessor extends RequestProcessor {
        constructor() {
            super()
            this.uriPatterns = [".*://.*.yggdrasilgaming.com/slots/.*/.*", ".*://.*.yggdrasilgaming.com/app/.*/.*", ".*://.*.yggdrasilgaming.com/init/launchClient.html.*", ".*://.*.yggdrasilgaming.com/game.web/service.*"]
            this.provider = "yggdrasil"
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
        
        isBonus(spinInfo, requestParams, gameInfo) {
            let cmd = requestParams.get("cmd")
            if (gameInfo && cmd in gameInfo) {
                return true
            } else if (cmd == "freespin") {
                return true
            } else if (spinInfo.eventdata.response != null && spinInfo.eventdata.response.clientData != null && 
                ('freeSpinsAwarded' in spinInfo.eventdata.response.clientData ||
                ('bonusTriggered' in spinInfo.eventdata.response.clientData && spinInfo.eventdata.response.clientData.bonusTriggered)))
            {
                return true
            } else {
                return false
            }
        }
        
        getNumberOfFreeSpins(spinInfo) {
            if ('freeSpinsAwarded' in spinInfo.eventdata.response.clientData) {
                return parseInt(spinInfo.eventdata.response.clientData.freeSpinsAwarded)
            } else if ('playerState' in spinInfo.eventdata && 'freespinsRemaining' in spinInfo.eventdata.playerState) {
                return parseInt(spinInfo.eventdata.playerState.freespinsRemaining)
            } else {
                return 0
            }
        }
        
        processRequest(httpRequest) {
            let postParams = window._POST_PARAMS_
            let response = JSON.parse(httpRequest.response)
            
            if (response.data && response.data.wager && response.data.wager.bets) {
                let requestParams = new URLSearchParams(httpRequest.body);
                let gameId = postParams.gameid
                let gameInfo = yggdrasilSlots[gameId]
                let spinInfo = response.data.wager.bets[0]
                let isBonus = this.isBonus(spinInfo, requestParams, gameInfo)
                let isFinished = response.data.wager.status.match(/finished/i) != null
                let spin = new Spin()
                let spinToBeSaved = null
                let gameName = gameInfo ? gameInfo["name"] : gameId
                
                spin.provider = this.provider
                spin.gameId = gameId
                spin.gameName = gameName
                spin.isBonus = isBonus
                spin.isFunGame = !("key" in postParams && postParams.key != "")
                spin.currency = spinInfo.betcurrency
                
                if (spinInfo.step == 1) {
                    spin.bet = parseFloat(spinInfo.betamount)
                    this.currentSpin = spin
                }
                
                if (isBonus || (this.currentSpin && this.currentSpin.isBonus)) {
                    if (spinInfo.step == 1) {
                        let price = parseFloat(spinInfo.betamount)
                        let multiplier = gameInfo ? gameInfo[requestParams.get("cmd")] : 1
                        let isFreeBonus = this.isBoughtBonus(requestParams, gameInfo) == false
                        this.currentSpin.bet = price / multiplier
                        this.currentSpin.bonusPrice = isFreeBonus ? 0 : price
                        this.currentSpin.noOfFreeSpins = this.getNumberOfFreeSpins(spinInfo)
                        this.currentSpin.isFreeBonus = isFreeBonus
                    }
                    if (isFinished) {
                        this.currentSpin.timestamp = response.data.wager.timestamp
                        this.currentSpin.win = parseFloat(spinInfo.wonamount)
                        this.currentSpin.multiplier = this.currentSpin.win / this.currentSpin.bet
                        spinToBeSaved = this.currentSpin
                        this.currentSpin = null
                    }
                } else if (isFinished) {
                    this.currentSpin.win = parseFloat(spinInfo.wonamount)
                    this.currentSpin.multiplier = this.currentSpin.win / this.currentSpin.bet
                    this.currentSpin.timestamp = response.data.wager.timestamp
                    spinToBeSaved = this.currentSpin
                    this.currentSpin = null
                }
                
                if (spinToBeSaved) {
                    window.postMessage({ msgId: "saveSpin", spin: spinToBeSaved }, "*")
                }
                    
                if (recordingActive) {
                    window.postMessage({ msgId: "recordResponse", record: null, spin: spinToBeSaved }, "*")
                }
            }
        }
    }
    
    class PragmaticRequestProcessor extends RequestProcessor {
        
        constructor() {
            super()
            this.provider = "pragmatic"
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
            let gameName = gameInfo ? gameInfo["name"] : gameId
            let spinToBeSaved = null
            
            if (action == "doInit") {
                window.postMessage({ msgId: "registerGame", gameId: gameId, gameName: gameName, providerId: this.provider }, "*")
            } else if (action == "doSpin" || action == "doBonus") {
                let isBonus = params.has("fsmul") || params.has("fs_total") || params.has("rsb_c")
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
                spin.timestamp = params.get("stime")
                spin.currency = window.UHT_GAME_CONFIG ? window.UHT_GAME_CONFIG.CURRENCY : ""
                spin.gameName = gameName
                
                if (params.has("c") && params.has("l")) {
                    spin.bet = parseFloat(params.get("c")) * parseFloat(params.get("l"))
                    this.lastBet = spin.bet
                } else if (this.lastBet) {
                    spin.bet = this.lastBet
                }
                
                if (isBonus || (this.currentSpin && this.currentSpin.isBonus)) {
                    if (!this.currentSpin) {
                        this.currentSpin = spin
                    }
                    if (params.has("fs_total") || (params.has("rsb_m") && params.has("rsb_c") && parseInt(params.get("rsb_m")) == parseInt(params.get("rsb_c")))) {
                        this.currentSpin.win = totalWin
                        if (params.has("fs_total")) {
                            this.currentSpin.noOfFreeSpins = parseInt(params.get("fs_total"))
                        }
                        this.currentSpin.multiplier = this.currentSpin.win / this.currentSpin.bet
                    }
                    if (requestParams.has("pur") && gameInfo) {
                        let bonusIndex = parseInt(requestParams.get("pur"))
                        this.currentSpin.bonusPrice = gameInfo["bonus_buy"][bonusIndex] * this.currentSpin.bet
                    }
                } else {
                    if (continued) {
                        if (params.has("rs_p")) {
                            this.respinCount = parseInt(params.get("rs_p")) + 1
                        }
                        if (params.has("end") && (parseInt(params.get("end")) == 0)) {
                            return
                        }
                        if (continuedEnd || (params.has("rs_t") && this.respinCount == parseInt(params.get("rs_t")))) {
                            spin.win = totalWin
                            spinToBeSaved = spin
                        }
                    } else if (params.has("c") && params.has("l")) {
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
            this.uriPatterns = [".*://.*.pragmaticplay.net/gs2c/v3/gameService.*", ".*://.*.pragmaticplay.net/gs2c/ge/v3/gameService.*", ".*://.*localhost.*/slotstats_tester/pragmatic.cgi.*"]
        }
    }
    
    class PragmaticV4RequestProcessor extends PragmaticRequestProcessor {
        constructor() {
            super()
            this.uriPatterns = [".*://.*.pragmaticplay.net/gs2c/v4/gameService.*", ".*://.*.pragmaticplay.net/gs2c/ge/v4/gameService.*"]
        }
        
        //processRequest(httpRequest) {
        //    let requestParams = new URLSearchParams(httpRequest.body);
        //    let params = new URLSearchParams(httpRequest.response);
        //    
        //    this.game = requestParams.get("symbol")
        //    this.bet = parseFloat(params.get("c")) * parseFloat(params.get("l"))
        //    this.win = parseFloat(params.get("w"))
        //    this.isFunGame = httpRequest.url.includes("demogamesfree")
        //    this.isBonus = params.has("fsmul")
        //    this.isFreeBonus = !params.has("pur")
        //    this.timestamp = params.get("stime")
        //    
        //    window.postMessage(this, "*")
        //}
    }
    
    Injector.processors = [ new PragmaticV3RequestProcessor(), new PragmaticV4RequestProcessor(), new YggdrasilRequestProcessor() ]
    const xhrInjector = new XMLHttpRequestInjector();
    const fetchInjector = new FetchInjector();
    const requestProcessor = new RequestProcessor();
    xhrInjector.inject();
    fetchInjector.inject();
    
})();