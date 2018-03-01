pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract BlackJackGame is StandardToken {
    string public name = "BlackJackToken";
    string public symbol = "BJT";
    uint public decimals = 1;
    
    struct GamePlayer {
        address id;
        uint totalBet;
        uint8 fixedScore;
        uint8 unsuredScore;
        uint8 lastCard;
        uint8 numCards;
    }
    
    struct GameData {
        GamePlayer playerA;
        GamePlayer playerB;
        uint64 cardData;
        uint8 winner;
        bool finished;
    }
    
    GameData[] gameDataPool;
    uint lastStartedGame = 0;
    event PlayerBust(uint gameId, address player);
    event NewGameCreated(uint gameId, address playerA, address playerB);
    event NewHit(uint gameId, address player, uint card);
    
    function BlackJackGame() public {
        totalSupply_ = 200;
        balances[tx.origin] = 200;
    }
    
    function getLastGameId() public view returns (uint) {
        return lastStartedGame;
    }
    
    function getGameWinner(uint _gameId) public view returns (uint8) {
        require(_gameId < gameDataPool.length);
        GameData memory game = gameDataPool[_gameId];
        return game.winner;
    }
    
    function getGameScore(uint _gameId, address _player) public view returns (uint8) {
        require(_gameId < gameDataPool.length);
        GameData memory game = gameDataPool[_gameId];
        if (_player == game.playerA.id) return getScore(game.playerA);
        else if (_player == game.playerB.id) return getScore(game.playerB);
        return uint8(0);
    }
    
    function getLastCard(uint _gameId, address _player) public view returns (uint8) {
        require(_gameId < gameDataPool.length);
        GameData memory game = gameDataPool[_gameId];
        if (_player == game.playerA.id) return game.playerA.lastCard;
        else if (_player == game.playerB.id) return game.playerB.lastCard;
        return uint8(0);
    }
    
    function createNewGame(address _playerA, address _playerB, uint _initialBet) external {
        require(_initialBet <= balanceOf(_playerA));
        require(_initialBet <= balanceOf(_playerB));
        GamePlayer memory playerA = GamePlayer(_playerA, _initialBet, 0, 0, 0, 0);
        GamePlayer memory playerB = GamePlayer(_playerB, _initialBet, 0, 0, 0, 0);
        
        for (uint i = 0; i < gameDataPool.length; ++i) {
            if (gameDataPool[i].finished) {
                GameData storage game = gameDataPool[i];
                game.playerA = playerA; game.playerB = playerB;
                game.cardData = 0; game.winner = 0;
                game.finished = false;
                
                NewGameCreated(i, _playerA, _playerB);
                lastStartedGame = i; return;
            }
        }
        
        GameData memory newGame = GameData(playerA, playerB, 0, 0, false);
        lastStartedGame = gameDataPool.push(newGame) - 1;
        NewGameCreated(lastStartedGame, _playerA, _playerB);
    }
    
    function hitNewCard(uint _gameId, address _player, uint _bet) external {
        require(_gameId < gameDataPool.length);
        GameData storage game = gameDataPool[_gameId];
        
        uint card = randomRange(now + uint(game.cardData), 0, 52);
        while (game.cardData & (uint(1) << card) > 0) card = randomRange(now, 0, 52);
        game.cardData |= uint64(uint(1) << card);
        
        if (_player == game.playerA.id) {
            handlePlayerCards(_gameId, game.playerA, _bet, uint8(card));
        } else if (_player == game.playerB.id) {
            handlePlayerCards(_gameId, game.playerB, _bet, uint8(card));
        }
        NewHit(_gameId, _player, card);
        assert(card < 52);
    }
    
    function checkResult(uint _gameId) external {
        require(_gameId < gameDataPool.length);
        GameData storage game = gameDataPool[_gameId];
        game.finished = true;
        
        uint8 winner = 0;  // 1 - playerA, 2 - playerB
        uint8 scoreA = getScore(game.playerA);
        uint8 scoreB = getScore(game.playerB);
        if (scoreA <= 21 && scoreB <= 21) {
            if (scoreA < scoreB) winner = 2;
            else if (scoreB < scoreA) winner = 1;
        }
        else if (scoreA > 21) winner = 2;
        else if (scoreB > 21) winner = 1;
        
        if (winner == 1) transferFrom(game.playerB.id, game.playerA.id, game.playerB.totalBet);
        else if (winner == 2) transferFrom(game.playerA.id, game.playerB.id, game.playerB.totalBet);
        game.winner = winner;
    }
    
    function handlePlayerCards(uint _gameId, GamePlayer storage _player, uint _bet, uint8 _card) internal {
        _player.lastCard = _card;
        _player.numCards++;
        _player.totalBet += _bet;
        
        uint8 cardValue = uint8(_card % 13);
        if (cardValue == 0) _player.unsuredScore++;
        else if (cardValue >= 9) _player.fixedScore += 10;
        else _player.fixedScore += cardValue + 1;
        
        if ((_player.fixedScore + _player.unsuredScore) > 21)
            PlayerBust(_gameId, _player.id);
    }
    
    function getScore(GamePlayer memory _player) internal pure returns(uint8) {
        uint8 valueA = _player.unsuredScore;
        if (_player.fixedScore == 10 && valueA == 1 && _player.numCards == 2) return 21;
        else if ((_player.fixedScore + valueA) > 21) return _player.fixedScore + valueA;
        
        uint8 remain = 21 - _player.fixedScore;
        while (valueA > 0 && remain >= 10) {
            if ((remain - 10) < (valueA - 1)) break;
            remain -= 10; valueA--;
        }
        return 21 - (remain - valueA);
    }
    
    function randomRange(uint _seed, uint _a, uint _b) internal pure returns(uint) {
        bytes32 data;
        if (_seed % 2 == 0) data = keccak256(bytes32(_seed));
        else data = keccak256(keccak256(bytes32(_seed)));
        
        uint sum = 0;
        for (uint i = 0; i < 32; i++) sum += uint(data[i]);
        return _a + ((uint(data[sum % data.length]) * uint(data[(sum + 2) % data.length])) % _b);
    }
}
