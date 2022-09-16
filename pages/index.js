console.log("asasasasa")


chrome.storage.local.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
    console.log($("#name"))
    $("#name").text(newValue)
  }
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    console.log("### from index.js" + msg);
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
});
