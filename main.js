const fs = require('fs');
const request = require('request');
const WebSocket = require('ws');
const colors = require('colors');
var names = {};

var currentBets = {};
var finished = {};

try{
	currentBets = JSON.parse(fs.readFileSync("betList.json"));
} catch(exception){
	currentBets = {};
	console.log(exception)
}

try{
	currentBets = JSON.parse(fs.readFileSync("fin.json"));
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
        } catch(exception){
        	console.log(" [!] Can't load namelist!")
        	setTimeout(function(){ loadNames(); }, 5000);
        }
    })	
}

function loadBets(){
	var allBets = [];
	saveToFile("betList", currentBets);
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
    	    	workBet(stats);
    	    	allBets.push(stats.id);
    	    }

	        for(var key in currentBets){
	        	if(allBets.indexOf(key) == -1){
	        		lotEnd(key);
	        	}
	        }
    	    
    	    setTimeout(function(){
    	    	loadBets();
    	    }, 5000)
    	} catch(exception) {
	        console.log(colors.white("╔═══════════════════════════════════════════════════════════════════════════"))
	        console.log(colors.white("║ Unable to load current lots"))
	        console.log(colors.white("║ " + exception ))
	        console.log(colors.white("╚═══════════════════════════════════════════════════════════════════════════"))
    		setTimeout(function(){
    	    	loadBets();
    	    }, 10000)    	
    	}
    }) 
}

function workBet(item){
	if(item.id in currentBets){
	  if(item.bets.length != currentBets[item.id].bets.length){
	  console.log(colors.red("╔═══════════════════════════════════════════════════════════════════════════"))
	  console.log(colors.red("║ Bet: " + item.name))
	  console.log(colors.red("╠═══════════════════════════════════════════════════════════════════════════"))
	  console.log(colors.red("║ Float: " + item.float))	  
	  console.log(colors.red("║ Steps: " + item.inc + "$"))
	  console.log(colors.red("╠═══════════════════════════════════════════════════════════════════════════"))
	  console.log(colors.red("║ Base : " + item.base + "$"))
	  for(var i = 0; i < item.bets.length; i++){
	  	console.log(colors.red("║ > Bet: " + item.bets[i].price + "$"))
	  }
	  if(item.stickers && item.name.indexOf("Souvenir") == -1){
	  console.log(colors.red("╠═══════════════════════════════════════════════════════════════════════════"))
	  	for(var i = 0; i < item.stickers.length; i++){
	  console.log(colors.red("║ S" + (i + 1) + ": " + names[item.stickers[i].o] + " (" + item.stickers[i].s + "$)"))
	  	}
	  }
	  console.log(colors.red("╚═══════════════════════════════════════════════════════════════════════════"))
	  finished[item.id] = item;
	  saveToFile("fin", finished);
	  }
	  JSON.stringify(item.bets[i])
	  currentBets[item.id] = item;
	} else {
	  currentBets[item.id] = item;
	  console.log(colors.cyan("╔═══════════════════════════════════════════════════════════════════════════"))
	  console.log(colors.cyan("║ Auction: " + item.name))
	  console.log(colors.cyan("╠═══════════════════════════════════════════════════════════════════════════"))
	  console.log(colors.cyan("║ Price: " + item.price + "$"))
	  console.log(colors.cyan("║ Steps: " + item.inc + "$"))
	  console.log(colors.cyan("║ Float: " + item.float))
	  if(item.stickers && item.name.indexOf("Souvenir") == -1){
	  console.log(colors.cyan("╠═══════════════════════════════════════════════════════════════════════════"))
	  	for(var i = 0; i < item.stickers.length; i++){
	  console.log(colors.cyan("║ S" + (i + 1) + ": " + names[item.stickers[i].o] + " (" + item.stickers[i].s + "$)"))
	  	}
	  }
	  console.log(colors.cyan("╚═══════════════════════════════════════════════════════════════════════════"))
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
		var thisItem = currentBets[id];
	    console.log(colors.red("╔═══════════════════════════════════════════════════════════════════════════"));
	    console.log(colors.red("║ Sold: " + thisItem.name))
	    console.log(colors.red("╠═══════════════════════════════════════════════════════════════════════════"));
	    console.log(colors.red("║ Float: " + thisItem.float));
	    console.log(colors.red("║ Base : " + thisItem.base + "$"));
	    for(var i = 0; i < thisItem.bets.length; i++){
	    	console.log(colors.red("║ > Bet: " + thisItem.bets[i].price + "$"))
	    }
	    if(thisItem.stickers && thisItem.name.indexOf("Souvenir") == -1){
	    console.log(colors.red("╠═══════════════════════════════════════════════════════════════════════════"))
	    	for(var i = 0; i < thisItem.stickers.length; i++){
	    console.log(colors.red("║ S" + (i + 1) + ": " + names[thisItem.stickers[i].o] + " (" + thisItem.stickers[i].s + "$)"))
	    	}
	    }
	    console.log(colors.red("╚═══════════════════════════════════════════════════════════════════════════"));
		delete currentBets[id];
	}
}
