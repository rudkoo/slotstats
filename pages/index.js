var table = null

chrome.storage.local.onChanged.addListener(function (changes, namespace) {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        console.log(
          `Storage key "${key}" in namespace "${namespace}" changed.`,
          `Old value was "${oldValue}", new value is "${newValue}".`
        );
    }
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    console.log("### from index.js: " + msg.id);
    if (msg.id == "activeGameChanged") {
        $("#name").text(msg.gameId)
    } else if (msg.id == "updateRecord") {
        dataSet[0].name += "+"
        console.log(dataSet[0].name)
        table.row(0).data(dataSet[0])
    }
    sendResponse()
});

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

window.addEventListener('load', (event) => {
    document.getElementById("colorValue").addEventListener("input", function() { updateColor() })
    chrome.runtime.sendMessage({ id: "registerStatsPage" }, function() {});
});

function format(d) {
    // `d` is the original data object for the row
    return (
        '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">' +
        '<tr>' +
        '<td>Full name:</td>' +
        '<td>' +
        d.name +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>Extension number:</td>' +
        '<td>' +
        d.extn +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>Extra info:</td>' +
        '<td>And any further details here (images etc)...</td>' +
        '</tr>' +
        '</table>'
    );
}

var dataSet = [
    {
      "id": "1",
      "name": "Tiger Nixon",
      "position": "System Architect",
      "salary": "$320,800",
      "start_date": "2011/04/25",
      "office": "Edinburgh",
      "extn": "5421"
    },
    {
      "id": "2",
      "name": "Garrett Winters",
      "position": "Accountant",
      "salary": "$170,750",
      "start_date": "2011/07/25",
      "office": "Tokyo",
      "extn": "8422"
    }
]
 
$(document).ready(function () {
    table = $('#example').DataTable({
        data: dataSet,
        columns: [
            {
                className: 'dt-control',
                orderable: false,
                data: null,
                defaultContent: '',
            },
            { data: 'name' },
            { data: 'position' },
            { data: 'office' },
            { data: 'salary' },
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
});