"use strict";

var recordingActive

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
                    const request = new HttpRequest(e);
                    try {
                        this.notifyWatchers(request);
                    } catch (e) {
                        window.postMessage({ msgId: "log", message: "Error: " + e.toString() }, "*")
                    }
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
            window.postMessage({ msgId: "log", message: "injecting XMLHttpRequest" }, "*")
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
                        try {
                            this.notifyWatchers(request)
                        } catch (e) {
                            window.postMessage({ msgId: "log", message: "Error: " + e.toString() }, "*")
                        }
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
    }
    
    class YggdrasilRequestProcessor extends RequestProcessor {
        constructor() {
            super()
            this.uriPatterns = [".*://.*.yggdrasilgaming.com/slots/.*/.*", ".*://.*.yggdrasilgaming.com/app/.*/.*", ".*://.*.yggdrasilgaming.com/init/launchClient.html.*", ".*://.*.yggdrasilgaming.com/game.web/service.*", ".*://.*localhost.*/slotstats_tester/pragmatic.cgi.*"]
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
                        this.currentSpin.bet = window.XT.GetObject(Vars.FeaturePurchase).purchaseCosts[bonusIndex] * (window.CoinManager.GetNextBet() * 1E3) / 1E3
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
            this.uriPatterns = [".*://.*.pragmaticplay.net/gs2c/v3/gameService.*", ".*://.*.pragmaticplay.net/gs2c/ge/v3/gameService.*"]
        }
    }
    
    class PragmaticV4RequestProcessor extends PragmaticRequestProcessor {
        
        constructor() {
            super()
            this.uriPatterns = [".*://.*.pragmaticplay.net/gs2c/v4/gameService.*", ".*://.*.pragmaticplay.net/gs2c/ge/v4/gameService.*"]
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
            let processor = this
            
            if (window.hacksawCasino) {
                window.hacksawCasino.PubSub.getChannel("casino").subscribe("startGame", function(e) {
                    for (let bonus of e.featureBuyData) {
                        processor.featureBuyData[bonus.bonusGameId] = parseInt(bonus.betCostMultiplier)
                    }
                })
                window.hacksawCasino.PubSub.getChannel("casino").subscribe("initData", function(e) {
                    processor.currency = e.currency
                    processor.isFunMode = e.mode.match(/demo/i) != null
                    processor.gameId = e.gameId
                    processor.gameName = e.gameName
                    window.postMessage({ msgId: "registerGame", gameId: e.gameId, gameName: e.gameName, providerName: processor.provider }, "*")
                })
            }
        }
        
        getBonusEnterEvent(spinInfo) {
            for (let eventItem of spinInfo.round.events) {
                if (eventItem.etn == "feature_enter") {
                    return eventItem
                }
            }
            return null
        }
        
        isBonus(spinInfo) {
            let eventItem = this.getBonusEnterEvent(spinInfo)
            return eventItem != null
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
                        this.currentSpin.isFreeBonus = !("buyBonus" in request.bets[0])
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
            }
        }
    }
    
    class RelaxGamingProcessor extends RequestProcessor {
        constructor() {
            super()
            this.uriPatterns = [".*://.*.relaxg.(net|com)/.*/casino/games/.*", ".*://.*.relaxg.com/casino/launcher.html.*"]
            // https://cf-iomeu-cdn.relaxg.com/capi/2.0/casino/games/getlauncherconfig?gameref=netgains
            //.*://.*.api.relaxg.com      /capi/2.0/casino/games/getclientconfig?gameref=netgains&jurisdiction=GG&partnerid=636&versionstring=1.0.4
            //window.config.gameDetails.highestWin
            //https://cf-iomeu-cdn.relaxg.com/casino/launcher.html?channel=web&gameid=netgains&homeurl=https%3A%2F%2Ffairspin.io%3A443%2Fcasino%2FGAMES&jurisdiction=GG&lang=en_US&moneymode=fun&partner=hubb2beu&partnerid=636&apex=1&fullscreen=false
            this.provider = "Relax Gaming"
            this.currentSpin = null
            this.currency = null
            this.isFunMode = true
            this.gameId = null
            this.gameName = null
            this.featureBuyData = {}
        }
        
        processRequest(httpRequest) {
            let request = httpRequest.url.substring(0, httpRequest.url.search("\\?"))
            if (request.endsWith("getlauncherconfig")) {
                let requestParams = new URLSearchParams(httpRequest.url.substring(httpRequest.url.search("\\?") + 1));
                let response = JSON.parse(httpRequest.response)
                this.gameName = response.fullname
                window.postMessage({ msgId: "registerGame", gameId: requestParams.get("gameref"), gameName: this.gameName, providerName: this.provider }, "*")
            }
        }
    }
    
    Injector.processors = [ new PragmaticV3RequestProcessor(), new PragmaticV4RequestProcessor(), new YggdrasilRequestProcessor(), new HacksawGamingProcessor(), new RelaxGamingProcessor() ]
    const xhrInjector = new XMLHttpRequestInjector();
    const fetchInjector = new FetchInjector();
    xhrInjector.inject();
    fetchInjector.inject();
    
})();