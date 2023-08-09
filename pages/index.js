const FUN_PREFIX = "Fun_"
var overallTable = null
var slotsTable = null
var funStatsTable = null
var gameIndicies = {}
var gameStats = {}
var gameBetStats = {}
var funGameIndicies = {}
var funGameStats = {}
var funGameBetStats = {}
var isSessionPage = false
var activeGameId = null
var activeGameName = null
var activeProviderName = null
var activeGameMaxPotential= null
var responseCounter = 1
var debugLogging = false

function messageHandler(msg, sender, sendResponse) {
    
    if (debugLogging) {
        console.log("### index.js::messageHandler: " + msg.id);
    }
    
    if (msg.id == "activeGameChanged") {
        activeGameChanged(msg.gameId, msg.gameName, msg.providerName, msg.maxPotential)
    } else if (msg.id == "updateRecord") {
        updateRecord(msg.gameStats, msg.isFunGame, msg.sessionId)
    } else if (msg.id == "updateBetRecord") {
        updateBetRecord(msg.betStats, msg.isFunGame, msg.sessionId)
        updateOverallTable()
    } else if (msg.id == "reloadRecords") {
        if (!isSessionPage) {
            reloadRecords(msg.data, msg.funData)
        }
    } else if (msg.id == "reloadBetRecords") {
        if (!isSessionPage) {
            reloadBetRecords(msg.data, msg.funData)
            updateOverallTable()
        }
    } else if (msg.id == "settingsChanged") {
        updateSettings(msg.settings)
    } else if (msg.id == "reloadSessions") {
        reloadSessions(msg.data)
    } else if (msg.id == "reloadSessionRecords") {
        reloadSessionRecords(msg.data, msg.funData, msg.sessionId)
    } else if (msg.id == "reloadSessionBetRecords") {
        reloadSessionBetRecords(msg.data, msg.funData, msg.sessionId)
    } else if (msg.id == "newSessionCreated") {
        newSessionCreated(msg.data)
    } else if (msg.id == "updateSession") {
        updateSession(msg.data)
    } else if (msg.id == "recordResponse") {
        logResponse(msg.data, msg.spin)
    }
    
    sendResponse()
}

function hexToRgbA(hex){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return [(c>>16)&255, (c>>8)&255, c&255];
    }
    return [0, 0, 0]
}

function updateColor() {
    let windowColorPicker = document.getElementById("windowColor")
    let elements = document.getElementsByClassName("boxHeader")
    let windowColor = windowColorPicker.value
    let rgb = hexToRgbA(windowColor)
    let secondaryColor = "#"
    
    for (let i = 0; i < rgb.length; ++i) {
        rgb[i] = Math.max(rgb[i] - 96, 0)
        secondaryColor += ("00" + rgb[i].toString(16)).slice(-2)
    }
    for (let element of elements) {
        element.style.backgroundColor = windowColor
    }
    elements = document.getElementsByClassName("boxWithShadow")
    for (let element of elements) {
        let image = 'linear-gradient(to bottom right, ' + windowColor + ', ' + secondaryColor + ')';
        element.style.backgroundImage = image
    }
}

function updateFontColor() {
    let fontColorPicker = document.getElementById("fontColor")
    let elements = document.getElementsByClassName("boxCell")
    let fontColor = fontColorPicker.value
    
    for (let element of elements) {
        element.style.color = fontColor
    }
}

function updateBackgroundColor() {
    let backgroundColorPicker = document.getElementById("backgroundColor")
    let backgroundColor = backgroundColorPicker.value
    document.body.style.background = backgroundColor
}

function updateSettings(settings) {
    let fontColorPicker = document.getElementById("fontColor")
    let windowColorPicker = document.getElementById("windowColor")
    let backgroundColorPicker = document.getElementById("backgroundColor")
    if (fontColorPicker && backgroundColorPicker) {
        windowColorPicker.value = settings.windowColor
        backgroundColorPicker.value = settings.backgroundColor
        fontColorPicker.value = settings.fontColor
        updateColor()
        updateFontColor()
        updateBackgroundColor()
    }
}

function saveSettings() {
    let windowColorPicker = document.getElementById("windowColor")
    let fontColorPicker = document.getElementById("fontColor")
    let backgroundColorPicker = document.getElementById("backgroundColor")
    let settings = { windowColor: windowColorPicker.value, backgroundColor: backgroundColorPicker.value, fontColor: fontColorPicker.value }
    chrome.runtime.sendMessage({ id: "saveSettings", settings: settings }, function() {});
}

function clearDatabase() {
    chrome.runtime.sendMessage({ id: "clearDatabase" }, function() {});
}

