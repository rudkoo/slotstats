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
            this.firstContinued = false
            this.continued = false
        }
    }
    
    class RequestProcessor {
        
        constructor() {
            this.uriPatterns = []
        }
        
        isValidProcessor(httpRequest) {
            for (let pattern of this.uriPatterns) {
                if (httpRequest.url.match(pattern)) {
                    return true;
                }
            }
            return false;
        }
        
        processRequest(httpRequest) {
        }
    }
    
    class YggdrasilRequestProcessor {
        
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
            let spinToBeSaved = null
            
            if (action == "doInit") {
                window.postMessage({ msgId: "registerGame", currentGame: gameId }, "*")
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
                
                if (params.has("c") && params.has("l")) {
                    spin.bet = parseFloat(params.get("c")) * parseFloat(params.get("l"))
                    this.lastBet = spin.bet
                } else if (this.lastBet) {
                    spin.bet = this.lastBet
                }
                
                if (isBonus) {
                    if (!this.currentSpin) {
                        this.currentSpin = spin
                    }
                    if (params.has("fs_total") || (params.has("rsb_m") && params.has("rsb_c") && parseInt(params.get("rsb_m")) == parseInt(params.get("rsb_c")))) {
                        this.currentSpin.win = totalWin
                        if (params.has("fs_total")) {
                            this.currentSpin.noOfFreeSpins = parseInt(params.get("fs_total"))
                        }
                        this.currentSpin.multiplier = this.currentSpin.win / this.currentSpin.bet
                        this.currentSpin.bonusPrice = 0 // TODO
                    }
                } else {
                    if (continued) {
                        //if (!this.currentSpin) {
                        //    this.currentSpin = spin
                        //    this.currentSpin.firstContinued = true
                        //} else {
                        //    this.currentSpin.firstContinued = false
                        //}
                        //spin.bet = 0
                        //spin.continued = true
                        if (params.has("rs_p")) {
                            this.respinCount = parseInt(params.get("rs_p")) + 1
                        }
                        if (params.has("end") && (parseInt(params.get("end")) == 0)) {
                            return
                        }
                        if (continuedEnd || (params.has("rs_t") && this.respinCount == parseInt(params.get("rs_t")))) {
                            spin.win = totalWin
                            //window.postMessage({ msgId: "saveSpin", spin: spin }, "*")
                            spinToBeSaved = spin
                        }
                    } else if (params.has("c") && params.has("l")) {
                    //if (continued || totalWin == spin.win) {
                        //window.postMessage({ msgId: "saveSpin", spin: spin }, "*")
                        spinToBeSaved = spin
                    }
                }
                //this.game = requestParams.get("symbol")
                //this.bet = parseFloat(params.get("c")) * parseFloat(params.get("l"))
                ///this.win = parseFloat(params.get("tw"))
                //this.isFunGame = httpRequest.url.includes("demogamesfree")
                //this.isBonus = params.has("fsmul")
                //this.isFreeBonus = !params.has("pur")
                //this.timestamp = params.get("stime")
            } else if (action == "doCollect" || action == "doCollectBonus") {
                if (this.currentSpin) {
                    //window.postMessage({ msgId: "saveSpin", spin: this.currentSpin }, "*")
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
    /*
    tw=0.00&balance=99,638.80&index=328&balance_cash=99,638.80&reel_set=0&balance_bonus=0.00&na=s&stime=1664974351759&sa=4,8,7,4,9&sb=7,6,8,8,9&sh=3&c=0.20&sver=5&counter=656&l=10&s=3,5,7,4,7,9,6,8,8,7,9,6,8,8,9&w=0.00
    tw=2.80&balance=99,636.80&index=329&balance_cash=99,636.80&is=7,7,9,4,9,6,8,2,4,9,6,8,9,4,7&ep=2~7~2,7,12&reel_set=0&balance_bonus=0.00&na=s&sty=2,2~7,7~12,12&rs=t&l0=1~1.40~0~1~2&l1=5~1.40~0~1~7&rs_p=0&stime=1664974352259&sa=7,6,7,8,9&sb=6,8,7,9,7&rs_c=1&sh=3&rs_m=1&c=0.20&srf=2~17~2,7,12&sver=5&counter=658&l=10&s=7,7,17,4,9,6,8,17,4,9,6,8,17,4,7&w=2.80
    tw=33.80&l10=3~1.00~4~8~12&l12=5~1.00~4~3~7&msr=7~6~6~6~9~7~8&l11=4~1.00~14~8~2&l14=7~1.00~9~13~12&l13=6~1.00~14~13~7&l16=9~1.00~9~3~7&l15=8~1.00~9~3~2&balance=99,636.80&index=330&balance_cash=99,636.80&is=10,15,15,13,14,10,15,12,13,14,15,11,12,2,14&ep=2~13~3,8,13&reel_set=1&balance_bonus=0.00&na=s&sty=2,2~3,3~7,7~8,8~12,12~13,13&rs=t&l0=0~3.00~5~6~7~8&l1=1~3.00~0~1~2~3&l2=3~3.00~0~6~12~8&l3=4~3.00~10~6~2~8&rs_p=1&l4=5~3.00~0~1~7~3&l5=8~3.00~5~1~2~3&l6=9~3.00~5~1~7~3&stime=1664974356848&l7=0~1.00~9~8~7&l8=1~1.00~4~3~2&l9=2~1.00~14~13~12&sa=10,11,12,13,14&sb=15,11,2,13,14&rs_c=1&rs_win=31.00&sh=3&rs_m=1&c=0.20&srf=2~17~3,8,13&sver=5&counter=660&l=10&s=7,7,17,17,9,7,7,17,17,9,7,6,17,17,9&w=31.00
    tw=49.80&msr=7~6~8~6~5~5~8&balance=99,636.80&index=331&balance_cash=99,636.80&is=10,11,12,13,14,10,11,12,13,16,15,11,15,13,14&reel_set=1&balance_bonus=0.00&na=c&sty=2,-1~3,-1~7,-1~8,-1~12,-1~13,-1&rs_t=2&l0=0~1.00~9~8~7&l1=1~2.00~4~3~2&l2=2~2.00~14~13~12&l3=3~2.00~4~8~12&l4=4~2.00~14~8~2&l5=5~2.00~4~3~7&l6=6~2.00~14~13~7&stime=1664974367433&l7=7~1.00~9~13~12&l8=8~1.00~9~3~2&l9=9~1.00~9~3~7&sa=15,11,15,13,14&sb=10,11,12,16,14&rs_win=47.00&sh=3&c=0.20&sver=5&counter=662&l=10&s=7,6,17,17,5,7,6,17,17,8,5,6,17,17,5&w=16.00
    */
    
    class PragmaticV3RequestProcessor extends PragmaticRequestProcessor {
        
        constructor() {
            super()
            this.uriPatterns = [".*://.*.pragmaticplay.net/gs2c/v3/gameService.*", ".*://.*.pragmaticplay.net/gs2c/ge/v3/gameService.*", ".*://.*localhost/slotstats_tester/pragmatic.cgi.*"]
            this.sessions = {}
            this.provider = "pragmatic"
            this.gameId = null
            this.bet = 0
            this.win = 0
            this.isFunGame = false
            this.isBonus = false
            this.isFreeBonus = false
            this.timestamp = null
            this.currency = window.UHT_GAME_CONFIG ? window.UHT_GAME_CONFIG.CURRENCY : ""
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
    
    
    /*
    
    tw=0.00&trail=reels~1,1,1,1,1,1&balance=100,020.32&index=19&balance_cash=100,020.32&reel_set=0&balance_bonus=0.00&na=s&bl=0&stime=1664703625403&sa=6,3,6,4,6,5&sb=5,5,4,3,4,7&sh=4&st=rect&c=0.08&sw=6&sver=5&counter=38&l=25&s=10,8,8,4,6,5,1,5,8,4,6,5,10,5,7,6,6,5,10,5,7,3,4,3&w=0.00
    
    continued spin
    
    tw=0.80&trail=reels~1,1,1,1,1,1&balance=99,988.00&index=7&balance_cash=99,988.00&reel_set=0&balance_bonus=0.00&na=s&l0=14~0.80~0~7~2~9&rs_p=0&bl=0&stime=1664703454806&sa=9,4,9,7,10,6&sb=8,10,7,9,8,3&rs_c=1&sh=4&rs_m=1&st=rect&c=0.08&sw=6&sver=5&counter=14&l=25&s=9,4,9,7,5,7,7,9,7,9,9,5,8,8,7,9,9,5,8,8,7,9,8,10&w=0.80
    tw=3.52&trail=lives~0;level~1;reels~1,2,1,1,1&balance=99,988.00&rs_more=1&index=8&balance_cash=99,988.00&reel_set=0&s_mark=g2~2:1,2:2;g4~4:7,4:13,4:8,4:14;g6~6:19,6:20&balance_bonus=0.00&na=s&l0=0~0.32~0~1~2&l1=10~1.20~12~19~20&l2=13~1.20~6~1~2&rs_p=1&bl=0&stime=1664703457993&sa=7,2,2,5,8,9&sb=8,6,6,7,9,4&rs_c=2&rs_win=2.72&sh=4&rs_m=2&st=rect&c=0.08&sw=6&sver=5&counter=16&l=25&s=7,2,2,5,7,1,6,4,4,7,7,8,6,4,4,7,9,10,8,6,6,7,9,10&w=2.72
    tw=48.32&l10=19~3.20~6~1~8~3&l12=22~3.20~6~7~2~3&l11=21~3.20~6~7~14~15&l13=23~3.20~12~13~8~9&trail=lives~0;level~2;reels~1,3,1,1&balance=99,988.00&rs_more=1&index=9&balance_cash=99,988.00&reel_set=0&s_mark=g3~3:19,3:20,3:21;g4~4:1,4:7,4:13,4:2,4:8,4:14,4:3,4:9,4:15&balance_bonus=0.00&na=s&l0=1~3.20~6~7~8~9&l1=2~3.20~12~13~14~15&l2=6~3.20~12~7~2~3&rs_p=2&l3=7~3.20~18~13~8~9&l4=9~3.20~6~13~14~15&l5=11~3.20~18~13~14~15&bl=0&l6=12~3.20~12~7~8~9&stime=1664703462007&l7=13~3.20~6~1~2~3&l8=15~3.20~6~13~8~15&l9=18~3.20~12~7~14~9&sa=8,7,7,7,8,3&sb=4,3,3,3,10,7&rs_c=3&rs_win=47.52&sh=4&rs_m=3&st=rect&c=0.08&sw=6&sver=5&counter=18&l=25&s=8,4,4,4,5,9,4,4,4,4,5,9,4,4,4,4,10,7,4,3,3,3,10,7&w=44.80
    tw=48.32&trail=lives~0;level~3;reels~1,4,1&balance=99,988.00&index=10&balance_cash=99,988.00&reel_set=0&s_mark=g6~6:7,6:13,6:19,6:8,6:14,6:20,6:9,6:15,6:21,6:10,6:16,6:22;g8~8:1,8:2,8:3,8:4&balance_bonus=0.00&na=c&rs_t=3&bl=0&stime=1664703470875&sa=3,8,8,8,8,5&sb=4,6,6,6,6,5&rs_win=47.52&sh=4&wmt=pr&st=rect&wmv=2&c=0.08&sw=6&sver=5&counter=20&l=25&s=3,8,8,8,8,9,4,6,6,6,6,7,4,6,6,6,6,1,4,6,6,6,6,6&w=0.00&gwm=2
    balance=100,036.32&index=11&balance_cash=100,036.32&balance_bonus=0.00&na=s&stime=1664703470986&sver=5&counter=22
    
    bonus
    
    tw=4.00&trail=reels~1,1,1,1,1,1&balance=99,834.48&index=437&balance_cash=99,834.48&reel_set=0&balance_bonus=0.00&na=s&rs_p=0&bl=0&stime=1664651456373&sa=9,6,5,6,6,10&sb=7,9,7,10,5,9&rs_c=1&sh=4&rs_m=6&st=rect&c=0.08&psym=1~4.00~0,17&sw=6&sver=5&counter=874&l=25&s=1,6,5,6,10,8,7,6,5,9,3,5,7,6,5,9,4,1,7,9,7,8,8,9&w=4.00
    tw=5.52&trail=lives~5;level~1;reels~1,1,2,1,1&balance=99,834.48&rs_more=1&index=438&balance_cash=99,834.48&reel_set=0&s_mark=g2~2:2,2:3;g5~5:20,5:21;g9~9:8,9:14,9:9,9:15&balance_bonus=0.00&na=s&l0=0~1.20~0~1~2~3&l1=14~0.32~0~7~2&rs_p=1&bl=0&stime=1664651465459&sa=6,7,2,2,5,8&sb=9,5,5,5,8,5&rs_c=2&rs_win=1.52&sh=4&rs_m=7&st=rect&c=0.08&sw=6&sver=5&counter=876&l=25&s=7,7,2,2,5,8,8,7,9,9,7,8,10,5,9,9,10,10,10,5,5,5,8,4&w=1.52
    tw=5.52&trail=lives~5;level~2;reels~1,1,3,1&balance=99,834.48&index=439&balance_cash=99,834.48&reel_set=0&s_mark=g4~4:2,4:3,4:4;g6~6:8,6:14,6:20,6:9,6:15,6:21,6:10,6:16,6:22&balance_bonus=0.00&na=s&rs_p=2&bl=0&stime=1664651469628&sa=9,4,4,4,4,7&sb=7,7,10,10,10,5&rs_c=3&rs_win=1.52&sh=4&rs_m=7&st=rect&c=0.08&sw=6&sver=5&counter=878&l=25&s=4,5,4,4,4,7,10,10,6,6,6,7,5,9,6,6,6,3,5,9,6,6,6,3&w=0.00
    tw=5.52&trail=lives~4;level~2;reels~1,1,3,1&balance=99,834.48&index=440&balance_cash=99,834.48&reel_set=0&s_mark=g3~3:2,3:3,3:4;g4~4:8,4:14,4:20,4:9,4:15,4:21,4:10,4:16,4:22&balance_bonus=0.00&na=s&rs_p=3&bl=0&stime=1664651472217&sa=6,5,3,3,3,3&sb=2,8,7,7,7,9&rs_c=4&rs_win=1.52&sh=4&rs_m=7&st=rect&c=0.08&sw=6&sver=5&counter=880&l=25&s=4,5,3,3,3,10,9,5,4,4,4,10,5,8,4,4,4,10,5,8,4,4,4,10&w=0.00
    tw=5.52&trail=lives~3;level~2;reels~1,1,3,1&balance=99,834.48&index=441&balance_cash=99,834.48&reel_set=0&s_mark=g10~10:14,10:20,10:15,10:21,10:16,10:22;g3~3:2,3:8,3:3,3:9,3:4,3:10&balance_bonus=0.00&na=s&rs_p=4&bl=0&stime=1664651473851&sa=7,3,3,3,3,7&sb=5,7,10,10,10,7&rs_c=5&rs_win=1.52&sh=4&rs_m=7&st=rect&c=0.08&sw=6&sver=5&counter=882&l=25&s=7,3,3,3,3,9,7,7,3,3,3,9,7,7,10,10,10,9,5,7,10,10,10,9&w=0.00
    tw=5.52&trail=lives~2;level~2;reels~1,1,3,1&balance=99,834.48&index=442&balance_cash=99,834.48&reel_set=0&s_mark=g5~5:2,5:8,5:14,5:3,5:9,5:15,5:4,5:10,5:16;g8~8:20,8:21,8:22&balance_bonus=0.00&na=s&rs_p=5&bl=0&stime=1664651475624&sa=8,9,4,4,4,8&sb=7,8,8,8,8,7&rs_c=6&rs_win=1.52&sh=4&rs_m=7&st=rect&c=0.08&sw=6&sver=5&counter=884&l=25&s=8,5,5,5,5,1,9,5,5,5,5,10,3,5,5,5,5,6,7,5,8,8,8,7&w=0.00
    tw=33.52&trail=lives~1;level~2;reels~1,1,3,1&balance=99,834.48&rs_more=1&index=443&balance_cash=99,834.48&reel_set=0&s_mark=g6~6:2,6:8,6:14,6:3,6:9,6:15,6:4,6:10,6:16;g9~9:20,9:21,9:22&balance_bonus=0.00&na=s&l0=2~4.00~12~13~14~15~16&l1=6~4.00~12~7~2~3~10&l2=7~4.00~18~13~8~9~16&rs_p=6&l3=11~4.00~18~13~14~15~16&l4=12~4.00~12~7~8~9~10&l5=18~4.00~12~7~14~9~16&bl=0&l6=23~4.00~12~13~8~9~16&stime=1664651477267&sa=7,4,10,10,10,9&sb=2,8,9,9,9,7&rs_c=7&rs_win=29.52&sh=4&rs_m=8&st=rect&c=0.08&sw=6&sver=5&counter=886&l=25&s=10,4,6,6,6,5,8,6,6,6,6,7,2,6,6,6,6,7,2,8,9,9,9,7&w=28.00
    tw=39.28&lmi=7,11&trail=lives~1;level~3;reels~1,4,1&lmv=2,2&balance=99,834.48&rs_more=1&index=444&balance_cash=99,834.48&reel_set=0&s_mark=g3~3:19,3:20,3:21,3:22;g9~9:1,9:7,9:13,9:2,9:8,9:14,9:3,9:9,9:15,9:4,9:10,9:16&balance_bonus=0.00&na=s&l0=7~2.88~18~13~8~9~16&l1=11~2.88~18~13~14~15~16&rs_p=7&bl=0&stime=1664651480237&sa=7,9,9,9,9,5&sb=9,3,3,3,3,7&rs_c=8&rs_win=35.28&sh=4&rs_m=9&wmt=pr&st=rect&wmv=2&c=0.08&sw=6&sver=5&counter=888&l=25&s=6,9,9,9,9,5,10,9,9,9,9,1,5,9,9,9,9,7,9,3,3,3,3,7&w=5.76&gwm=2
    tw=39.28&trail=lives~1;level~4;reels~1,4,1&balance=99,834.48&index=445&balance_cash=99,834.48&reel_set=0&s_mark=g10~10:13,10:19,10:14,10:20,10:15,10:21,10:16,10:22;g8~8:1,8:7,8:2,8:8,8:3,8:9,8:4,8:10&balance_bonus=0.00&na=s&rs_p=8&bl=0&stime=1664651484410&sa=10,8,8,8,8,8&sb=3,10,10,10,10,6&rs_c=9&rs_win=35.28&sh=4&rs_m=9&wmt=pr&st=rect&wmv=3&c=0.08&sw=6&sver=5&counter=890&l=25&s=10,8,8,8,8,4,3,8,8,8,8,6,3,10,10,10,10,6,3,10,10,10,10,6&w=0.00&gwm=3
    tw=39.28&trail=lives~0;level~4;reels~1,4,1&balance=99,834.48&index=446&balance_cash=99,834.48&reel_set=0&s_mark=g3~3:19,3:20,3:21,3:22;g4~4:1,4:7,4:13,4:2,4:8,4:14,4:3,4:9,4:15,4:4,4:10,4:16&balance_bonus=0.00&na=c&rs_t=9&bl=0&stime=1664651486643&sa=5,4,4,4,4,8&sb=6,3,3,3,3,9&rs_win=35.28&sh=4&wmt=pr&st=rect&wmv=3&c=0.08&sw=6&sver=5&counter=892&l=25&s=5,4,4,4,4,8,8,4,4,4,4,8,8,4,4,4,4,9,6,3,3,3,3,1&w=0.00&gwm=3
    
    
    */
    
    Injector.processors = [ new PragmaticV3RequestProcessor(), new PragmaticV4RequestProcessor() ]
    const xhrInjector = new XMLHttpRequestInjector();
    const fetchInjector = new FetchInjector();
    const requestProcessor = new RequestProcessor();
    xhrInjector.inject();
    fetchInjector.inject();
    
})();