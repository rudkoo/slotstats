"use strict";

class LaunchProcessor {
    
    constructor() {
        this.uriPatterns = []
    }
    
    isValidProcessor(url) {
        for (let pattern of this.uriPatterns) {
            if (url.match(pattern)) {
                return true;
            }
        }
        return false;
    }
    
    processPage() {
    }
}

LaunchProcessor.processors = []

class YggdrasilLaunchProcessor extends LaunchProcessor {
    constructor() {
        super()
        this.provider = "Yggdrasil"
        this.uriPatterns = [".*://.*.yggdrasilgaming.com/slots/.*/.*", ".*://.*.yggdrasilgaming.com/app/.*/.*", ".*://.*.yggdrasilgaming.com/init/launchClient.html.*"]
        this.timerId = null
        this.gameId = null
    }
    
    processPage() {
        this.timerId = setInterval(() => {
            if (yggdrasilSlots) {
                let gameName = this.gameId in yggdrasilSlots ? yggdrasilSlots[this.gameId].name : this.gameId
                window.postMessage({ msgId: "registerGame", gameId: this.gameId, gameName: gameName, providerName: this.provider }, "*")
                clearInterval(this.timerId)
            }
        }, 1000)
        let requestParams = new URLSearchParams(document.location.search)
        this.gameId = requestParams.get("gameid")
    }
}

class RelaxGamingLaunchProcessor extends LaunchProcessor {
    constructor() {
        super()
        this.timerId = null
        this.provider = "Relax Gaming"
        this.uriPatterns = [".*://.*.relaxg.(net|com)/casino/games/.*", ".*://d2drhksbtcqozo.cloudfront.net/casino/.*"]
    }
    
    processPage() {
        this.timerId = setInterval(() => {
            if (window.config && window.config.GAME_CONFIG && window.config.gameDetails) {
                window.postMessage({ msgId: "registerGame", gameId: window.config.GAME_CONFIG.GAME_ID, providerName: this.provider, maxPotential: window.config.gameDetails.highestWin }, "*")
                clearInterval(this.timerId)
            }
        }, 1000)
    }
}

(() => {
    LaunchProcessor.processors.push( new YggdrasilLaunchProcessor(), new RelaxGamingLaunchProcessor() )
    
    for (let processor of LaunchProcessor.processors) {
        if (processor.isValidProcessor(document.URL)) {
            processor.processPage()
        }
    }
})();