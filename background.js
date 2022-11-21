/*******************
game_stats
    - max x
    - average x
    - total number of spins
    - spins since last bonus
    - bought bonuses
    - free bonuses
    
game_bet_stats
    - max win
    - total bets $
    - total win $
    - total bonus buys
    - total bonus wins
    - profit / loss
    
    
********************/

let db = null;
let lastActiveGame = null
let statsPages = {}

function createDatabase() {
    const request = indexedDB.open('slotstatsDb', 1);
    
    request.onerror = function (event) {
        console.log("Problem opening DB.");
    }
    
    request.onupgradeneeded = function (event) {
        db = event.target.result;
        let version =  parseInt(db.version);
        if (version == 1) {
            let objectStoreSettings = db.createObjectStore('settings', { keyPath: 'id' });
            let objectStoreGameStats = db.createObjectStore('game_stats', { keyPath: 'gameId' });
            let objectStoreBetStats = db.createObjectStore('game_bet_stats', { keyPath: [ 'gameId', 'currency' ] });
            let objectStoreFunGameStats = db.createObjectStore('fun_game_stats', { keyPath: 'gameId' });
            let objectStoreFunBetStats = db.createObjectStore('fun_game_bet_stats', { keyPath: [ 'gameId', 'currency' ] });
            
            let objectStoreSessions = db.createObjectStore('sessions', { keyPath: 'sessionId' });
            let objectStoreSessionGameStats = db.createObjectStore('session_game_stats', { keyPath: ['sessionId', 'gameId'] });
            let objectStoreSessionBetStats = db.createObjectStore('session_game_bet_stats', { keyPath: [ 'sessionId', 'gameId', 'currency' ] });
            let objectStoreSessionFunGameStats = db.createObjectStore('session_fun_game_stats', { keyPath: [ 'sessionId', 'gameId' ] });
            let objectStoreSessionFunBetStats = db.createObjectStore('session_fun_game_bet_stats', { keyPath: [ 'sessionId', 'gameId', 'currency' ] });
            
            let objectStoreSessionInfo = db.createObjectStore('session_info', { keyPath: 'id' });
            let objectStoreActiveGames = db.createObjectStore('active_games', { keyPath: 'tabId' });
        
            objectStoreSettings.transaction.oncomplete = function (event) {
                console.log("objectStoreSettings Created.");
            }
            objectStoreGameStats.transaction.oncomplete = function (event) {
                console.log("objectStoreGameStats Created.");
            }
            objectStoreBetStats.transaction.oncomplete = function (event) {
                console.log("objectStoreBetStats Created.");
            }
            objectStoreFunGameStats.transaction.oncomplete = function (event) {
                console.log("objectStoreFunGameStats Created.");
            }
            objectStoreFunBetStats.transaction.oncomplete = function (event) {
                console.log("objectStoreFunBetStats Created.");
            }
            objectStoreSessions.transaction.oncomplete = function (event) {
                console.log("objectStoreSessions Created.");
            }
            objectStoreSessionGameStats.transaction.oncomplete = function (event) {
                console.log("objectStoreSessionGameStats Created.");
            }
            objectStoreSessionBetStats.transaction.oncomplete = function (event) {
                console.log("objectStoreSessionBetStats Created.");
            }
            objectStoreSessionFunGameStats.transaction.oncomplete = function (event) {
                console.log("objectStoreSessionFunGameStats Created.");
            }
            objectStoreSessionFunBetStats.transaction.oncomplete = function (event) {
                console.log("objectStoreSessionFunBetStats Created.");
            }
            objectStoreActiveGames.transaction.oncomplete = function (event) {
                console.log("objectStoreActiveGames Created.");
            }
        }
    }
    
    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("DB OPENED.");
        
        db.onerror = function (event) {
            console.log("FAILED TO OPEN DB.")
        }
        ////// TEMP //////
        //clearDatabase();
        //////////////////
    }
}