function deleteDatabase() {
    chrome.runtime.sendMessage({ id: "deleteDatabase" }, function() {});
}

function getMostValuableWin(betStats) {
    let result = null
    for (let currency in betStats) {
        let convertedValue = 0
        let convertedBestValue = 0
        if (currency in currencies) {
            convertedValue = betStats[currency].max_win / currencies[currency]
        }
        if (result && result.currency in currencies) {
            convertedBestValue = result.max_win / currencies[result.currency]
        }
        if (result && !convertedValue && !convertedBestValue) {
            convertedValue = betStats[currency].max_win
            convertedBestValue = result.max_win
        }
        
        if (!result || convertedValue > convertedBestValue) {
            result = betStats[currency]
        }
    }
    return result
}

function calculatePersonalRTP(betStats) {
    let sum = 0
    let size = 0
    for (let currency in betStats) {
        if (betStats[currency].total_bets > 0) {
            sum += betStats[currency].total_wins / betStats[currency].total_bets
            size += 1
        }
    }
    return size > 0 ? (sum / size * 100).toFixed(2) : 0
}

function loadGameInfo(gameId, gameName, providerName, maxPotential) {
    if (gameId && $("#gameNameText")) {
        $("#gameNameText").text(gameName.toUpperCase())
        $("#providerNameText").text(providerName.toUpperCase())
        $("#maxPotentialText").text(maxPotential != null ? (maxPotential + " X") : " - ")
        
        let mostValuableWin = null
        let isFunRecord = false
        if (gameId in gameBetStats) {
            mostValuableWin = getMostValuableWin(gameBetStats[gameId])
        }
        if (!mostValuableWin && gameId in funGameBetStats) {
            mostValuableWin = getMostValuableWin(funGameBetStats[gameId])
            isFunRecord = true
        }
        if (mostValuableWin) {
            let currency = isFunRecord ? (FUN_PREFIX + mostValuableWin.currency) : mostValuableWin.currency
            $("#maxWinText").text(mostValuableWin.max_win + " " + currency + " (" + mostValuableWin.max_win_bet + " " + currency + ")")
        } else {
            $("#maxWinText").text(" - ")
        }
        
        if (gameId in gameStats) {
            $("#maxXText").text(gameStats[gameId].max_x + " X (" + gameStats[gameId].max_x_bet + " " + gameStats[gameId].max_x_currency + ")")
            $("#maxAvgBonusXText").text(gameStats[gameId].avg_x + " X")
            $("#personalRTPText").text(calculatePersonalRTP(gameBetStats[gameId]))
            $("#totalSpinsText").text(gameStats[gameId].spin_count)
            $("#boughtBonusesText").text(gameStats[gameId].bought_bonus_count)
            $("#freeBonusesText").text(gameStats[gameId].free_bonus_count)
        } else if (gameId in funGameStats) {
            $("#maxXText").text(funGameStats[gameId].max_x + " X (" + funGameStats[gameId].max_x_bet + " " + FUN_PREFIX + funGameStats[gameId].max_x_currency + ")")
            $("#maxAvgBonusXText").text(funGameStats[gameId].avg_x + " X")
            $("#personalRTPText").text(calculatePersonalRTP(funGameBetStats[gameId]))
            $("#totalSpinsText").text(funGameStats[gameId].spin_count)
            $("#boughtBonusesText").text(funGameStats[gameId].bought_bonus_count)
            $("#freeBonusesText").text(funGameStats[gameId].free_bonus_count)
        } else {
            $("#maxXText").text(" - ")
            $("#maxAvgBonusXText").text(" - ")
            $("#personalRTPText").text(" - ")
            $("#totalSpinsText").text(" - ")
            $("#boughtBonusesText").text(" - ")
            $("#freeBonusesText").text(" - ")
        }
    } else if (gameId == null) {
        $("#gameNameText").text("")
        $("#providerNameText").text("")
        $("#maxWinText").text(" - ")
        $("#maxXText").text(" - ")
        $("#maxAvgBonusXText").text(" - ")
        $("#personalRTPText").text(" - ")
        $("#totalSpinsText").text(" - ")
        $("#boughtBonusesText").text(" - ")
        $("#freeBonusesText").text(" - ")
    }
}

function activeGameChanged(gameId, gameName, providerName, maxPotential) {
    activeGameId = gameId
    activeGameName = gameName
    activeProviderName = providerName
    activeGameMaxPotential = maxPotential
    loadGameInfo(gameId, gameName, providerName, maxPotential)
}

