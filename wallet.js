let apiKey = '7UC93ZCDXHDK9T6WKXYHZSQZSDEA4Q7526';

function getWalletInfo() {
    var address = document.getElementById('walletAddress').value;
    resetValues();

	getTransactionData(address, updateWalletStatsHTML);
    getBalanceData(address, updateBalanceHTML);
}


/*
	Gets data for all of the transactions from the wallet
*/ 
function getTransactionData(address, callback){
	let request = new XMLHttpRequest();
	let url = 'http://api.etherscan.io/api?module=account&action=txlist&address=' + address + '&apikey=' + apiKey;

	request.onreadystatechange = function() {
  	if (this.readyState === 4 && this.status === 200) {
	    let response = JSON.parse(this.responseText);
	    if (response.status === '1'){
		    callback(response.result);
	    }
	  }
	}

	request.open("GET", url, true);
	request.send();
}

/*
	Gets balance data for the wallet
*/
function getBalanceData(address, callback){
	let priceRequest = new XMLHttpRequest();
	let priceUrl = 'https://api.etherscan.io/api?module=stats&action=ethprice&apikey=' + apiKey;//gets current ether price in usd

	priceRequest.onreadystatechange = function() {
			if (this.readyState === 4 && this.status === 200) {
			    let response = JSON.parse(this.responseText);
			    var etherPrice = response.result.ethusd;

		    	let balanceRequest = new XMLHttpRequest();
				let balanceUrl = 'https://api.etherscan.io/api?module=account&action=balance&address=' + address + '&tag=latest&apikey=' + apiKey;

				balanceRequest.onreadystatechange = function() {
					if (this.readyState === 4 && this.status === 200) {
					    let response = JSON.parse(this.responseText);
					    if (response.status === '1'){
	      					weis = response.result;
		  					etherBalance = weisToEther(weis);
			    			callback(etherBalance, etherPrice);
					    }
					}
				}

				balanceRequest.open("GET", balanceUrl, true);
				balanceRequest.send();
	  	}
	}
	priceRequest.open("GET", priceUrl, true);
	priceRequest.send();
}

/*
	Callback after receiving the wallet stats from transaction data
*/
function updateWalletStatsHTML(walletData){
    	var walletTxMap = createTxMap(walletData);//maps wallets to number of transactions with given address
		var totalTransactedWallets = walletTxMap.size;
		var frequentWallets = getFrequentTransactionWallets(walletTxMap, 2);
		var recentTransactionVolume = getTxVolumeForElapsedTime(walletData, 90);

		var transactionTimesMap = getHourlyTransactions(walletData);//maps wallet address to time transacted
		var arrData = convertTxToScatterPlotData(Array.from(transactionTimesMap));

		frequentWallets.forEach(function(wallet){
			var loc = document.getElementById("frequentWallets");
			var newElement = document.createElement("li");
			newElement.innerHTML = 'wallet address: ' + wallet.key + '; times transacted =' + wallet.value;
			loc.appendChild(newElement);
		});
		document.getElementById("recentTransactionVolume").innerHTML = recentTransactionVolume;
		document.getElementById("totalTransactedWallets").innerHTML = totalTransactedWallets;


		createChart(arrData);
}

/*
	Callback after receiving balance data
*/
function updateBalanceHTML(etherBalance, etherPrice){
	var usdBalance = etherBalance * etherPrice;
	document.getElementById("usdbalance").innerHTML = '$' + usdBalance;
	document.getElementById("etherbalance").innerHTML = etherBalance;
	document.getElementById("etherprice").innerHTML = '$' + etherPrice;

}


/*
	Creates a chart based on transaction data
*/
function createChart(data){
	var ctx = document.getElementById("myChart").getContext('2d');
	var scatterChart = new Chart(ctx, {
	    type: 'scatter',
	    data: {
	        datasets: [{
	            label: 'Number of transactions by time of day (in UTC)',
	            data: data
	        }]
	    },
	    options: {
	    	maintainAspectRatio: true,
	        scales: {
	            xAxes: [{
	                type: 'linear',
	                position: 'bottom'
	            }]
	        }
	    }
	});
}


/* 
	Maps hour to number of transactions that occured at that hour
*/
function getHourlyTransactions(txs){
	var map = new Map();

	txs.forEach(function(tx){
		var date = new Date(tx.timeStamp*1000);
		var hour = date.getUTCHours();
		if (!map.has(hour)){
			map.set(hour, 1);
		} else {
			map.set(hour, map.get(hour)+1);
		}
	});

	return map.entries();
}


//creates a hashmap that maps a wallet address to the number of transactions with that wallet
function createTxMap(txs){
	var map = new Map();

	txs.forEach(function(tx){
			if (!map.has(tx.from)){
				map.set(tx.from, 1);
			} else {
				map.set(tx.from, map.get(tx.from)+1);
			}
	});
	return map;
}

/*
	Converts data to format necessary for chartJS
*/
function convertTxToScatterPlotData(txs){
	data = [];
	txs.forEach(function(element, idx){
		var x = element[0];
		var y = element[1];
		var obj = {x: x, y: y};
		data.push(obj);
	});

	return data;
}

/*
	Returns all the external wallets that have had a certain number of transactions with the wallet
*/
function getFrequentTransactionWallets(txs, frequency){
	frequentWallets = [];
	txs.forEach(function(value, key){
		if (value > frequency){
			frequentWallets.push({key: key, value: value});
		}
	});

	return frequentWallets;
}

function getTxVolumeForElapsedTime(txs, daysElapsed){
	var now = Date.now();
	var volume = 0;

	txs.forEach(function(tx){
		var txTime = new Date(tx.timeStamp*1000);
		var timeDiff = Math.abs(now - txTime.getTime());
		var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 
		if (diffDays <= daysElapsed){
			volume += weisToEther(tx.value);
		}
	});

	return volume;
}

function weisToEther(weis){
	return weis/Math.pow(10,18);
}

function resetValues(){
	document.getElementById("recentTransactionVolume").innerHTML = '';
	document.getElementById("totalTransactedWallets").innerHTML = '';
	document.getElementById('frequentWallets').innerHTML = '';
	document.getElementById('usdbalance').innerHTML = '';
	document.getElementById('etherbalance').innerHTML = '';
	document.getElementById('etherprice').innerHTML = '';

}
