
let db = null;
let lastActiveGame = null
let lastActiveGameName = null
let lastActiveProviderName = null
let lastActiveGameMaxPotential = null
let debugLogging = false

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
            
            objectStoreSessionGameStats.createIndex("sessionIdIndex", "sessionId", { unique: false });
            objectStoreSessionBetStats.createIndex("sessionIdIndex", "sessionId", { unique: false });
            objectStoreSessionFunGameStats.createIndex("sessionIdIndex", "sessionId", { unique: false });
            objectStoreSessionFunBetStats.createIndex("sessionIdIndex", "sessionId", { unique: false });
            
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
        console.log("DB OPENED. " + new Date().toString());
        
        db.onerror = function (event) {
            console.log("FAILED TO OPEN DB.")
        }
    }
}

function getRecord(objectStoreId, key) {
    if (db) {
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

function getRecordsByIndex(objectStoreId, indexName, keyValue) {
    if (db) {
        const transaction = db.transaction(objectStoreId, "readonly");
        const objectStore = transaction.objectStore(objectStoreId);
        const index = objectStore.index(indexName);
        const request = index.getAll(IDBKeyRange.only(parseInt(keyValue)));
        
        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                resolve(request.result)
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
    clearObjectStore("session_info")
    clearObjectStore("active_games")
}

function getSettings() {
    getRecord('settings', 0).then((settings) => {
        if (!settings) {
            settings = {}
            settings.backgroundColor = "#212766"
            settings.fontColor = "#FFFFFF"
        } 
        settingsChanged(settings)
    })
}

function setSettings(settings) {
    settings.id = 0
    const transaction = db.transaction("settings", "readwrite");
    const objectStore = transaction.objectStore("settings");
    const updateRequest = objectStore.put(settings);
    
    updateRequest.onsuccess = () => {
        settingsChanged(settings)
    }
}

function settingsChanged(settings) {
    chrome.runtime.sendMessage({ id: "settingsChanged", settings: settings })
}

function getGameRecords() {
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
}

function getSessions() {
    getAllRecords("sessions").then((sessionsData) => {
        chrome.runtime.sendMessage({ id: "reloadSessions", data: sessionsData })
    })
}

function getSessionRecords(sessionId) {
    
    getRecordsByIndex("session_game_stats", "sessionIdIndex", sessionId).then((gameStatsData) => {
        getRecordsByIndex("session_fun_game_stats", "sessionIdIndex", sessionId).then((funStatsData) => {
            chrome.runtime.sendMessage({ id: "reloadSessionRecords", sessionId: sessionId, data: gameStatsData, funData: funStatsData })
        })
    })
    
    getRecordsByIndex("session_game_bet_stats", "sessionIdIndex", sessionId).then((gameBetData) => {
        getRecordsByIndex("session_fun_game_bet_stats", "sessionIdIndex", sessionId).then((funBetData) => {
            chrome.runtime.sendMessage({ id: "reloadSessionBetRecords", sessionId: sessionId, data: gameBetData, funData: funBetData })
        })
    })
}

function zeroPadding(str, length) {
    return ("0000" + str).substr(-length)
}

function dateFormat(date) {
    return date.getFullYear() + "-" +
        zeroPadding(date.getMonth()+1, 2) + "-" +
        zeroPadding(date.getDate(), 2) + " " +
        zeroPadding(date.getHours(), 2) + ":" +
        zeroPadding(date.getMinutes(), 2)
}

function createNewSession() {
    getRecord('session_info', 0).then((sessionInfo) => {
        if (!sessionInfo) {
            sessionInfo = {}
            sessionInfo.id = 0
            sessionInfo.activeSessionId = null
            sessionInfo.nextSessionId = 1
        }
        if (sessionInfo.activeSessionId) {
            getRecord('sessions', sessionInfo.activeSessionId).then((activeSession) => {
                if (activeSession) {
                    activeSession.end = dateFormat(new Date())
                    const sessionTransaction = db.transaction("sessions", "readwrite");
                    const sessionObjectStore = sessionTransaction.objectStore("sessions");
                    const sessionUpdateRequest = sessionObjectStore.put(activeSession);
                    sessionUpdateRequest.onsuccess = () => {
                        chrome.runtime.sendMessage({ id: "updateSession", data: activeSession })
                    }
                }
            })
        }
        sessionInfo.activeSessionId = sessionInfo.nextSessionId
        sessionInfo.nextSessionId += 1
        const transaction = db.transaction("session_info", "readwrite");
        const objectStore = transaction.objectStore("session_info");
        const updateRequest = objectStore.put(sessionInfo);
        updateRequest.onsuccess = () => {
            let now = new Date()
            let sessionRecord = { sessionId: sessionInfo.activeSessionId, start: dateFormat(now) }
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
    // TODO
}

function registerGame(tabId, gameId, gameName, providerName, maxPotential) {
    let recordPromise = getRecord("active_games", tabId)
    if (recordPromise) {
        recordPromise.then((registeredGame) => {
            if (registeredGame) {
                if (!gameName) {
                    gameName = registeredGame.gameName
                }
                if (!maxPotential) {
                    maxPotential = registeredGame.maxPotential
                }
            }
            saveActiveGame(tabId, gameId, gameName, providerName, maxPotential)
        })
    } else {
        saveActiveGame(tabId, gameId, gameName, providerName, maxPotential)
    }
}

function saveActiveGame(tabId, gameId, gameName, providerName, maxPotential) {
    if (db) {
        const transaction = db.transaction("active_games", "readwrite");
        const objectStore = transaction.objectStore("active_games");
        const updateRequest = objectStore.put({ tabId: tabId, gameId: gameId, gameName: gameName, providerName: providerName, maxPotential: maxPotential });
        updateRequest.onsuccess = () => {}
    }
}

function activeGameChanged(activeGameId, activeGameName, activeProviderName, activeGameMaxPotential) {
    if (lastActiveGame != activeGameId) {
        lastActiveGame = null
        lastActiveGameName = ""
        lastActiveProviderName = ""
        lastActiveGameMaxPotential = null
    }
    lastActiveGame = activeGameId
    if (activeGameName != null) {
        lastActiveGameName = activeGameName
    }
    if (activeProviderName != null) {
        lastActiveProviderName = activeProviderName
    }
    if (activeGameMaxPotential != null) {
        lastActiveGameMaxPotential = activeGameMaxPotential
    }
    if (debugLogging) {
        console.log("[Slotstats][activeGameChanged]: " + lastActiveGame + ", " + lastActiveGameName + ", " + lastActiveProviderName + ", " + lastActiveGameMaxPotential)
    }
    chrome.runtime.sendMessage({ id: "activeGameChanged", gameId: lastActiveGame, gameName: lastActiveGameName, providerName: lastActiveProviderName, maxPotential: lastActiveGameMaxPotential })
}

function roundToFixed(number) {
    return Math.round(number * 100) / 100
}

function saveSpinToTable(spin, statsTable, betStatsTable, sessionId = null) {
    
    if (spin.gameId != "unknown") {
        let gameStatsKeys = spin.gameId
        if (sessionId) {
            gameStatsKeys = [sessionId, spin.gameId]
        }
        getRecord(statsTable, gameStatsKeys).then((gameStats) => {
            if (!gameStats) {
                gameStats = {}
                gameStats.gameId = spin.gameId
                gameStats.sessionId = sessionId
                console.log(spin.multiplier)
                gameStats.max_x = roundToFixed(spin.multiplier)
                gameStats.avg_x = spin.isBonus ? spin.multiplier : 0
                gameStats.bonus_count = spin.isBonus ? 1 : 0
                gameStats.spin_count = (spin.isBonus && !spin.isFreeBonus) ? 0 : 1
                gameStats.spin_count_since_bonus = spin.isBonus ? 0 : 1
                gameStats.bought_bonus_count = 0
                gameStats.free_bonus_count = 0
                gameStats.avg_spins_per_bonus = 0
                gameStats.max_x_bet = Math.round(spin.baseBet*100)/100
                gameStats.max_x_currency = spin.currency
                
                if (spin.isBonus) {
                    if (spin.isFreeBonus) {
                        gameStats.free_bonus_count = 1
                    } else {
                        gameStats.bought_bonus_count = 1
                    }
                }
            } else {
                if (spin.multiplier > gameStats.max_x) {
                    gameStats.max_x = roundToFixed(spin.multiplier)
                    gameStats.max_x_bet = roundToFixed(spin.baseBet)
                    gameStats.max_x_currency = spin.currency
                }
                if (spin.isBonus) {
                    gameStats.avg_x = roundToFixed((gameStats.avg_x * gameStats.bonus_count + spin.multiplier) / (gameStats.bonus_count + 1))
                    gameStats.bonus_count += 1
                    if (spin.isFreeBonus) {
                        gameStats.spin_count += 1
                        gameStats.free_bonus_count += 1
                        gameStats.spin_count_since_bonus = 0
                    } else {
                        gameStats.bought_bonus_count += 1
                    }
                } else {
                    gameStats.spin_count += 1
                    gameStats.spin_count_since_bonus += 1
                }
            }
            
            gameStats.last_played = spin.timestamp
            gameStats.game_name = spin.gameName
            const transaction = db.transaction(statsTable, "readwrite");
            const objectStore = transaction.objectStore(statsTable);
            const updateRequest = objectStore.put(gameStats);
            updateRequest.onsuccess = () => {
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
                betStats.sessionId = sessionId
                betStats.currency = spin.currency
                betStats.max_win = 0
                betStats.max_win_bet = 0
                betStats.total_bets = 0
                betStats.total_wins = 0
                betStats.total_bonus_buys = 0
                betStats.total_bonus_wins = 0
                if (sessionId) {
                    betStats.sessionId = sessionId
                }
            }
            if (spin.win > betStats.max_win) {
                betStats.max_win = roundToFixed(spin.win)
                betStats.max_win_bet = roundToFixed(spin.baseBet)
            }
            if (spin.isBonus) {
                betStats.total_bonus_buys += roundToFixed(spin.bet)
                betStats.total_bonus_wins += roundToFixed(spin.win)
            }
            betStats.total_bets += roundToFixed(spin.bet)
            betStats.total_wins += roundToFixed(spin.win)
            betStats.profit_loss = roundToFixed(betStats.total_wins - betStats.total_bets)
            
            const transaction = db.transaction(betStatsTable, "readwrite");
            const objectStore = transaction.objectStore(betStatsTable);
            const updateRequest = objectStore.put(betStats);
            updateRequest.onsuccess = () => {
                chrome.runtime.sendMessage({ id: "updateBetRecord", isFunGame: spin.isFunGame, betStats: betStats, sessionId: sessionId })
            }
        })
    } else {
        console.log("### Error: unknown game ###");
    }
}

function saveSpin(spin) {
    if (!db) {
        createDatabase();
        setTimeout(()=>{ saveSpin(spin); }, 1000)
        return;
    }
    
    if (spin.isFunGame) {
        saveSpinToTable(spin, "fun_game_stats", "fun_game_bet_stats")
    } else {
        saveSpinToTable(spin, "game_stats", "game_bet_stats")
    }
    getRecord('session_info', 0).then((sessionInfo) => {
        if (sessionInfo && sessionInfo.activeSessionId) {
            if (spin.isFunGame) {
                saveSpinToTable(spin, "session_fun_game_stats", "session_fun_game_bet_stats", sessionInfo.activeSessionId)
            } else {
                saveSpinToTable(spin, "session_game_stats", "session_game_bet_stats", sessionInfo.activeSessionId)
            }
        } 
    })
}

chrome.action.onClicked.addListener(function () {
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/index.html") });
});

chrome.tabs.onActivated.addListener(
    async function (activeInfo) {
        let recordPromise = getRecord("active_games", activeInfo.tabId)
        if (recordPromise) {
            recordPromise.then((registeredGame) => {
                if (registeredGame) {
                    activeGameChanged(registeredGame.gameId, registeredGame.gameName, registeredGame.providerName, registeredGame.maxPotential)
                }
            })
        }
    }
)

chrome.tabs.onRemoved.addListener(
    function (tabId, removeInfo) {
        deleteRecord("active_games", tabId)
    }
)

chrome.windows.onFocusChanged.addListener(
    async function (windowId) {
        if (windowId != chrome.windows.WINDOW_ID_NONE) {
            let queryOptions = { active: true, lastFocusedWindow: true };
            let [tab] = await chrome.tabs.query(queryOptions);
            if (tab) {
                let recordPromise = getRecord("active_games", tab.id)
                if (recordPromise) {
                    recordPromise.then((registeredGame) => {
                        if (registeredGame) {
                            activeGameChanged(registeredGame.gameId, registeredGame.gameName, registeredGame.providerName, registeredGame.maxPotential)
                        }
                    })
                }
            }
        }
    }
)

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    
    if (debugLogging) {
        console.log("### runtime.onMessage ### " + msg.id);
    }
    
    if (msg.id === 'registerGame') {
        if (debugLogging) {
            console.log("[Slotstats][registerGame]: " + msg.gameId + ", " + msg.gameName + ", " + msg.providerName + ", " + msg.maxPotential)
        }
        registerGame(sender.tab.id, msg.gameId, msg.gameName, msg.providerName, msg.maxPotential)
        activeGameChanged(msg.gameId, msg.gameName, msg.providerName, msg.maxPotential)
    } else if (msg.id === 'registerStatsPage') {
        if (debugLogging) {
            console.log("[Slotstats][registerStatsPage]: " + lastActiveGame + ", " + lastActiveGameName + ", " + lastActiveProviderName + ", " + lastActiveGameMaxPotential)
        }
        if (lastActiveGame) {
            chrome.runtime.sendMessage({ id: "activeGameChanged", gameId: lastActiveGame, gameName: lastActiveGameName, providerName: lastActiveProviderName, maxPotential: lastActiveGameMaxPotential })
        }
    } else if (msg.id === 'saveSpin') {
        saveSpin(msg.data)
    } else if (msg.id === 'getRecords') {
        getGameRecords()
    } else if (msg.id === 'clearDatabase') {
        clearDatabase()
    } else if (msg.id === 'deleteDatabase') {
        console.log("Deleting database")
        indexedDB.deleteDatabase('slotstatsDb');
    } else if (msg.id === 'getSettings') {
        getSettings()
    } else if (msg.id === 'saveSettings') {
        setSettings(msg.settings)
    } else if (msg.id === 'getSessions') {
        getSessions()
    } else if (msg.id === 'getSessionRecords') {
        getSessionRecords(parseInt(msg.sessionId))
    } else if (msg.id === 'createNewSession') {
        createNewSession()
    } else if (msg.id === 'endCurrentSession') {
        endCurrentSession()
    }
    
    sendResponse()
});

createDatabase();
