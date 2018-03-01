var BlackJackGame = artifacts.require("BlackJackGame");

contract('BlackJackGame', async (accounts) => {
  it("Test total tokens", async () => {
    let blackjack = await BlackJackGame.deployed();
    console.log("Total tokens: " + (await blackjack.totalSupply.call()).valueOf());
  });
  
  it("Send tokens to first 2 users", async () => {
    let blackjack = await BlackJackGame.deployed();
    await blackjack.transfer(accounts[1], 100, {from: accounts[0]});
    await blackjack.transfer(accounts[2], 100, {from: accounts[0]});
    
    let token1Data = await blackjack.balanceOf.call(accounts[1]);
    let token2Data = await blackjack.balanceOf.call(accounts[2]);
    console.log("Account 1 tokens: " + token1Data.valueOf());
    console.log("Account 2 tokens: " + token2Data.valueOf());
  });
  
  var gameIndex, gameCreated = true;
  it("Start game and bet 10BJT each", async () => {
    let blackjack = await BlackJackGame.deployed();
    blackjack.NewGameCreated().watch(function(error, result) {
      if (error) { console.log(error); return; }
      console.log("New game " + result.args.gameId.valueOf() + ", by "
                 + result.args.playerA + " & " + result.args.playerB);
      blackjack.NewGameCreated().stopWatching();
    });
    
    try {
      await blackjack.approve(accounts[0], 100, {from: accounts[1]});
      await blackjack.approve(accounts[0], 100, {from: accounts[2]});
      await blackjack.createNewGame(accounts[1], accounts[2], 10);
    } catch (error) {
      console.log("Error! Current game must stop");
      gameCreated = false; return;
    }
    
    let idData = await blackjack.getLastGameId.call();
    gameIndex = parseInt(idData.valueOf());
    blackjack.NewGameCreated().stopWatching();
  });
  
  it("Hit new cards and bet 2BJT each round", async () => {
    if (!gameCreated) return;
    let blackjack = await BlackJackGame.deployed();
    blackjack.NewHit().watch(function(error, result) {
      if (error) { console.log(error); return; }
      var cardValue = result.args.card.valueOf();
      var type = parseInt(cardValue / 13 + 1), card = cardValue % 13 + 1;
      console.log("New card " + card + " (Type = " + type
                + ") for " + result.args.player);
    });
    
    await blackjack.hitNewCard(gameIndex, accounts[1], 2);
    await blackjack.hitNewCard(gameIndex, accounts[2], 2);

    // Round 2
    await blackjack.hitNewCard(gameIndex, accounts[1], 2);
    await blackjack.hitNewCard(gameIndex, accounts[2], 2);
    
    let card1Score = await blackjack.getGameScore.call(gameIndex, accounts[1]);
    let card2Score = await blackjack.getGameScore.call(gameIndex, accounts[2]);
    console.log("Score: " + card1Score.valueOf() + ", " + card2Score.valueOf());
    blackjack.NewHit().stopWatching();
  });
  
  it("Check winner", async () => {
    if (!gameCreated) return;
    let blackjack = await BlackJackGame.deployed();
    await blackjack.checkResult(gameIndex);
    let winnerData = await blackjack.getGameWinner.call(gameIndex);
    console.log("Winner is: " + winnerData.valueOf());

    let token1Data = await blackjack.balanceOf.call(accounts[1]);
    let token2Data = await blackjack.balanceOf.call(accounts[2]);
    console.log("Account 1 tokens: " + token1Data.valueOf());
    console.log("Account 2 tokens: " + token2Data.valueOf());
  });
});
