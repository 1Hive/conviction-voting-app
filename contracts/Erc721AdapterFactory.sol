pragma solidity ^0.4.24;

import "./Erc721Adapter.sol";

contract Erc721AdapterFactory {

    event NewErc721Adapter(Erc721Adapter erc721Adapter);

    function newErc721Adapter(address _owner) public returns (Erc721Adapter) {
        Erc721Adapter erc721Adapter = new Erc721Adapter(_owner);
        emit NewErc721Adapter(erc721Adapter);
        return erc721Adapter;
    }
}
