
chrome.action.onClicked.addListener(function () {
    chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.id === 'registerGame') {
        console.log(sender);
        chrome.storage.local.set({"registerGame": "registerGame_asd"}, function() {
            console.log('Value is set to registerGame');
        });
        chrome.storage.local.get(['registerGame'], function(result) {
        console.log('### Value currently is ' + result.registerGame);
    });
    }
    sendResponse()
});


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
