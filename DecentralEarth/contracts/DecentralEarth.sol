pragma solidity ^0.4.19;
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract DecentralEarth is Ownable {
    struct CountryOwnship {
        string ownerName;
        address owner;
        uint currentValue;
    }
    CountryOwnship[255] countries;
    mapping (address => uint) ownedCountries;
    
    function obtainCountry(string _name, uint _countryId) external payable {
        require(_countryId < countries.length);
        require(countries[_countryId].currentValue < msg.value);
        
        CountryOwnship storage country = countries[_countryId];
        if (country.currentValue == 0) owner.transfer(this.balance);
        else country.owner.transfer(this.balance);
        
        country.ownerName = _name;
        country.owner = msg.sender;
        country.currentValue = msg.value;
        ownedCountries[country.owner] |= (uint(1) << _countryId);
    }
    
    function getCountryOwner(uint _countryId) public view returns(string) {
        require(_countryId < countries.length);
        return countries[_countryId].ownerName;
    }
    
    function getCountryValue(uint _countryId) public view returns(uint) {
        require(_countryId < countries.length);
        return countries[_countryId].currentValue;
    }
    
    function getOwnedCountries(address _user) public view onlyOwner returns(uint) {
        return ownedCountries[_user];
    }
}
