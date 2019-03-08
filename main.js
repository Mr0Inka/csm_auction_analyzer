const telegram = require('telegram-bot-api');

const fs = require('fs');
const request = require('request');
const WebSocket = require('ws');
const colors = require('colors');
var names = {};

var text2png = require('text2png');


var showListings = false;
var refreshInterval = 4000;

var currentBets = {};
var finished = {};

try{
	currentBets = JSON.parse(fs.readFileSync("betList.json"));
} catch(exception){
	currentBets = {};
	console.log(exception)
}

try{
	finished = JSON.parse(fs.readFileSync("fin.json"));
} catch(exception){
	finished = {};
	console.log(exception)
}

try{
	names = JSON.parse(fs.readFileSync("names.json"));
} catch(exception){
	currentBets = {};
	console.log(exception)
}

var streamStart = true;

var options = {
  headers: {
    'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36"
  }
}

loadNames()

function loadNames(){
    request.get("https://cs.money/js/database-skins/library-en-730.js?v=834", options, function(error, response, body) {
        try{
        	var parsedNames = JSON.parse(body.substring(21));
        	for(var key in parsedNames){
        		names[key] = parsedNames[key].m;
        	}
        	loadBets()
        	saveToFile("names", names)
        } catch(exception){
        	console.log(" [!] Can't load namelist!\n" + exception)
        	setTimeout(function(){ loadNames(); }, 5000);
        }
    })	
}

function loadBets(){
	var betCount = 0;
	var allBets = [];
    request.get("https://cs.money/auction/all_active_lots?appid=730", options, function(error, response, body) {
    	try{
    	    var items = JSON.parse(body);
    	    for(var i = 0; i < items.length; i++){
    	    	var stats = {
    	    		start: items[i].ap.startTimestamp,
    	    		end: items[i].ap.finishTimestamp,
    	    		price: items[i].p,
    	    		base: items[i].ap.startPrice,
    	    		inc: items[i].ap.incStep,
    	    		id: items[i].id[0],
    	    		name: names[items[i].o],
    	    		bets: items[i].ap.betsList,
    	    		float: ("f" in items[i]) ? items[i].f[0] : 0,
    	    		stickers: ("s" in items[i]) ? items[i].s[0] : false
    	    	}
    	    	betCount += stats.bets.length;
    	    	workBet(stats);
    	    	allBets.push(stats.id);
    	    }

    	    process.stdout.write(" ║║║ Loaded " + allBets.length + " auctions / " + betCount + " bid(s) (" + timeStamp() + ")\r");

	        for(var key in currentBets){
	        	if(allBets.indexOf(key) == -1){
	        		lotEnd(key);
	        	}
	        }
    	    
    	    setTimeout(function(){
    	    	loadBets();
    	    }, refreshInterval)
    	} catch(exception) {
	        console.log(colors.white("╔═══════════════════════════════════════════════════════════════════════════"))
	        console.log(colors.white("║ Unable to load current lots"))
	        console.log(colors.white("║ " + exception ))
	        console.log(colors.white("╚═══════════════════════════════════════════════════════════════════════════"))
    		setTimeout(function(){
    	    	loadBets();
    	    }, refreshInterval / 2)    	
    	}
    }) 
}