function reloadRecords(data, funData) {
    gameStats = {}
    gameIndicies = {}
    funGameStats = {}
    funGameIndicies = {}
    
    if (slotsTable) {
        slotsTable.clear()
        slotsTable.rows.add(data).draw()
        funStatsTable.clear()
        funStatsTable.rows.add(funData).draw()
        
        for (let i = 0; i < slotsTable.data().count(); ++i) {
            let rowData = slotsTable.row(i).data()
            gameIndicies[rowData.gameId] = i
        }
        for (let i = 0; i < funStatsTable.data().count(); ++i) {
            let rowData = funStatsTable.row(i).data()
            funGameIndicies[rowData.gameId] = i
        }
    }
    for (let record of data) {
        gameStats[record.gameId] = record
    }
    for (let record of funData) {
        funGameStats[record.gameId] = record
    }
    loadGameInfo(activeGameId, activeGameName, activeProviderName, activeGameMaxPotential)
}

function reloadBetRecords(data, funData) {
    gameBetStats = {}
    funGameBetStats = {}
    for (let record of data) {
        updateBetRecord(record, false, null)
    }
    for (let record of funData) {
        updateBetRecord(record, true, null)
    }
    loadGameInfo(activeGameId, activeGameName, activeProviderName, activeGameMaxPotential)
}

function updateOverallTable() {
    if (overallTable) {
        let overallData = {}
        for (let gameId in gameBetStats) {
            for (let currency in gameBetStats[gameId]) {
                try {
                    if (!overallData[currency]) {
                        overallData[currency] = { "total_bets": 0, "total_wins": 0, "profit_loss": 0  }
                    }
                    if (gameBetStats[gameId][currency].total_bets && gameBetStats[gameId][currency].total_wins) {
                        overallData[currency]["total_bets"] += gameBetStats[gameId][currency].total_bets
                        overallData[currency]["total_wins"] += gameBetStats[gameId][currency].total_wins
                        overallData[currency]["profit_loss"] = overallData[currency]["total_wins"] - overallData[currency]["total_bets"]
                    }
                } catch (e) {}
            }
        }
        for (let gameId in funGameBetStats) {
            for (let currency in funGameBetStats[gameId]) {
                let funCurrency = FUN_PREFIX + currency
                try {
                    if (!overallData[funCurrency]) {
                        overallData[funCurrency] = { "total_bets": 0, "total_wins": 0, "profit_loss": 0  }
                    }
                    if (funGameBetStats[gameId][currency].total_bets && funGameBetStats[gameId][currency].total_wins) {
                        overallData[funCurrency]["total_bets"] += funGameBetStats[gameId][currency].total_bets
                        overallData[funCurrency]["total_wins"] += funGameBetStats[gameId][currency].total_wins
                        overallData[funCurrency]["profit_loss"] = overallData[funCurrency]["total_wins"] - overallData[funCurrency]["total_bets"]
                    }
                } catch (e) {}
            }
        }
        let overallDataArray = []
        for (let currency in overallData) {
            let item = overallData[currency]
            item.currency = currency
            overallDataArray.push(item)
        }
        overallTable.rows().clear()
        overallTable.rows.add(overallDataArray)
        overallTable.rows().draw()
    }
}

function updateRecord(updatedGameStats, isFunGame, sessionId) {
    
    let table = isFunGame ? funStatsTable : slotsTable
    if (table) {
        let gameStatsIndicies = isFunGame ? funGameIndicies : gameIndicies
        if (updatedGameStats.gameId in gameStatsIndicies) {
            let index = gameStatsIndicies[updatedGameStats.gameId]
            table.row(index).data(updatedGameStats).draw()
        } else {
            table.row.add(updatedGameStats).draw()
            gameStatsIndicies[updatedGameStats.gameId] = table.data().count() - 1
        }
    }
    if (isFunGame) {
        funGameStats[updatedGameStats.gameId] = updatedGameStats
    } else {
        gameStats[updatedGameStats.gameId] = updatedGameStats
    }
    if (!sessionId && activeGameId == updatedGameStats.gameId) {
        loadGameInfo(activeGameId, activeGameName, activeProviderName, activeGameMaxPotential)
    }
}

function updateBetRecord(betStats, isFunGame, sessionId) {
    
    let table = isFunGame ? funStatsTable : slotsTable
    let gameStatsIndicies = isFunGame ? funGameIndicies : gameIndicies
    let betStatsData = isFunGame ? funGameBetStats : gameBetStats
    
    if (!(betStats.gameId in betStatsData)) {
        betStatsData[betStats.gameId] = {}
    }
    
    betStatsData[betStats.gameId][betStats.currency] = betStats
    if (betStats.gameId in gameStatsIndicies) {
        let index = gameStatsIndicies[betStats.gameId]
        let row = table.row(index)
        table.row(index).draw()
        row.child(format(row.data(), betStatsData[row.data().gameId]))
    }
    if (!sessionId && activeGameId == betStats.gameId) {
        loadGameInfo(activeGameId, activeGameName, activeProviderName, activeGameMaxPotential)
    }
}