function insertRecords(records) {
    if (db) {
        const insert_transaction = db.transaction("game_stats", "readwrite");
        const objectStore = insert_transaction.objectStore("game_stats");

        return new Promise((resolve, reject) => {
            insert_transaction.oncomplete = function () {
                console.log("ALL INSERT TRANSACTIONS COMPLETE.");
                resolve(true);
            }

            insert_transaction.onerror = function () {
                console.log("PROBLEM INSERTING RECORDS.")
                resolve(false);
            }

            records.forEach(person => {
                let request = objectStore.add(person);

                request.onsuccess = function () {
                    console.log("Added: ", person);
                }
            });
        });
    }
}

function getRecord(objectStoreId, key) {
    if (db) {
        console.log(key)
        const transaction = db.transaction(objectStoreId, "readwrite");
        const objectStore = transaction.objectStore(objectStoreId);
        const getRequest = objectStore.get(key);
        
        return new Promise((resolve, reject) => {
            getRequest.onsuccess = (event) => {
                resolve(getRequest.result)
            };
        })
    }
}

function getAllRecords(objectStoreId) {
    if (db) {
        const transaction = db.transaction(objectStoreId, "readwrite");
        const objectStore = transaction.objectStore(objectStoreId);
        const getRequest = objectStore.getAll();
        
        return new Promise((resolve, reject) => {
            getRequest.onsuccess = (event) => {
                resolve(getRequest.result)
            };
        })
    }
}

function deleteRecord(objectStoreId, key) {
    if (db) {
        const transaction = db.transaction(objectStoreId, "readwrite");
        const objectStore = transaction.objectStore(objectStoreId);
        const deleteRequest = objectStore.delete(key);
        
        //return new Promise((resolve, reject) => {
        //    transaction.oncomplete = () => {
        //        resolve()
        //    };
        //})
    }
}

function clearObjectStore(objectStoreId) {
    const transaction = db.transaction(objectStoreId, "readwrite");
    transaction.oncomplete = (event) => {};
    transaction.onerror = (event) => {};
    const objectStore = transaction.objectStore(objectStoreId);
    const clearRequest = objectStore.clear();
    clearRequest.onsuccess = (event) => {
        console.log("Object store cleared: " + objectStoreId)
    };
}

function clearDatabase() {
    console.log("Clearing database")
    clearObjectStore("settings")
    clearObjectStore("game_stats")
    clearObjectStore("game_bet_stats")
    clearObjectStore("fun_game_stats")
    clearObjectStore("fun_game_bet_stats")
    clearObjectStore("sessions")
    clearObjectStore("session_game_stats")
    clearObjectStore("session_game_bet_stats")
    clearObjectStore("session_fun_game_stats")
    clearObjectStore("session_fun_game_bet_stats")
    clearObjectStore("active_games")
}

function getSettings() {
    getRecord('settings', 0).then((settings) => {
        if (!settings) {
            settings = {}
            settings.backgroundColor = "#212766"
            settings.fontColor = "#FFFFFF"
            settings.activeSessionId = null
            settings.nextSessionId = 1
        } 
        settingsChanged(settings)
    })
}

function setSettings(settings) {
    settings.id = 0
    const transaction = db.transaction("settings", "readwrite");
    const objectStore = transaction.objectStore("settings");
    const updateRequest = objectStore.put(settings);
    console.log("setSettings")
    updateRequest.onsuccess = () => {
        settingsChanged(settings)
    }
}

function settingsChanged(settings) {
    chrome.runtime.sendMessage({ id: "settingsChanged", settings: settings })
}

function getSessionRecords() {
    getAllRecords("sessions").then((sessionsData) => {
        
        chrome.runtime.sendMessage({ id: "reloadSessions", data: sessionsData })
        
        getAllRecords("session_game_stats").then((gameStatsData) => {
            getAllRecords("session_fun_game_stats").then((funStatsData) => {
                chrome.runtime.sendMessage({ id: "reloadSessionRecords", data: gameStatsData, funData: funStatsData })
            })
        })
        getAllRecords("session_game_bet_stats").then((gameBetData) => {
            getAllRecords("session_fun_game_bet_stats").then((funBetData) => {
                chrome.runtime.sendMessage({ id: "reloadSessionBetRecords", data: gameBetData, funData: funBetData })
            })
        })
    })
}

