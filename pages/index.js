var table = null
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
    } else if (msg.id == "reloadRecords") {
        reloadRecords(msg.data)
    } else if (msg.id == "reloadBetRecords") {
        reloadBetRecords(msg.data)
    } else if (msg.id == "logResponse") {
        logResponse(msg.data, msg.spin)
    }
    sendResponse()
}

function updateColor() {
    let value = parseInt(document.getElementById("colorValue").value)
    let elements = document.getElementsByClassName("boxHeader")
    let color = "#" + (65 + value).toString(16) + (71 + value).toString(16) + (118 + value).toString(16)
    for (let element of elements) {
        element.style.backgroundColor = color
    }
    
    elements = document.getElementsByClassName("boxWithShadow")
    for (let element of elements) {
        try {
        let image = 'linear-gradient(to bottom right, ' + color + ', #0E1134)';
        console.log(image)
        element.style.backgroundImage = image
        } catch(e) {
            console.log(e)
        }
    }
}

function reloadRecords(data) {
    console.log(data)
    table.clear()
    table.rows.add(data).draw()
    games = {}
    for (let i = 0; i < table.data().count(); ++i) {
        let rowData = table.row(i).data()
        games[rowData.gameId] = i
    }
}

function reloadBetRecords(data) {
    gameBetStats = {}
    for (let record of data) {
        updateBetRecord(record)
    }
}

function updateRecord(gameStats) {
    console.log(gameStats);
    if (gameStats.gameId in games) {
        let index = games[gameStats.gameId]
        table.row(index).data(gameStats).draw()
    } else {
        table.row.add(gameStats).draw()
        console.log(table.data().count())
        games[gameStats.gameId] = table.data().count() - 1
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
        table.row(index).draw()
    }
}

function logResponse(data, spin) {
    let content = "<p>\"" + data.body.replaceAll("@", "\\@") + "\" => { \"response\" => \"" + data.response + "\", \"expected\" => \"" + JSON.stringify(spin).replaceAll("\"", "\\\"") + "\" } </p>"
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
 
$(document).ready(function () {
    console.log("creating table")
    table = $('#example').DataTable({
        data: [],
        columns: [
            {
                className: 'dt-control',
                orderable: false,
                data: null,
                defaultContent: '',
            },
            { data: 'gameId' },
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
    $('#example tbody').on('click', 'td.dt-control', function () {
        var tr = $(this).closest('tr');
        var row = table.row(tr);
 
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
    
    document.getElementById("colorValue").addEventListener("input", function() { updateColor() })
    chrome.runtime.onMessage.addListener(messageHandler);
    chrome.runtime.sendMessage({ id: "registerStatsPage" }, function() {});
    chrome.runtime.sendMessage({ id: "getRecords" }, function() {});
});