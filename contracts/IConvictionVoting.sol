pragma solidity ^0.4.24;

contract IConvictionVoting {

    function onTransfer(address _from, address _to, uint256 _amount) external returns (bool);

    function onRegisterAsHook(uint256 _hookId, address _token) external;

}