function sessionLabelFormat(sessionData) {
    let text = "Session " + sessionData.sessionId + ": (" + sessionData.start + " - "
    if (sessionData.end) {
        text += sessionData.end
    }
    text += ")"
    return text
}

function selectSession(index) {
    if (document.getElementById('currentSession')) {
        let options = $('#currentSession').children()
        if (index >= 0 && index < options.length) {
            options[index].selected = 'selected'
            chrome.runtime.sendMessage({ id: "getSessionRecords", sessionId: options[index].value }, function() {});
        }
    }
}

function addSessionToList(sessionData) {
    if ($('#currentSession')) {
        let text = sessionLabelFormat(sessionData)
        $('#currentSession').append(new Option(text, sessionData.sessionId))
    }
}

function reloadSessions(sessionData) {
    if (document.getElementById('currentSession')) {
        for (let item of sessionData) {
            addSessionToList(item)
        }
        selectSession($('#currentSession').children().length - 1)
    }
}
 
function reloadSessionRecords(statsData, funStatsData, sessionId) {
    if (document.getElementById('currentSession') && $('#currentSession').val() == sessionId) {
        reloadRecords(statsData, funStatsData)
    }
}

function reloadSessionBetRecords(statsData, funStatsData, sessionId) {
    if (document.getElementById('currentSession') && $('#currentSession').val() == sessionId) {
        reloadBetRecords(statsData, funStatsData)
        updateOverallTable()
    }
}

function createNewSession() {
    chrome.runtime.sendMessage({ id: "createNewSession" }, function() {});
}

function newSessionCreated(newSession) {
    if (document.getElementById('currentSession')) {
        addSessionToList(newSession)
        selectSession($('#currentSession').children().length - 1)
    }
}

function updateSession(updatedSession) {
    if (document.getElementById('currentSession')) {
        let options = $('#currentSession').children()
        for (let i = options.length-1; i >= 0; --i) {
            if (options[i].value == updatedSession.sessionId) {
                options[i].text = sessionLabelFormat(updatedSession)
                break
            }
        }
    }
}

function logResponse(data, spin) {
    if (data) {
        let content = "<p>{ \"key\" => \"" + data.body.replaceAll("@", "\\@") + "&test=" + responseCounter + "\", \"response\" => \"" + data.response.replaceAll("\"", "\\\"") + "\", \"expected\" => \"" + JSON.stringify(spin).replaceAll("\"", "\\\"") + "\" },</p>"
        $("#responseLog").append(content)
        ++responseCounter
    }
}

window.addEventListener('load', (event) => {
    //document.getElementById("colorValue").addEventListener("input", function() { updateColor() })
    //chrome.runtime.sendMessage({ id: "registerStatsPage" }, function() {});
});

function format(rowData, betStats) {
    let result = 
        '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">' +
            '<thead>' +
                '<tr>' +
                    '<th>Currency</th>' +
                    '<th>Max win</th>' +
                    '<th>Total bets</th>' +
                    '<th>Total win</th>' +
                    '<th>Total bonus wins</th>' +
                    '<th>Total bonus buys</th>' +
                    '<th>Profit/Loss</th>' +
                '</tr>' +
            '</thead>' +
            '<tbody>'
    for (let stats in betStats) {
        result += 
                '<tr>' +
                    '<td>' + betStats[stats].currency + '</td>' +
                    '<td>' + betStats[stats].max_win.toFixed(2) + '</td>' +
                    '<td>' + betStats[stats].total_bets.toFixed(2) + '</td>' +
                    '<td>' + betStats[stats].total_wins.toFixed(2) + '</td>' +
                    '<td>' + betStats[stats].total_bonus_wins.toFixed(2) + '</td>' +
                    '<td>' + betStats[stats].total_bonus_buys + '</td>' +
                    '<td>' + betStats[stats].profit_loss + '</td>' +
                '</tr>'
    }
            
    result += 
            '</tbody>' +
        '</table>'
    return result
}

function toFixed(data, type, row) {
    return data.toFixed(2);
}
 
