let ShaddasMiningMod = {};
ShaddasMiningMod.CSRFToken = document.querySelectorAll('[name="csrf-token"]')[0].content;
ShaddasMiningMod.mineDone = 0;
ShaddasMiningMod.autoMining = false;

//prospects and mines at the area and sets a timeout to mineAgain() once the mining session is done
ShaddasMiningMod.goMining = async function(area = "/game/mining/prospect_field?field=Field%3A%3AWesternCanyon") {
    await fetch(area, {
    "headers": {
        "X-CSRF-Token": ShaddasMiningMod.CSRFToken
    },
    "method": "POST",
    "mode": "cors"
    });

    await fetch("https://ageoftrades.com/game/mining/start_mining", {
    "headers": {
        "X-CSRF-Token": ShaddasMiningMod.CSRFToken
    },
    "method": "POST",
    "mode": "cors"
    }).then(response => {
        response.text().then(text => {
            let dateString = text.substring(text.indexOf("var cd_"));
            dateString = dateString.substring(dateString.indexOf("Date")+7, dateString.indexOf("\\\").getTime();"));
            let timeLeft = new Date(dateString).getTime() - Date.now();
            ShaddasMiningMod.setTimer(timeLeft);
            setTimeout(ShaddasMiningMod.mineAgain, timeLeft+500);
        });
    });
}

//toggles the automining functionality on and off
ShaddasMiningMod.autoMine = async function() {
    if (!ShaddasMiningMod.autoMining) {
        ShaddasMiningMod.autoMining = true;
        ShaddasMiningMod.first = true;
        ShaddasMiningMod.oldTitle = document.title;
        document.title = "Age of Trades - Auto Mining";
        ShaddasMiningMod.goMining(document.getElementById("ShaddasMiningModLocationSelect").value);
    } else {
        ShaddasMiningMod.autoMining = false;
        document.title = ShaddasMiningMod.oldTitle;
    }
}

//restarts the mining progress after looking if there is any food left etc.
ShaddasMiningMod.mineAgain = async function() {
    ShaddasMiningMod.logResult();
    if (ShaddasMiningMod.autoMining) {
        if ((document.getElementById("ShaddasMiningModFishToggle")==null && ShaddasMiningMod.lastFishToggle) || document.getElementById("ShaddasMiningModFishToggle").checked) {
            ShaddasMiningMod.foodCyclingStuff();
        }
        if (!ShaddasMiningMod.checkCurrentFood()) {
            ShaddasMiningMod.autoMine();
            return;
        }
        let location = document.getElementById("ShaddasMiningModLocationSelect");
        if (location==null) {
            location = ShaddasMiningMod.lastSelectedLocation;
        } else {
            location = location.value;
        }
        ShaddasMiningMod.goMining(location);
    }
}

//the timer in the mod card that shows how much time is left (little buggy sometimes I think, but not that important)
ShaddasMiningMod.setTimer = function(time) {
    if (typeof(time) != "number" || isNaN(time)) {
        return;
    }
    setTimeout(() => {
        if (document.getElementById("ShaddasMiningModTimer")==null) {
            ShaddasMiningMod.setTimer(time-1000);
            return;
        }
        if (time<0) {
            document.getElementById("ShaddasMiningModTimer").innerHTML = ""; 
        } else {
            document.getElementById("ShaddasMiningModTimer").innerHTML = Math.floor(time/1000) + " seconds until next.";
            ShaddasMiningMod.setTimer(time-1000);
        }
    }, 1000);
}

//removes the current prospectus card
ShaddasMiningMod.removeProspectus = function() {
    let miningPage = document.getElementById("mining-page");
    let prospecting = miningPage.children;
    let brokeOut = false;
    for (let child of prospecting) {
        if (child.children[0].innerHTML == "\nCurrent prospectus\n" || child.children[0].innerHTML == "Current prospectus") {
            prospecting = child;
            brokeOut = true;
            break;
        }
    }
    if (brokeOut) {
        ShaddasMiningMod.logProspect(prospecting);
        ShaddasMiningMod.logResult();
        miningPage.removeChild(prospecting);
    }
}

