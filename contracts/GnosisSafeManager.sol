pragma solidity ^0.4.24;

import "./VaultManager.sol";

contract GnosisSafeManager is IVaultManager {

    constructor() public {

    }

    function balance(address _token) returns (uint256) {
        return 0;
    }

    function transfer(address _token, address _beneficiary, uint256 _amount) {

    }

}