$(document).ready(function () {
    
    if (document.getElementById('slot_stats')) {
        slotsTable = $('#slot_stats').DataTable({
            data: [],
            columns: [
                {
                    className: 'dt-control',
                    orderable: false,
                    data: null,
                    defaultContent: '',
                },
                { data: 'game_name' },
                { data: 'max_x', render: function(data, type, row) {
                    return data + " (" + row.max_x_bet + " " + row.max_x_currency + ")";
                } },
                { data: 'avg_x' },
                { data: 'spin_count' },
                { data: 'spin_count_since_bonus' },
                { data: 'spin_count', render: function(data, type, row) {
                    return (row.free_bonus_count > 0) ? (data / row.free_bonus_count).toFixed(2) : data;
                } },
                { data: 'bought_bonus_count' },
                { data: 'free_bonus_count' }
            ],
            paging: false,
            info: false,
            order: [[1, 'asc']],
        });
     
        $('#slot_stats tbody').on('click', 'td.dt-control', function () {
            var tr = $(this).closest('tr');
            var row = slotsTable.row(tr);
     
            if (row.child.isShown()) {
                row.child.hide();
                tr.removeClass('shown');
            } else {
                row.child(format(row.data(), gameBetStats[row.data().gameId])).show();
                tr.addClass('shown');
            }
        });
        
        funStatsTable = $('#fun_stats').DataTable({
            data: [],
            columns: [
                {
                    className: 'dt-control',
                    orderable: false,
                    data: null,
                    defaultContent: '',
                },
                { data: 'game_name' },
                { data: 'max_x', render: function(data, type, row) {
                    return data + " (" + row.max_x_bet + " " + row.max_x_currency + ")";
                } },
                { data: 'avg_x' },
                { data: 'spin_count' },
                { data: 'spin_count_since_bonus' },
                { data: 'spin_count', render: function(data, type, row) {
                    return (row.free_bonus_count > 0) ? (data / row.free_bonus_count).toFixed(2) : data;
                } },
                { data: 'bought_bonus_count' },
                { data: 'free_bonus_count' }
            ],
            paging: false,
            info: false,
            order: [[1, 'asc']],
        });
        
        $('#fun_stats tbody').on('click', 'td.dt-control', function () {
            var tr = $(this).closest('tr');
            var row = funStatsTable.row(tr);
     
            if (row.child.isShown()) {
                row.child.hide();
                tr.removeClass('shown');
            } else {
                row.child(format(row.data(), funGameBetStats[row.data().gameId])).show();
                tr.addClass('shown');
            }
        });
        
        overallTable = $('#overall_stats').DataTable({
            data: [],
            columns: [
                { data: 'currency' },
                { data: 'total_bets', render: toFixed },
                { data: 'total_wins', render: toFixed },
                { data: 'profit_loss', render: toFixed }
            ],
            order: [[1, 'asc']],
            paging: false,
            info: false,
            searching: false
        });
    }
    
    let windowColorInput = document.getElementById("windowColor")
    let backgroundColorInput = document.getElementById("backgroundColor")
    let fontColorInput = document.getElementById("fontColor")
    let clearDbButton = document.getElementById("clearDb")
    let deleteDbButton = document.getElementById("deleteDb")
    let createSessionButton = document.getElementById("createSession")
    let currentSession = document.getElementById("currentSession")
    
    if (windowColorInput) {
        windowColorInput.addEventListener("input", function() { updateColor() })
        windowColorInput.addEventListener("change", function() { saveSettings() })
    }
    if (backgroundColorInput) {
        backgroundColorInput.addEventListener("input", function() { updateColor() })
        backgroundColorInput.addEventListener("change", function() { saveSettings() })
    }
    if (fontColorInput) {
        fontColorInput.addEventListener("input", function() { updateFontColor() })
        fontColorInput.addEventListener("change", function() { saveSettings() })
    }
    if (clearDbButton) {
        clearDbButton.addEventListener("click", function() { clearDatabase() })
    }
    if (deleteDbButton) {
        deleteDbButton.addEventListener("click", function() { deleteDatabase() })
    }
    if (createSessionButton) {
        createSessionButton.addEventListener("click", function() { createNewSession() })
    }
    chrome.runtime.onMessage.addListener(messageHandler);
    chrome.runtime.sendMessage({ id: "registerStatsPage" }, function() {});
    chrome.runtime.sendMessage({ id: "getRecords" }, function() {});
    chrome.runtime.sendMessage({ id: "getSettings" }, function() {});
    if (currentSession) {
        isSessionPage = true
        chrome.runtime.sendMessage({ id: "getSessions" }, function() {});
        currentSession.addEventListener("change", function() {
            chrome.runtime.sendMessage({ id: "getSessionRecords", sessionId: currentSession.value }, function() {});
        })
    }
});