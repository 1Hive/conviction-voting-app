pragma solidity ^0.4.24;

import "./FundsManager.sol";
import "@aragon/apps-vault/contracts/Vault.sol";

// This contract must be granted the permission to transfer funds on the Aragon Vault it accepts
contract AragonVaultFundsManager is FundsManager {

    address public owner;
    Vault public aragonVault;

    modifier onlyOwner {
        require(msg.sender == owner, "ERR:NOT_OWNER");
        _;
    }

    constructor(Vault _aragonVault) public {
        owner = msg.sender;
        aragonVault = _aragonVault;
    }

    function setOwner(address _owner) public onlyOwner {
        owner = _owner;
    }

    function balance(address _token) public view returns (uint256) {
        return aragonVault.balance(_token);
    }

    function transfer(address _token, address _beneficiary, uint256 _amount) public onlyOwner {
        aragonVault.transfer(_token, _beneficiary, _amount);
    }
}
