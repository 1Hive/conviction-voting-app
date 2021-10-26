pragma solidity ^0.4.0;

contract ERC721 {

    function balanceOf(address _owner) public view returns (uint256);

    function name() public view returns (string);

    function symbol() external view returns (string memory);
}
