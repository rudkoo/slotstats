var overallTable = null
var slotsTable = null
var funStatsTable = null
var games = {}
var gameBetStats = {}
var funGames = {}
var funGameBetStats = {}

chrome.storage.local.onChanged.addListener(function (changes, namespace) {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        console.log(
          `Storage key "${key}" in namespace "${namespace}" changed.`,
          `Old value was "${oldValue}", new value is "${newValue}".`
        );
    }
});

function messageHandler(msg, sender, sendResponse) {
    console.log("### from index.js: " + msg.id);
    if (msg.id == "activeGameChanged") {
        $("#name").text(msg.gameId)
    } else if (msg.id == "updateRecord") {
        updateRecord(msg.gameStats, msg.isFunGame)
    } else if (msg.id == "updateBetRecord") {
        updateBetRecord(msg.betStats, msg.isFunGame)
        updateOverallTable()
    } else if (msg.id == "reloadRecords") {
        reloadRecords(msg.data, msg.funData)
    } else if (msg.id == "reloadBetRecords") {
        reloadBetRecords(msg.data, msg.funData)
        updateOverallTable()
    } else if (msg.id == "settingsChanged") {
        updateSettings(msg.settings)
    } else if (msg.id == "reloadSessions") {
        reloadSessions(msg.data)
    } else if (msg.id == "reloadSessionRecords") {
        reloadSessionRecords(msg.data, msg.funData)
    } else if (msg.id == "reloadSessionBetRecords") {
        reloadSessionBetRecords(msg.data, msg.funData)
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
    let backgroundColorPicker = document.getElementById("backgroundColor")
    let elements = document.getElementsByClassName("boxHeader")
    let backgroundColor = backgroundColorPicker.value
    let rgb = hexToRgbA(backgroundColor)
    let secondaryColor = "#"
    
    for (let i = 0; i < rgb.length; ++i) {
        rgb[i] = Math.max(rgb[i] - 96, 0)
        secondaryColor += ("00" + rgb[i].toString(16)).slice(-2)
    }
    for (let element of elements) {
        element.style.backgroundColor = backgroundColor
    }
    elements = document.getElementsByClassName("boxWithShadow")
    for (let element of elements) {
        let image = 'linear-gradient(to bottom right, ' + backgroundColor + ', ' + secondaryColor + ')';
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

function updateSettings(settings) {
    console.log(settings)
    let fontColorPicker = document.getElementById("fontColor")
    let backgroundColorPicker = document.getElementById("backgroundColor")
    if (fontColorPicker && backgroundColorPicker) {
        backgroundColorPicker.value = settings.backgroundColor
        fontColorPicker.value = settings.fontColor
        updateColor()
        updateFontColor()
    }
}

function saveSettings() {
    let fontColorPicker = document.getElementById("fontColor")
    let backgroundColorPicker = document.getElementById("backgroundColor")
    let settings = { backgroundColor: backgroundColorPicker.value, fontColor: fontColorPicker.value }
    console.log(settings)
    chrome.runtime.sendMessage({ id: "saveSettings", settings: settings }, function() {});
}

function clearDatabase() {
    chrome.runtime.sendMessage({ id: "clearDatabase" }, function() {});
}

function deleteDatabase() {
    chrome.runtime.sendMessage({ id: "deleteDatabase" }, function() {});
}

function reloadRecords(data, funData) {
    slotsTable.clear()
    slotsTable.rows.add(data).draw()
    funStatsTable.clear()
    funStatsTable.rows.add(funData).draw()
    
    games = {}
    funGames = {}
    for (let i = 0; i < slotsTable.data().count(); ++i) {
        let rowData = slotsTable.row(i).data()
        games[rowData.gameId] = i
    }
    for (let i = 0; i < funStatsTable.data().count(); ++i) {
        let rowData = funStatsTable.row(i).data()
        funGames[rowData.gameId] = i
    }
}

function reloadBetRecords(data, funData) {
    gameBetStats = {}
    funGameBetStats = {}
    for (let record of data) {
        updateBetRecord(record, false)
    }
    for (let record of funData) {
        updateBetRecord(record, true)
    }
    
}

function updateOverallTable() {
    let overallData = {}
    for (let gameId in gameBetStats) {
        for (let currency in gameBetStats[gameId]) {
            if (!overallData[currency]) {
                overallData[currency] = { "total_bets": 0, "total_wins": 0, "profit_loss": 0  }
            }
            overallData[currency]["total_bets"] += gameBetStats[gameId][currency].total_bets
            overallData[currency]["total_wins"] += gameBetStats[gameId][currency].total_wins
            overallData[currency]["profit_loss"] = overallData[currency]["total_wins"] - overallData[currency]["total_bets"]
        }
    }
    for (let gameId in funGameBetStats) {
        for (let currency in funGameBetStats[gameId]) {
            let funCurrency = "Fun_" + currency
            if (!overallData[funCurrency]) {
                overallData[funCurrency] = { "total_bets": 0, "total_wins": 0, "profit_loss": 0  }
            }
            overallData[funCurrency]["total_bets"] += funGameBetStats[gameId][currency].total_bets
            overallData[funCurrency]["total_wins"] += funGameBetStats[gameId][currency].total_wins
            overallData[funCurrency]["profit_loss"] = overallData[funCurrency]["total_wins"] - overallData[funCurrency]["total_bets"]
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

function updateRecord(gameStats, isFunGame) {
    
    let table = isFunGame ? funStatsTable : slotsTable
    let gameStatsData = isFunGame ? funGames : games
    if (gameStats.gameId in gameStatsData) {
        let index = gameStatsData[gameStats.gameId]
        table.row(index).data(gameStats).draw()
    } else {
        table.row.add(gameStats).draw()
        gameStatsData[gameStats.gameId] = table.data().count() - 1
    }
}

function updateBetRecord(betStats, isFunGame) {
    
    let table = isFunGame ? funStatsTable : slotsTable
    let gameStatsData = isFunGame ? funGames : games
    let betStatsData = isFunGame ? funGameBetStats : gameBetStats
    
    if (!(betStats.gameId in betStatsData)) {
        betStatsData[betStats.gameId] = {}
    }
    
    betStatsData[betStats.gameId][betStats.currency] = betStats
    if (betStats.gameId in gameStatsData) {
        let index = gameStatsData[betStats.gameId]
        let row = table.row(index)
        table.row(index).draw()
        row.child(format(row.data(), betStatsData[row.data().gameId]))
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

function addSessionToList(sessionData) {
    if ($('#currentSession')) {
        let text = sessionLabelFormat(sessionData)
        $('#currentSession').append(new Option(text, sessionData.sessionId))
    }
}

function reloadSessions(sessionData) {
    for (let item of sessionData) {
        addSessionToList(item)
    }
}
 
function reloadSessionRecords(statsData, funStatsData) {
}

function reloadSessionBetRecords(statsData, funStatsData) {
}

function createNewSession() {
    chrome.runtime.sendMessage({ id: "createNewSession" }, function() {});
}

function newSessionCreated(newSession) {
    addSessionToList(newSession)
}

function updateSession(updatedSession) {
    let sessionSelector = $('#currentSession')
    if (sessionSelector) {
        let options = sessionSelector.children()
        for (let i = options.length-1; i >= 0; --i) {
            if (options[i].value == updatedSession.sessionId) {
                options[i].text = sessionLabelFormat(updatedSession)
                break
            }
        }
    }
}

function logResponse(data, spin) {
    let content = "<p>{ \"key\" => \"" + data.body.replaceAll("@", "\\@") + "\", \"response\" => \"" + data.response.replaceAll("\"", "\\\"") + "\", \"expected\" => \"" + JSON.stringify(spin).replaceAll("\"", "\\\"") + "\" },</p>"
    $("#responseLog").append(content)
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
    console.log("creating table")
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
            { data: 'max_x' },
            { data: 'avg_x' },
            { data: 'bought_bonus_count' },
            { data: 'free_bonus_count' },
            { data: 'spin_count' },
            { data: 'spin_count_since_bonus' },
            { data: 'spin_count', render: function(data, type, row) {
                return (row.free_bonus_count > 0) ? data / row.free_bonus_count : data;
            } }
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
            { data: 'max_x' },
            { data: 'avg_x' },
            { data: 'bought_bonus_count' },
            { data: 'free_bonus_count' },
            { data: 'spin_count' },
            { data: 'spin_count_since_bonus' },
            { data: 'spin_count', render: function(data, type, row) {
                return (row.free_bonus_count > 0) ? data / row.free_bonus_count : data;
            } }
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
    
    let backgroundColorInput = document.getElementById("backgroundColor")
    let fontColorInput = document.getElementById("fontColor")
    let clearDbButton = document.getElementById("clearDb")
    let deleteDbButton = document.getElementById("deleteDb")
    let createSessionButton = document.getElementById("createSession")
    let currentSession = document.getElementById("currentSession")
    
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
        chrome.runtime.sendMessage({ id: "getSessionRecords" }, function() {});
    }
});