function createNewSession() {
    getRecord('session_info', 0).then((sessionInfo) => {
        if (!sessionInfo) {
            sessionInfo = {}
            sessionInfo.id = 0
            sessionInfo.activeSessionId = null
            sessionInfo.nextSessionId = 1
        }
        sessionInfo.activeSessionId = sessionInfo.nextSessionId
        sessionInfo.nextSessionId += 1
        const transaction = db.transaction("session_info", "readwrite");
        const objectStore = transaction.objectStore("session_info");
        const updateRequest = objectStore.put(sessionInfo);
        updateRequest.onsuccess = () => {
            let now = new Date()
            let sessionRecord = { sessionId: sessionInfo.activeSessionId, start: now.toString() }
            const sessionTransaction = db.transaction("sessions", "readwrite");
            const sessionObjectStore = sessionTransaction.objectStore("sessions");
            const sessionUpdateRequest = sessionObjectStore.put(sessionRecord);
            sessionUpdateRequest.onsuccess = () => {
                chrome.runtime.sendMessage({ id: "newSessionCreated", data: sessionRecord })
            }
        }
    })
}

function endCurrentSession() {
    // TODO - create new session
}

function registerGame(tabId, gameId) {
    if (db) {
        const transaction = db.transaction("active_games", "readwrite");
        const objectStore = transaction.objectStore("active_games");
        const updateRequest = objectStore.put({ tabId: tabId, gameId: gameId });
        updateRequest.onsuccess = () => {}
    }
}

function activeGameChanged(activeGameId) {
    //console.log('### active game changed ### : ' + activeGameId);
    lastActiveGame = activeGameId
    //for (let statsPage in statsPages) {
    //    chrome.tabs.sendMessage(parseInt(statsPage), { id: "activeGameChanged", gameId: activeGameId })
    //}
    chrome.runtime.sendMessage({ id: "activeGameChanged", gameId: activeGameId })
}

//function recordResponse(record, spin) {
//    for (let statsPage in statsPages) {
//        chrome.tabs.sendMessage(parseInt(statsPage), { id: "logResponse", data: record, spin: spin })
//    }
//}

function saveSpinToTable(spin, statsTable, betStatsTable, sessionId = null) {
    console.log("### saveSpin ### " + spin);
    if (spin.gameId != "unknown") {
        
        let gameStatsKeys = spin.gameId
        if (sessionId) {
            gameStatsKeys = [sessionId, spin.gameId]
        }
        getRecord(statsTable, gameStatsKeys).then((gameStats) => {
            if (!gameStats) {
                gameStats = {}
                gameStats.gameId = spin.gameId
                gameStats.max_x = spin.isBonus ? spin.multiplier : 0
                gameStats.avg_x = spin.isBonus ? spin.multiplier : 0
                gameStats.bonus_count = spin.isBonus ? 1 : 0
                gameStats.spin_count = (spin.bonusPrice > 0) ? 0 : 1
                gameStats.spin_count_since_bonus = spin.isBonus ? 0 : 1
                gameStats.bought_bonus_count = 0
                gameStats.free_bonus_count = 0
                gameStats.avg_spins_per_bonus = 0
                if (spin.isBonus) {
                    if (spin.bonusPrice > 0) {
                        gameStats.bought_bonus_count = 1
                    } else {
                        gameStats.free_bonus_count = 1
                    }
                }
            } else {
                if (spin.isBonus) {
                    gameStats.max_x = Math.max(gameStats.max_x, spin.multiplier)
                    gameStats.avg_x = ((gameStats.avg_x * gameStats.bonus_count + spin.multiplier) / (gameStats.bonus_count + 1)).toFixed(2)
                    gameStats.bonus_count += 1
                    if (spin.bonusPrice > 0) {
                        gameStats.bought_bonus_count += 1
                    } else {
                        gameStats.spin_count += 1
                        gameStats.free_bonus_count += 1
                        gameStats.spin_count_since_bonus = 0
                    }
                } else {
                    if (!spin.continued) {
                        gameStats.spin_count += 1
                        gameStats.spin_count_since_bonus += 1
                    }
                }
            }
            console.log(gameStats.spin_count)
            gameStats.last_played = spin.timestamp
            gameStats.game_name = spin.gameName
            const transaction = db.transaction(statsTable, "readwrite");
            const objectStore = transaction.objectStore(statsTable);
            const updateRequest = objectStore.put(gameStats);
            updateRequest.onsuccess = () => {
                //for (let statsPage in statsPages) {
                //    chrome.tabs.sendMessage(parseInt(statsPage), { id: "updateRecord", gameStats: gameStats })
                //}
                chrome.runtime.sendMessage({ id: "updateRecord", isFunGame: spin.isFunGame, gameStats: gameStats, sessionId: sessionId })
            }
        })
        
        let betStatsKeys = [spin.gameId, spin.currency]
        if (sessionId) {
            betStatsKeys = [sessionId, spin.gameId, spin.currency]
        }
        getRecord(betStatsTable, betStatsKeys).then((betStats) => {
            if (!betStats) {
                betStats = {}
                betStats.gameId = spin.gameId
                betStats.currency = spin.currency
                betStats.max_win = 0
                betStats.total_bets = 0
                betStats.total_wins = 0
                betStats.total_bonus_buys = 0
                betStats.total_bonus_wins = 0
                if (sessionId) {
                    betStats.sessionId = sessionId
                }
            }
            betStats.max_win = Math.max(spin.win, betStats.max_win)
            if (spin.isBonus) {
                betStats.total_bonus_buys += spin.bonusPrice
                betStats.total_bonus_wins += spin.win
            }
            betStats.total_bets += (spin.bonusPrice > 0) ? spin.bonusPrice : spin.bet
            betStats.total_wins += spin.win
            betStats.profit_loss = betStats.total_wins / betStats.total_bets
            
            const transaction = db.transaction(betStatsTable, "readwrite");
            const objectStore = transaction.objectStore(betStatsTable);
            const updateRequest = objectStore.put(betStats);
            updateRequest.onsuccess = () => {
                //for (let statsPage in statsPages) {
                //    chrome.tabs.sendMessage(parseInt(statsPage), { id: "updateBetRecord", betStats: betStats })
                //}
                chrome.runtime.sendMessage({ id: "updateBetRecord", isFunGame: spin.isFunGame, betStats: betStats, sessionId: sessionId })
            }
        })
    } else {
        console.log("### Error: unknown game ###");
    }
}