//creates a list of all mining locations available
ShaddasMiningMod.getAllMiningLocations = function() {
    let tableRows = document.getElementById("mining-page").children;
    for (let child of tableRows) {
        if (child.children[0].innerHTML == "\nKnown areas\n" || child.children[0].innerHTML == "Known areas") {
            tableRows = child;
            break;
        }
    }
    tableRows = tableRows.children[1].children[0].children[0].children;
    let locations = {};
    for (let row of tableRows) {
        let name = row.children[0].innerHTML;
        if (row.children[1].children[0]==null) {
            return {"Reload the page once you are not currently mining AND you have selected a non-depleted food so that the mod can do its magic":undefined};
        }
        locations[name] = row.children[1].children[0].href;
    }
    return locations;
}

//checks whether the current food is depleted or not
ShaddasMiningMod.checkCurrentFood = function() {
    if (Number.parseInt(document.getElementById(ShaddasMiningMod.currentFood).children[1].innerHTML)>0) {
        return true;
    } else {
        return false;
    }
}

//selects the first food that is not depleted
ShaddasMiningMod.selectNextFood = async function() {
    for (let food of ShaddasMiningMod.foods) {
        if (Number.parseInt(document.getElementById(food).children[1].innerHTML)>0) {
            fetch("https://ageoftrades.com/game/mining/select_food?food=Item%3A%3A"+food, {
                "headers": {
                    "X-CSRF-Token": ShaddasMiningMod.CSRFToken
                },
                "method": "POST",
                "mode": "cors"
            });
            ShaddasMiningMod.currentFood = food;
            return;
        }
    }
    //no more food left, so stop auto mining
    ShaddasMiningMod.autoMine();
}

//main food cycling method calling all the other food methods
ShaddasMiningMod.foodCyclingStuff = async function() {
    ShaddasMiningMod.getAllFoods();
    if (!ShaddasMiningMod.checkCurrentFood()) {
        ShaddasMiningMod.selectNextFood();
    }
}

//two functionalities:
//1. creates a list of all foods
//2. adds ids to each food tablerow, which needs to be done again and again as the cards all get reset periodically
ShaddasMiningMod.getAllFoods = function() {
    let tableRows = document.getElementById("mining-page").children;
    for (let child of tableRows) {
        if (child.children[0].innerHTML == "\nFood (energy)\n" || child.children[0].innerHTML == "Food (energy)") {
            tableRows = child;
            break;
        }
    }
    tableRows = tableRows.children[1].children[1].children[1].children;
    let food = [];
    for (let row of tableRows) {
        let parts = row.children[0].innerHTML.split(" ");
        let name = "";
        for (let part of parts) {
            name += part[0].toUpperCase() + part.slice(1);
        }
        row.id = name;
        food.push(name);

        if (row.children[3].innerHTML == "\nCurrently selected\n" || row.children[3].innerHTML == "Currently selected") {
            ShaddasMiningMod.currentFood = name;
        }
    }
    return food;
}