function workBet(item){
	if(item.id in currentBets){
	  if(item.bets.length != currentBets[item.id].bets.length){
	  console.log(colors.red("╔═══════════════════════════════════════════════════════════════════════════"))
	  console.log(colors.red("║ Bet: " + item.name))
	  console.log(colors.red("╠═══════════════════════════════════════════════════════════════════════════"))
	  console.log(colors.red("║ Time : " + timeStamp()));
	  console.log(colors.red("║ Float: " + item.float))	  
	  console.log(colors.red("║ Steps: " + item.inc + "$"))
	  console.log(colors.red("╠═══════════════════════════════════════════════════════════════════════════"))
	  console.log(colors.red("║ Base value: " + item.base + "$"))
	  console.log(colors.red("╠═══════════════════════════════════════════════════════════════════════════"))
	  console.log(colors.red("║ List of bids"))
	  for(var i = 0; i < item.bets.length; i++){
	  	console.log(colors.red("║   [" + (i + 1) + "] " + item.bets[i].price + "$"))
	  }
	  if(item.stickers && item.name.indexOf("Souvenir") == -1){
	  	var totalSticker = 0;
	  console.log(colors.red("╠═══════════════════════════════════════════════════════════════════════════"))
	  console.log(colors.red("║ List of stickers"))
	  	for(var i = 0; i < item.stickers.length; i++){
	  console.log(colors.red("║   [" + (i + 1) + "] " + names[item.stickers[i].o] + " (" + item.stickers[i].s + "$)"))
	  totalSticker += item.stickers[i].s;
	  	}
	    console.log(colors.red("╠═══════════════════════════════════════════════════════════════════════════"))
	  	console.log(colors.red("║ Total sticker value: " + totalSticker.toFixed(2) + "$"))
	  }
	  console.log(colors.red("╚═══════════════════════════════════════════════════════════════════════════"))
	  finished[item.id] = item;
	  saveToFile("fin", finished);
	  }
	  JSON.stringify(item.bets[i])
	  currentBets[item.id] = item;
	} else {
	  currentBets[item.id] = item;
	  if(showListings){
	    console.log(colors.grey("╔═══════════════════════════════════════════════════════════════════════════"))
	    console.log(colors.grey("║ Auction: " + item.name))
	    console.log(colors.grey("╠═══════════════════════════════════════════════════════════════════════════"))
	    console.log(colors.grey("║ Price: " + item.price + "$ (Steps: " + item.inc + "$)"))
	    console.log(colors.grey("║ Float: " + item.float))
	    if(item.stickers && item.name.indexOf("Souvenir") == -1){
	    console.log(colors.grey("╠═══════════════════════════════════════════════════════════════════════════"))
	    	for(var i = 0; i < item.stickers.length; i++){
	    console.log(colors.grey("║ S" + (i + 1) + ": " + names[item.stickers[i].o] + " (" + item.stickers[i].s + "$)"))
	    	}
	    }
	    console.log(colors.grey("╚═══════════════════════════════════════════════════════════════════════════"))
      }
	}
}


function saveToFile(name, content) {
  fs.truncate(name + ".json", 0, function() {
    fs.writeFile(name + ".json", JSON.stringify(content), function(err) {
      if (err) {
        log("Error saving " + name + ": " + err);
      }
    });
  });
}