function saveSpin(spin) {
    if (spin.isFunGame) {
        saveSpinToTable(spin, "fun_game_stats", "fun_game_bet_stats")
    } else {
        saveSpinToTable(spin, "game_stats", "game_bet_stats")
    }
    getRecord('settings', 0).then((settings) => {
        if (settings && settings.activeSessionId) {
            if (spin.isFunGame) {
                saveSpinToTable(spin, "session_fun_game_stats", "session_fun_game_bet_stats", settings.activeSessionId)
            } else {
                saveSpinToTable(spin, "session_game_stats", "session_game_bet_stats", settings.activeSessionId)
            }
        } 
    })
}

chrome.action.onClicked.addListener(function () {
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/index.html") });
});

chrome.tabs.onActivated.addListener(
    async function (activeInfo) {
        
        //const tab = await chrome.tabs.get(activeInfo.tabId);
        //if (tab.url == ("chrome-extension://" + chrome.runtime.id + "/pages/index.html") && !statsPages[activeInfo.tabId]) {
        //    statsPages[activeInfo.tabId] = 1
        //}
        
        let recordPromise = getRecord("active_games", activeInfo.tabId)
        if (recordPromise) {
            recordPromise.then((registeredGame) => {
                if (registeredGame) {
                    activeGameChanged(registeredGame.gameId)
                }
            })
        }
    }
)