//sets up the custom mod card
ShaddasMiningMod.setupUI = function() {
    let page = document.getElementById("mining-page");

    let card = document.createElement("div");
    card.id = "ShaddasMiningModCard";
    card.classList.add("card");

    let cardHeader = document.createElement("div");
    cardHeader.classList.add("card-header");
    cardHeader.innerHTML = "Mine automatically";

    let cardBody = document.createElement("div");
    cardBody.classList.add("card-body");

    let description = document.createElement("p");
    description.innerHTML = "Automatically mines at the selected location until there is no more food OR you refresh the page OR you click this button again!";


    let button = document.createElement("button");
    button.onclick = () => {
        button.innerHTML = !ShaddasMiningMod.autoMining ? "Stop automining" : "Start automining";
        ShaddasMiningMod.autoMine();
    }

    button.innerHTML = ShaddasMiningMod.autoMining ? "Stop automining" : "Start automining";
    button.classList.add("btn");
    button.classList.add("btn-sm");
    button.classList.add("btn-primary");

    let locText = document.createElement("div");
    locText.style.display = "inline";
    locText.innerHTML = "Location: ";
    let locSelection = document.createElement("select");
    locSelection.id = "ShaddasMiningModLocationSelect";
    for (let location in ShaddasMiningMod.miningLocations) {
        let option = document.createElement("option");
        option.value = ShaddasMiningMod.miningLocations[location];
        option.innerHTML = location;
        locSelection.appendChild(option);
    }

    let fishText = document.createElement("div");
    fishText.style.display = "inline";
    fishText.innerHTML = "Use all fish types: ";
    let fishToggle = document.createElement("input");
    fishToggle.id = "ShaddasMiningModFishToggle";
    fishToggle.type = "checkBox";


    let timer = document.createElement("p");
    timer.id = "ShaddasMiningModTimer";

    cardBody.appendChild(description);
    cardBody.appendChild(button);
    cardBody.appendChild(document.createElement("p"));
    cardBody.appendChild(locText);
    cardBody.appendChild(locSelection);
    cardBody.appendChild(document.createElement("p"));
    cardBody.appendChild(fishText);
    cardBody.appendChild(fishToggle);
    cardBody.appendChild(document.createElement("p"));
    cardBody.appendChild(timer);
    card.appendChild(cardHeader);
    card.appendChild(cardBody);

    page.insertBefore(card, page.children[0]);    
}

//readds the UI as it get's deleted periodically when all cards are getting reset
ShaddasMiningMod.keepUI = function() {
    let locSelection = document.getElementById("ShaddasMiningModLocationSelect");
    let fishToggle = document.getElementById("ShaddasMiningModFishToggle");
    if (locSelection==null) {
        ShaddasMiningMod.setupUI();
        document.getElementById("ShaddasMiningModLocationSelect").value = ShaddasMiningMod.lastSelectedLocation;
        document.getElementById("ShaddasMiningModFishToggle").checked = ShaddasMiningMod.lastFishToggle;
    } else {
        ShaddasMiningMod.lastSelectedLocation = locSelection.value;
        ShaddasMiningMod.lastFishToggle = fishToggle.checked;
    }
}

//logging stuff, disabled by default (if I remember to switch ShaddasMiningMod.logging to false...)
ShaddasMiningMod.logProspect = function(pElement) {
    if (!ShaddasMiningMod.logging) {
        return;
    }
    let logArr = JSON.parse(localStorage.getItem("ShaddasMiningModPLog"));
    if (logArr==null) {
        logArr = [];
    }
    let entryObj = {};
    let now = Date.now();
    let table = pElement.children[1].children[0].children[0];
    entryObj["area"] = table.children[0].children[1].innerHTML.replace(/\n/g, "");
    entryObj["food"] = table.children[1].children[1].innerHTML.replace(/\n/g, "");
    let tmp = table.children[2].children[1].innerHTML.replace(/\n/g, "").replace("I'm able to mine a", "").replace(" amount of","").replace("orein ","").replace(" seconds", "").split(" ");
    entryObj["amount"] = tmp[0];
    entryObj["ore"] = tmp[1];
    entryObj["time"] = tmp[2];
    entryObj["now"] = now;
    logArr.push(entryObj);
    localStorage.setItem("ShaddasMiningModPLog", JSON.stringify(logArr));
}

//more logging stuff, also disabled by default
ShaddasMiningMod.lastNotificationLength = 0;
ShaddasMiningMod.logResult = function() {
    if (!ShaddasMiningMod.logging) {
        return;
    }
    let logArr = JSON.parse(localStorage.getItem("ShaddasMiningModRLog"));
    if (logArr==null) {
        logArr = [];
    }
    let now = Date.now();
    let allMessages = document.getElementById("socialbox").children[1].children;
    let notifications = [];
    for (let i = 0; i < allMessages.length; i++) {
        if (allMessages[i].classList.contains("notification")) {
            let text = allMessages[i].children[1].innerHTML.replace(/\n/g, "");
            if (text.indexOf("You started mining in")==0) {
                notifications.push(allMessages[i]);
            }
        }
    }
    for (let i = ShaddasMiningMod.lastNotificationLength; i < notifications.length; i++) {
        let entryObj = {};
        let now = Date.now();
        let tmp1 = notifications[i].children[1].innerHTML.replace(/\n/, "").replace("You started mining in ", "").replace(" and received  ", "_");
        let tmpSplit = tmp1.split("_");
        entryObj["area"] = tmpSplit[0];
        tmp = tmpSplit[1];
        entryObj["amount"] = tmp.match(/[\d]+/)[0];
        tmp = tmp.substring(tmp.indexOf(entryObj["amount"]) + entryObj["amount"].length + 1);
        entryObj["ore"] = tmp.split(" ")[0];
        entryObj["xp"] = tmp.match(/[\d]+/)[0];
        entryObj["now"] = now;
        logArr.push(entryObj);
    }
    ShaddasMiningMod.lastNotificationLength = notifications.length;
    localStorage.setItem("ShaddasMiningModRLog", JSON.stringify(logArr));
}

