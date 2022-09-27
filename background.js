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
            let objectStoreGameStats = db.createObjectStore('game_stats', { keyPath: 'gameId' });
            let objectStoreBetStats = db.createObjectStore('game_bet_stats', { keyPath: [ 'gameId', 'currency' ] });
            let objectStoreActiveGames = db.createObjectStore('active_games', { keyPath: 'tabId' });
        
            objectStoreGameStats.transaction.oncomplete = function (event) {
                console.log("objectStoreGameStats Created.");
            }
            objectStoreBetStats.transaction.oncomplete = function (event) {
                console.log("objectStoreBetStats Created.");
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
    clearObjectStore("game_stats")
    clearObjectStore("game_bet_stats")
    clearObjectStore("active_games")
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
    for (let statsPage in statsPages) {
        chrome.tabs.sendMessage(parseInt(statsPage), { id: "activeGameChanged", gameId: activeGameId })
    }
}

function saveSpin(spin) {
    console.log("### saveSpin ### " + spin);
    if (spin.gameId != "unknown") {
        getRecord('game_stats', spin.gameId).then((gameStats) => {
            if (!gameStats) {
                gameStats = {}
                gameStats.gameId = spin.gameId
                gameStats.max_x = spin.isBonus ? spin.multiplier : 0
                gameStats.avg_x = spin.isBonus ? spin.multiplier : 0
                gameStats.bonus_count = spin.isBonus ? 1 : 0
                gameStats.spin_count = spin.isBonus ? 0 : 1
                gameStats.spin_count_since_bonus = spin.isBonus ? 0 : 1
                gameStats.bought_bonus_count = 0
                gameStats.free_bonus_count = 0
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
                        gameStats.free_bonus_count += 1
                        gameStats.spin_count_since_bonus = 0
                    }
                } else {
                    if (!spin.continued) {
                        console.log(" ### new spin ###")
                        gameStats.spin_count += 1
                        gameStats.spin_count_since_bonus += 1
                    }
                }
            }
            gameStats.last_played = spin.timestamp
            const transaction = db.transaction("game_stats", "readwrite");
            const objectStore = transaction.objectStore("game_stats");
            const updateRequest = objectStore.put(gameStats);
            updateRequest.onsuccess = () => {
                for (let statsPage in statsPages) {
                    chrome.tabs.sendMessage(parseInt(statsPage), { id: "updateRecord", gameStats: gameStats })
                }
            }
        })
        
        getRecord('game_bet_stats', [spin.gameId, spin.currency]).then((betStats) => {
            if (!betStats) {
                betStats = {}
                betStats.gameId = spin.gameId
                betStats.currency = spin.currency
                betStats.max_win = 0
                betStats.total_bets = 0
                betStats.total_wins = 0
                betStats.total_bonus_buys = 0
                betStats.total_bonus_wins = 0
            }
            betStats.max_win = Math.max(spin.win, betStats.max_win)
            if (spin.isBonus) {
                betStats.total_bonus_buys += spin.bonusPrice
                betStats.total_bonus_wins += spin.win
            }
            betStats.total_bets += ((spin.bonusPrice > 0) ? spin.bonusPrice : spin.bet).toFixed(2)
            betStats.total_wins += spin.win
            betStats.profit_loss = (betStats.total_wins / betStats.total_bets).toFixed(2)
            
            const transaction = db.transaction("game_bet_stats", "readwrite");
            const objectStore = transaction.objectStore("game_bet_stats");
            const updateRequest = objectStore.put(betStats);
            updateRequest.onsuccess = () => {
                for (let statsPage in statsPages) {
                    chrome.tabs.sendMessage(parseInt(statsPage), { id: "updateBetRecord", betStats: betStats })
                }
            }
        })
    } else {
        console.log("### Error: unknown game ###");
    }
}

chrome.action.onClicked.addListener(function () {
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/index.html") });
});

chrome.tabs.onActivated.addListener(
    function (activeInfo) {
        getRecord("active_games", activeInfo.tabId).then((registeredGame) => {
            if (registeredGame) {
                activeGameChanged(registeredGame.gameId)
            }
        })
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
            chrome.tabs.sendMessage(sender.tab.id, { id: "activeGameChanged", gameId: lastActiveGame })
        }
    } else if (msg.id === 'saveSpin') {
        saveSpin(msg.data)
        //for (let statsPage in statsPages) {
        //    chrome.tabs.sendMessage(parseInt(statsPage), { id: "updateRecord" })
        //}
    } else if (msg.id === 'getRecords') {
        getAllRecords("game_stats").then((data) => {
            chrome.tabs.sendMessage(sender.tab.id, { id: "reloadRecords", data: data })
        })
        getAllRecords("game_bet_stats").then((data) => {
            chrome.tabs.sendMessage(sender.tab.id, { id: "reloadBetRecords", data: data })
        })
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
