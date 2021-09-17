pragma solidity ^0.4.24;

contract Erc721ToErc20 {

    uint256 constant public TOKENS_PER_NFT = 1000e18;

    address public owner;
    address public convictionVoting;
    address public erc721;
    uint256 public totalSupply;
    mapping (address => uint256) public balances;

    modifier onlyOwner() {
        require(msg.sender == owner, "E721toE20: Not owner");
    }

    modifier onlyErc721() {
        require(msg.sender == erc721, "E721toE20: Not ERC721");
    }

    constructor() public {
        owner = msg.sender;
    }

    function setErc721(address _erc721) public onlyOwner {
        require(erc721 == address(0), "E721toE20: Already set");
        erc721 = _erc721;
    }

    function setConvictionVoting(address _convictionVoting) public onlyOwner {
        require(convictionVoting == address(0), "E721toE20: Already set");
        convictionVoting = _convictionVoting;
        _convictionVoting.onRegisterAsHook(0, address(this));
    }

    function totalSupply() view returns (uint256) {
        return totalSupply;
    }

    function balanceOf(address _account) view returns (uint256) {
        return balances[_account];
    }

    function onTransfer(address _from, address _to, uint256 _id) public onlyErc721 {
        // TODO: This must be called for mint/burn as well (any time an NFT is created or destroyed)

        if (erc721.balanceOf(_from) == 0) {
            balances[_from] -= TOKENS_PER_NFT;
            totalSupply -= TOKENS_PER_NFT;
            convictionVoting.onTransfer(_from, _to, TOKENS_PER_NFT);
        }

        if (erc721.balanceOf(_to) == 1) {
            balances[_to] += TOKENS_PER_NFT;
            totalSupply += TOKENS_PER_NFT;
        }
    }
}