chrome.tabs.onRemoved.addListener(
    function (tabId, removeInfo) {
        deleteRecord("active_games", tabId)
        if (statsPages[tabId]) {
            delete statsPages[tabId]
        }
    }
)

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    console.log("### runtime.onMessage ### " + msg.id);
    if (msg.id === 'registerGame') {
        registerGame(sender.tab.id, msg.gameId)
        activeGameChanged(msg.gameId)
    } else if (msg.id === 'registerStatsPage') {
        //statsPages.push(sender.tab.id)
        statsPages[sender.tab.id] = 1
        if (lastActiveGame) {
            //chrome.tabs.sendMessage(sender.tab.id, { id: "activeGameChanged", gameId: lastActiveGame })
            chrome.runtime.sendMessage({ id: "activeGameChanged", gameId: lastActiveGame })
        }
    } else if (msg.id === 'saveSpin') {
        saveSpin(msg.data)
        //for (let statsPage in statsPages) {
        //    chrome.tabs.sendMessage(parseInt(statsPage), { id: "updateRecord" })
        //}
    } else if (msg.id === 'getRecords') {
        getAllRecords("game_stats").then((data) => {
            getAllRecords("fun_game_stats").then((funData) => {
                chrome.runtime.sendMessage({ id: "reloadRecords", data: data, funData: funData })
            })
        })
        getAllRecords("game_bet_stats").then((data) => {
            getAllRecords("fun_game_bet_stats").then((funData) => {
                chrome.runtime.sendMessage({ id: "reloadBetRecords", data: data, funData: funData })
            })
        })
    //} else if (msg.id === 'recordResponse') {
        //recordResponse(msg.data, msg.spin)
    } else if (msg.id === 'clearDatabase') {
        clearDatabase()
    } else if (msg.id === 'deleteDatabase') {
        console.log("Deleting database")
        indexedDB.deleteDatabase('slotstatsDb');
    } else if (msg.id === 'getSettings') {
        getSettings()
    } else if (msg.id === 'saveSettings') {
        setSettings(msg.settings)
    } else if (msg.id === 'getSessionRecords') {
        getSessionRecords()
    } else if (msg.id === 'createNewSession') {
        createNewSession()
    } else if (msg.id === 'endCurrentSession') {
        endCurrentSession()
    }
    
    sendResponse()
});

///////////////
// TEMP
//indexedDB.deleteDatabase('slotstatsDb');
createDatabase();


