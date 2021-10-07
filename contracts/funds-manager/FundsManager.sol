pragma solidity ^0.4.24;

contract FundsManager {

    function balance(address _token) returns (uint256);

    function transfer(address _token, address _beneficiary, uint256 _amount);
}
