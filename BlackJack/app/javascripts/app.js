import "../stylesheets/app.css";
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

import blackjackgame_artifacts from '../../build/contracts/BlackJackGame.json'
var BlackJackGame = contract(blackjackgame_artifacts);
var accounts, gameIndex, holdForUsers = [false, false], lastValues = [52, 52];

window.App = {
  start: function() {
    var self = this;
    BlackJackGame.setProvider(web3.currentProvider);
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts."); return;
      } else if (accs.length == 0) {
        alert("Couldn't get any accounts."); return;
      }
      accounts = accs;
      self.initializeBalance();
    });
  },

  initializeBalance: function() {
    var self = this, blackjack;
    document.getElementById("user1").innerHTML = accounts[1];
    document.getElementById("user2").innerHTML = accounts[2];
    
    BlackJackGame.deployed().then(function(instance) {
      blackjack = instance;
      return blackjack.transfer(accounts[1], 100, {from: accounts[0]});
    }).then(function() {
      return blackjack.transfer(accounts[2], 100, {from: accounts[0]});
    }).then(function() {
      self.refreshBalance();
    }).catch (function(e) {
      alert("Error! Initialization failed");
    });
  },
  
  refreshBalance: function() {
    var self = this, blackjack;
    BlackJackGame.deployed().then(function(instance) {
      blackjack = instance;
      return blackjack.balanceOf.call(accounts[1]);
    }).then(function(balance1) {
      document.getElementById("balance1").innerHTML = balance1.valueOf();
      return blackjack.balanceOf.call(accounts[2]);
    }).then(function(balance2) {
      document.getElementById("balance2").innerHTML = balance2.valueOf();
    });
  },
  
  createNewGame: function(initBet) {
    var self = this, blackjack;
    holdForUsers[0] = false; lastValues[0] = 52;
    holdForUsers[1] = false; lastValues[0] = 52;
    document.getElementById("cards1").innerHTML = "";
    document.getElementById("cards2").innerHTML = "";
    document.getElementById("hit1").disabled = false;
    document.getElementById("hit2").disabled = false;
    
    BlackJackGame.deployed().then(function(instance) {
      blackjack = instance;
      blackjack.NewGameCreated().watch(function(error, result) {
        if (error) { alert(error); return; }
        gameIndex = parseInt(result.args.gameId.valueOf());
        document.getElementById("game_id").innerHTML = gameIndex;
      });
      blackjack.NewHit().watch(function(error, result) {
        if (error) { alert(error); return; }
        var cardValue = parseInt(result.args.card.valueOf());
        var type = parseInt(cardValue / 13 + 1), card = cardValue % 13 + 1;
        
        var elementName = "";
        if (result.args.player == accounts[1]) {
          if (lastValues[0] == cardValue) return;
          elementName = "cards1"; lastValues[0] = cardValue;
        }
        else if (result.args.player == accounts[2]) {
          if (lastValues[1] == cardValue) return;
          elementName = "cards2"; lastValues[1] = cardValue;
        }
        document.getElementById(elementName).innerHTML +=
          "<img src='images/" + type + "-" + card + ".png' width=80/>";
      });
      return blackjack.approve(accounts[0], 100, {from: accounts[1]});
    }).then(function() {
      return blackjack.approve(accounts[0], 100, {from: accounts[2]});
    }).then(function() {
      return blackjack.createNewGame(accounts[1], accounts[2], parseInt(initBet),
             {from: accounts[0], gas: 200000});
    }).catch (function(e) {
      alert("Error! Current game must stop");
    });
  },
  
  hitNewCard: function(index, bet) {
    if (typeof gameIndex === 'undefined') return;
    BlackJackGame.deployed().then(function(instance) {
      return instance.hitNewCard(gameIndex, accounts[parseInt(index)], parseInt(bet),
             {from: accounts[0], gas: 200000});
    }).catch (function(e) {
      alert("Error! Cannot hit a card");
    });
  },
  
  holdForResult: function(index) {
    holdForUsers[parseInt(index) - 1] = true;
    document.getElementById("hit" + parseInt(index)).disabled = true;
    if (holdForUsers[0] && holdForUsers[1]) this.checkWinner();
  },
  
  checkWinner: function() {
    var self = this, blackjack, winnerIndex = 0, scores = [0, 0];
    if (typeof gameIndex === 'undefined') return;
    
    BlackJackGame.deployed().then(function(instance) {
      blackjack = instance;
      return blackjack.checkResult(gameIndex, {from: accounts[0], gas: 200000});
    }).then(function() {
      return blackjack.getGameWinner.call(gameIndex);
    }).then(function(winner) {
      winnerIndex = winner.valueOf();
      return blackjack.getGameScore.call(gameIndex, accounts[1]);
    }).then(function(score1) {
      scores[0] = score1.valueOf();
      return blackjack.getGameScore.call(gameIndex, accounts[2]);
    }).then(function(score2) {
      blackjack.NewGameCreated().stopWatching();
      blackjack.NewHit().stopWatching();
      
      scores[1] = score2.valueOf();
      self.refreshBalance();
      alert(scores[0] + ": " + scores[1] + "\nWinner is " + winnerIndex);
    }).catch (function(e) {
      alert("Error! Cannot get a winner");
    });
  }
};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    window.web3 = new Web3(web3.currentProvider);
  } else {
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"));
  }
  App.start();
});