//returns the prospect logs in a excel-pastable format
ShaddasMiningMod.getPLog = function() {
	let pLog = JSON.parse(localStorage.getItem("ShaddasMiningModPLog"));
	let ret = "";
	for (let [key, value] of Object.entries(pLog[0])) {
        ret += key + "	";
    }
    ret += "\n";
    for (let i = 0; i < pLog.length; i++) {
        for (let [key, value] of Object.entries(pLog[i])) {
            ret += value + "	";
        }
        ret += "\n";
    }
    return ret;
}

//returns the result logs in a excel-pastable format
ShaddasMiningMod.getRLog = function() {
	let rLog = JSON.parse(localStorage.getItem("ShaddasMiningModRLog"));
	let ret = "";
	for (let [key, value] of Object.entries(rLog[0])) {
        ret += key + "	";
    }
    ret += "\n";
    for (let i = 0; i < rLog.length; i++) {
        for (let [key, value] of Object.entries(rLog[i])) {
            ret += value + "	";
        }
        ret += "\n";
    }
    return ret;
}

//returns all logs in a excel-pastable format
ShaddasMiningMod.getLog = function() {
    let pLog = JSON.parse(localStorage.getItem("ShaddasMiningModPLog"));
    let rLog = JSON.parse(localStorage.getItem("ShaddasMiningModRLog"));

    let ret = "";

    //add the column headers
    for (let [key, value] of Object.entries(pLog[0])) {
        ret += key + "	";
    }
    ret += "||" + "	";
    for (let [key, value] of Object.entries(rLog[0])) {
        ret += key + "	";
    }
    ret += "\n";
    for (let i = 0; i < rLog.length; i++) {
        for (let [key, value] of Object.entries(pLog[i])) {
            ret += value + "	";
        }
        ret += "	";
        for (let [key, value] of Object.entries(rLog[i])) {
            ret += value + "	";
        }
        ret += "\n";
    }
    return ret;
}

//creates a button to get the logs copied to clipboard
ShaddasMiningMod.createLogButton = function(type = "a") {
    let button = document.createElement("button");
    button.innerHTML = "Get Logs!";
    button.onclick = ()=> {
    	if (type==="a") {
    		ShaddasMiningMod.copyTextToClipboard(ShaddasMiningMod.getLog());
    	} else if (type==="p") {
            ShaddasMiningMod.copyTextToClipboard(ShaddasMiningMod.getPLog());
    	} else if (type==="r") {
            ShaddasMiningMod.copyTextToClipboard(ShaddasMiningMod.getRLog());
    	}
        document.body.removeChild(button);
    }
    document.body.insertBefore(button, document.body.children[0]);
}

ShaddasMiningMod.copyTextToClipboard = function(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position="fixed";  //avoid scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
    } catch (err) {

    }

    document.body.removeChild(textArea);
}

//only set up the mod if on the mining page
if (window.location.href == "https://ageoftrades.com/game/mining") {
    ShaddasMiningMod.logging = false;

    ShaddasMiningMod.miningLocations = ShaddasMiningMod.getAllMiningLocations();
    ShaddasMiningMod.foods = ShaddasMiningMod.getAllFoods();
    ShaddasMiningMod.setupUI();
    setInterval(ShaddasMiningMod.keepUI, 1000);
    setInterval(ShaddasMiningMod.removeProspectus, 1000);
}