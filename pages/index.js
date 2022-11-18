var overallTable = null
var slotsTable = null
var games = {}
var gameBetStats = {}

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
        updateRecord(msg.gameStats)
    } else if (msg.id == "updateBetRecord") {
        updateBetRecord(msg.betStats)
        updateOverallTable()
    } else if (msg.id == "reloadRecords") {
        reloadRecords(msg.data)
    } else if (msg.id == "reloadBetRecords") {
        reloadBetRecords(msg.data)
        updateOverallTable()
    } else if (msg.id == "settingsChanged") {
        updateSettings(msg.settings)
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

function reloadRecords(data) {
    console.log(data)
    slotsTable.clear()
    slotsTable.rows.add(data).draw()
    games = {}
    for (let i = 0; i < slotsTable.data().count(); ++i) {
        let rowData = slotsTable.row(i).data()
        games[rowData.gameId] = i
    }
}

function reloadBetRecords(data) {
    gameBetStats = {}
    for (let record of data) {
        updateBetRecord(record)
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

function updateRecord(gameStats) {
    console.log(gameStats);
    if (gameStats.gameId in games) {
        let index = games[gameStats.gameId]
        slotsTable.row(index).data(gameStats).draw()
    } else {
        slotsTable.row.add(gameStats).draw()
        console.log(slotsTable.data().count())
        games[gameStats.gameId] = slotsTable.data().count() - 1
        console.log(games[gameStats.gameId])
    }
}

function updateBetRecord(betStats) {
    console.log(betStats);
    if (!(betStats.gameId in gameBetStats)) {
        gameBetStats[betStats.gameId] = {}
    }
    
    gameBetStats[betStats.gameId][betStats.currency] = betStats
    if (betStats.gameId in games) {
        let index = games[betStats.gameId]
        let row = slotsTable.row(index)
        slotsTable.row(index).draw()
        row.child(format(row.data()))
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

function format(d) {
    let betStats = gameBetStats[d.gameId]
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
        order: [[1, 'asc']],
    });
 
    // Add event listener for opening and closing details
    $('#slot_stats tbody').on('click', 'td.dt-control', function () {
        var tr = $(this).closest('tr');
        var row = slotsTable.row(tr);
 
        if (row.child.isShown()) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        } else {
            // Open this row
            row.child(format(row.data())).show();
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
    chrome.runtime.onMessage.addListener(messageHandler);
    chrome.runtime.sendMessage({ id: "registerStatsPage" }, function() {});
    chrome.runtime.sendMessage({ id: "getRecords" }, function() {});
    chrome.runtime.sendMessage({ id: "getSettings" }, function() {});
});