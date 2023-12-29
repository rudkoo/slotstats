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
                    processor.processRequest(httpRequest)
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
                                window.postMessage({ msgId: "log", message: "Error: " + e.toString() + "\n" + e.stack }, "*")
                            }
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
            
            class WebSocketWrapper extends WebSocket{
                constructor(url, protocols) {
                    super(url, protocols)
                    this.addEventListener("message", function (e) {
                        processMessage({ url: this.url, data: e.data })
                    });
                }
                
                send(data) {
                    super.send(data)
                    processRequest({ url: this.url, data: data })
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
            this.uriPatterns = [".*://.*.pragmaticplay.net/gs2c/v3/gameService.*", ".*://.*.pragmaticplay.net/gs2c/ge/v3/gameService.*",
                ".*://.*.ppgames.net/gs2c/v3/gameService.*", ".*://.*.ppgames.net/gs2c/ge/v3/gameService.*"]
        }
    }
    
    class PragmaticV4RequestProcessor extends PragmaticRequestProcessor {
        
        constructor() {
            super()
            this.uriPatterns = [".*://.*.pragmaticplay.net/gs2c/v4/gameService.*", ".*://.*.pragmaticplay.net/gs2c/ge/v4/gameService.*",
                ".*://.*.ppgames.net/gs2c/v4/gameService.*", ".*://.*.ppgames.net/gs2c/ge/v4/gameService.*"]
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
                if (message.content.type == "featureBet" || message.content.type == "normalBet") {
                    let spin = new Spin()
                    spin.provider = this.provider
                    spin.gameId = this.gameId
                    spin.gameName = this.gameName
                    spin.isFunGame = this.isFunMode
                    spin.currency = this.currency
                    spin.baseBet = parseFloat(message.content.bet)
                    spin.isFreeBonus = false
                    
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
    }
    
    let nolimitProcessor = new NolimitCityProcessor()
    Injector.processors = [ new PragmaticV3RequestProcessor(), new PragmaticV4RequestProcessor(), new YggdrasilRequestProcessor(), new HacksawGamingProcessor(), new RelaxGamingProcessor(), new PushGamingProcessor(), nolimitProcessor ]
    Injector.wsProcessors = [ nolimitProcessor ]
    const xhrInjector = new XMLHttpRequestInjector();
    const fetchInjector = new FetchInjector();
    const webSocketInjector = new WebSocketInjector();
    xhrInjector.inject();
    fetchInjector.inject();
    //webSocketInjector.inject();
    
})();