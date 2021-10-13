pragma solidity ^0.4.24;

contract IErc721Adapter {

    function onTransfer(address _from, address _to, uint256 _id) public;

}