//let patternJs = "https://*/app/fishtank2/js/fishtank2*js";
//
//function redirectJs(requestDetails) {
//  let filter = chrome.webRequest.filterResponseData(requestDetails.requestId);
//  let decoder = new TextDecoder("utf-8");
//  let encoder = new TextEncoder();
//
//  filter.ondata = event => {
//    let str = decoder.decode(event.data, {stream: true});
//    str = str.replace("a.onTake(a.replayData.completed)", "a.onTake(a.replayData && a.replayData.completed)");
//    filter.write(encoder.encode(str));
//    filter.disconnect();
//  }
//  return {};
//}
//
//chrome.declarativeNetRequest.onBeforeRequest.addListener(
//  redirectJs,
//  {urls:[
//        "*://*.blueprintgaming.com/*/*/*",
//        "*://*.ext.nyxop.net/html5/gcmwrapper.htm*",
//        "*://*.nyxop.net/html5/gcmwrapper.html*",
//        "*://dga1sy052ek6h.cloudfront.net/html5/gcmwrapper.html*",
//        "*://dpovs7i3r9tz1.cloudfront.net/html5/gcmwrapper.html*",
//        "*://*.relaxg.com/casino/games/*/index.html*",
//        "*://*.relaxg.com/mcasino/games/*/index.html*",
//        "*://*.relaxg.com/casino/games/*/game.html*",
//        "*://d2drhksbtcqozo.cloudfront.net/casino/*",
//        "*://d2drhksbtcqozo.cloudfront.net/mcasino/*/*/index.html*",
//        "*://d1k6j4zyghhevb.cloudfront.net/casino/*/*/index.html*",
//        "*://d1k6j4zyghhevb.cloudfront.net/mcasino/*/*/index.html*",
//        "*://dga1sy052ek6h.cloudfront.net/html5/wrapper3.html*",
//        "*://d3nsdzdtjbr5ml.cloudfront.net/casino/*/*/index.html*",
//        "*://d19h7q92ya6ec9.cloudfront.net/*/index.html*",
//        "*://static.contentmedia.eu/*/index.html*",
//        "*://static-stage.contentmedia.eu/*/index.html*",
//        "*://*.oryxgaming.com/badges/GAM/*",
//        "*://nrgs-b2b.gg.greentube.com/Nrgs/B2B/Web/*/V5/*/Games/*/Sessions/*/Show/html5*",
//        "*://nrgs-b2b.greentube.com.mt/Nrgs/B2B/Web/*/V5/*/Games/*/Sessions/*/Show/html5*",
//        "*://nrgs-b2b.greentube.com/Nrgs/B2B/Web/*/V5/*/Games/*/Sessions/*/Show/html5*",
//        "*://platform.rgsgames.com/skb/gateway*",
//        "*://rgs-demo03.lab.wagerworks.com/skb/gateway*",
//        "*://*.leandergames.com/mobile/games/*",
//        "*://*.allianceservices.im/gamestart.html*",
//        "*://*.allianceservices.im/gamestart_mobile.html*",
//        "*://*.edictmaltaservices.com.mt/gamestart.html*",
//        "*://*.edictmaltaservices.com.mt/gamestart_mobile.html*",
//        "*://*.gameassists.co.uk/*/game/*/*",
//        "*://*.gameassists.co.uk/htmlgames/game/*",
//        "*://*.gameassists.se/htmlgames/game/*",
//        "*://*.casinomodule.com/games/*",
//        "*://*.nolimitcdn.com/loader/game-loader.html*",
//        "*://*.nolimitcity.com/load-game/*",
//        "*://d1k6j4zyghhevb.cloudfront.net/casino/launcher.html*",
//        "*://*.nolimitcdn.com/loader/sgd.html*",
//        "*://cdn.oryxgaming.com/*/*/*/index.html*",
//        "*://*.playngonetwork.com/casino/GameLoader*",
//        "*://*.playngocasino.com/casino/GameLoader*",
//        "*://*.playngonetwork.com/casino/ContainerLauncher*",
//        "*://*.playngocasino.com/casino/ContainerLauncher*",
//        "*://*.playngonetwork.com/casino/IframedView*",
//        "*://*.playngonetwork.com/Casino/IframedView*",
//        "*://*.playngocasino.com/casino/IframedView*",
//        "*://*.playngonetwork.com/casino/PlayMobile*",
//        "*://*.playngocasino.com/casino/PlayMobile*",
//        "*://pt-cachedownload.videoslots.com/ngmdesktop/*/*/index.html*",
//        "*://cachedownload-com.vegasgames.partycasino.com/ngmdesktop/*/*/index.html*",
//        "*://*.pragmaticplay.net/gs2c/html5Game.do*",
//        "*://*.pragmaticplay.net/gs2c/common/games-html5/games/vs/*/*.html*",
//        "*://player.eu.regulated.pushgaming.com/hive/b2c/game/*/client/index.html*",
//        "*://*.yggdrasilgaming.com/slots/*/*",
//        "*://*.yggdrasilgaming.com/app/*/*",
//        "*://*.yggdrasilgaming.com/init/launchClient.html*",
//        "*://d334r25pe15ehe.cloudfront.net/casino/*/*/index.html*",
//        "*://d334r25pe15ehe.cloudfront.net/mcasino/*/*/index.html*",
//        "*://d1uzkcfflda6tv.cloudfront.net/casino/*/*/index.html*",
//        "*://d1uzkcfflda6tv.cloudfront.net/mcasino/*/*/index.html*",
//        "*://cf-mt-cdn2.relaxg.com/casino/*/*/index.html*",
//        "*://cf-mt-cdn2.relaxg.com/mcasino/*/*/index.html*",
//        "*://*.tgp.cash/*/launcher/*",
//        "*://*.redtiger.cash/*/launcher/*",
//        "*://*.rtggib.cash/*/launcher/*",
//        "*://*.redtiger.com/*/launcher/*",
//        "*://*.nyxop.net/gcm/gcm-launcher/launcher.html*",
//        "*://*.thunderkick.com/gamelauncher/play/gcm*",
//        "*://*.thunderkick.com/gamelauncher/play/generic*",
//        "*://*.thunderkick.com/gamelauncher/desktopLauncher/*",
//        "*://*.thunderkick.com/gamelauncher/mobileLauncher/*",
//        "*://*.thunderkick.com/gamelauncher/securenyx*",
//        "*://*.thunderkick.com/gamelauncher/play/*",
//        "*://*.wimobile.casinarena.com/resource-service/game.html*",
//        "*://*.wi-gameserver.com/resource-service/game.html*"
//    ], types:["script"]}, []
//);
