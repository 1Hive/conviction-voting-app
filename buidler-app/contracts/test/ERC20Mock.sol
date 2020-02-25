pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";


contract ERC20Mock is ERC20, ERC20Detailed {

    constructor(string name, string symbol, uint8 decimals, uint256 initialSupply)
        ERC20Detailed(name, symbol, decimals)
        public
    {
        _mint(msg.sender, initialSupply * (10 ** uint256(decimals)));
    }
}
