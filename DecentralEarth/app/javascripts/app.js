import "../stylesheets/app.css";
import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract'

import decentralearth_artifacts from '../../build/contracts/DecentralEarth.json'
var DecentralEarth = contract(decentralearth_artifacts);

window.App = {
  start: function() {
    DecentralEarth.setProvider(web3.currentProvider);
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts."); return;
      } else if (accs.length == 0) {
        alert("Couldn't get any accounts."); return;
      }
    });
  },
  
  showBalance: function(user) {
    web3.eth.getBalance(user, function(err, balance) {
      console.log(web3.fromWei(balance.valueOf()));
      userBalance = web3.fromWei(balance.valueOf());
    });
  },
  
  showCountryOwner: function(id) {
    var decentralEarth, countryOwner, countryValue;
    DecentralEarth.deployed().then(function(instance) {
      decentralEarth = instance;
      return decentralEarth.getCountryOwner.call(id);
    }).then(function(ownerName) {
      console.log(ownerName); countryOwner = ownerName;
      return decentralEarth.getCountryValue.call(id);
    }).then(function(ownerValue) {
      console.log(web3.fromWei(ownerValue.valueOf()));
      countryValue = web3.fromWei(ownerValue.valueOf());
      updateSelectedCountry(countryOwner, countryValue);
    }).catch (function(e) {
      alert("Failed to display country owner");
    });
  },
  
  setCountryOwner: function(user, name, countryID, value) {
    DecentralEarth.deployed().then(function(instance) {
      return instance.obtainCountry(name, countryID,
             {from: user, gas: 200000, value: web3.toWei(value)});
    }).then(function() {
      updateSelectedCountry(name, value);
    }).catch (function(e) {
      alert("Failed to set country owner");
    });
  },
  
  setCountryOwnerFromHTML: function(countryID) {
    this.setCountryOwner(document.getElementById('user').value,
         document.getElementById('username').value, parseInt(countryID),
         parseInt(document.getElementById('ether').value));
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