function lotEnd(id){
	if(currentBets[id].bets.length == 0){
		delete currentBets[id];
	} else {
		var itemLine = ""
		var thisItem = currentBets[id];
	    console.log(colors.cyan("╔══════════════════════════════════════════"));
	    itemLine += "╔══════════════════════════════════════════\n"
	    console.log(colors.cyan("║ Sold: " + thisItem.name))
	    itemLine += "║ Sold: " + thisItem.name + "\n"
	    console.log(colors.cyan("╠══════════════════════════════════════════"));
	    itemLine += "╠══════════════════════════════════════════\n"
	    console.log(colors.cyan("║ Time : " + timeStamp()));
	    itemLine += "║ Time : " + timeStamp() + "\n"
	    console.log(colors.cyan("║ Float: " + thisItem.float));
	    itemLine += "║ Float: " + thisItem.float + "\n"
	    console.log(colors.cyan("╠══════════════════════════════════════════"));
	    itemLine += "╠══════════════════════════════════════════\n"
	    console.log(colors.cyan("║ Base value: " + thisItem.base + "$" + " (Steps: " + thisItem.inc + "$)"))
	    itemLine += "║ Base value: " + thisItem.base + "$" + " (Steps: " + thisItem.inc + ")$\n"
	    console.log(colors.cyan("╠══════════════════════════════════════════"))
	    itemLine += "╠══════════════════════════════════════════\n"
	    console.log(colors.cyan("║ List of bids"))
	    itemLine += "║ List of bids\n"
	    for(var i = 0; i < thisItem.bets.length; i++){
	  	  console.log(colors.cyan("║   [" + (i + 1) + "] " + thisItem.bets[i].price + "$"))
	  	  itemLine += "║   [" + (i + 1) + "] " + thisItem.bets[i].price + "$\n"
	    }
	    if(thisItem.stickers && thisItem.name.indexOf("Souvenir") == -1){
	    	var totalSticker = 0;
	    console.log(colors.cyan("╠═════════════════════════════════════════════════════════"))
	    itemLine += "╠══════════════════════════════════════════\n"
	    console.log(colors.cyan("║ List of stickers"))
	    itemLine += "║ List of stickers\n"
	    	for(var i = 0; i < thisItem.stickers.length; i++){
	    console.log(colors.cyan("║   [" + (i + 1) + "] " + names[thisItem.stickers[i].o] + " (" + thisItem.stickers[i].s + "$)"))
	    itemLine += "║   [" + (i + 1) + "] " + names[thisItem.stickers[i].o] + " (" + thisItem.stickers[i].s + "$)\n"
	        totalSticker += thisItem.stickers[i].s;
	    	}
	    console.log(colors.cyan("╠══════════════════════════════════════════"))
	    itemLine += "╠══════════════════════════════════════════\n"
	    console.log(colors.cyan("║ Total sticker value: " + totalSticker.toFixed(2) + "$"))
	    itemLine += "║ Total sticker value: " + totalSticker.toFixed(2) + "$\n"
	    }
	    console.log(colors.cyan("╚══════════════════════════════════════════"));
	    itemLine += "╚══════════════════════════════════════════"
		delete currentBets[id];
		genReceipt(itemLine, thisItem.name.replace(" | ", " _ "))
		saveToFile("betList", currentBets);
	}
}

function genReceipt(sendLine, name){
	var fileName = "./receipts/" + name + "_" + Date.now() + '.png'
	fs.writeFileSync(fileName, text2png(sendLine, {color: 'black'}));
	console.log("Saved")	
	sendPhoto(fileName, name)
}

function timeStamp() {
  var now = new Date();
  var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];
  var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];
  var suffix = ( time[0] < 12 ) ? "AM" : "PM";
  time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;
  time[0] = time[0] || 12;
  for ( var i = 1; i < 3; i++ ) {
    if ( time[i] < 10 ) {
      time[i] = "0" + time[i];
    }
  }
  return time.join(":") + " " + suffix;
}











//TELEGRAM 

var api = new telegram({
        token: "766031856:AAHDXnZeYz0x6W95dkWdXOx-E2PUZ8XRp74",
        updates: {
          enabled: true
    }
}); 

function sendMsg(message){
    try {
        api.sendMessage({chat_id: "304844103", text: message, parse_mode: "Markdown"});
    } catch (Exception) {
        console.log("Error sending a broadcast...")
    }
}

function sendPhoto(link, comment){
	api.sendPhoto({
		chat_id: "304844103",
		caption: comment,
		photo: link
	})
}


api.on('update', function(message){
  try{
    var messageString = (message.message.text).toLowerCase();
    var chatId = message.message.chat.id;
    var messageID = message.message.message_id;
    	switch(messageString) {
    	  case "kill":
    	      sendMsg("Received kill request!")
    	      setTimeout(function(){ process.exit() }, 2000);
    	  case "ping":
    	  	sendMsg("pong")
    	  break;
    	  default:
    	 	  sendMsg("ChatID: " + chatId)
     }
  } catch(exception){
      console.log("Unable to process telegram listener: \n" + exception)
  }
});
