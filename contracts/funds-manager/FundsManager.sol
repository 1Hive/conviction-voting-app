pragma solidity ^0.4.24;

contract FundsManager {

    function balance(address _token) public view returns (uint256);

    // This must revert if the transfer fails or returns false
    function transfer(address _token, address _beneficiary, uint256 _amount) public;
}
