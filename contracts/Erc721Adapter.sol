pragma solidity ^0.4.24;

import "./IConvictionVoting.sol";
import "./IErc721Adapter.sol";
import "./ERC721.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

contract Erc721Adapter is IErc721Adapter {
    using SafeMath for uint256;

    uint256 constant public TOKENS_PER_NFT = 1000e18;

    address public owner;
    IConvictionVoting public convictionVoting;
    ERC721 public erc721;
    string public name;
    string public symbol;
    uint256 public totalSupply;
    mapping(address => uint256) public balances;

    event SetErc721(address _erc721);

    modifier onlyOwner() {
        require(msg.sender == owner, "ERR:NOT_OWNER");
        _;
    }

    constructor(address _owner) public {
        owner = _owner;
    }

    function setOwner(address _owner) public onlyOwner {
        owner = _owner;
    }

    function setErc721(ERC721 _erc721) public onlyOwner {
        require(erc721 == address(0), "ERR:ALREADY_SET");

        erc721 = _erc721;
        name = _prependG(_erc721.name());
        symbol = _prependG(_erc721.symbol());

        emit SetErc721(_erc721);
    }

    function setConvictionVoting(IConvictionVoting _convictionVoting) public onlyOwner {
        convictionVoting = _convictionVoting;

        if (address(_convictionVoting) != address(0)) {
            _convictionVoting.onRegisterAsHook(0, address(this));
        }
    }

    // Function used by Conviction Voting
    function totalSupply() view returns (uint256) {
        return totalSupply;
    }

    // Function used by Conviction Voting
    function balanceOf(address _account) view returns (uint256) {
        return balances[_account];
    }

    // In the LivingNft this occurs before the transfer has happened and balanceOf is updated
    // Note this must be called for all mint/burn operations on the NFT as well
    function onTransfer(address _from, address _to, uint256 _id) public {
        require(msg.sender == address(erc721), "ERR:NOT_ERC721");
        require(_from != _to, "ERR:SEND_TO_SELF");

        if (_from != address(0) // not a mint
            && erc721.balanceOf(_from) == 1) // Note balanceOf will be 0 after transfer is completed, this prevents an account with multiple NFT's being revoked vote weight until they have 0 NFT's
        {
            if (address(convictionVoting) != address(0)) {
                convictionVoting.onTransfer(_from, _to, TOKENS_PER_NFT);
            }

            balances[_from] = balances[_from].sub(TOKENS_PER_NFT);
            totalSupply = totalSupply.sub(TOKENS_PER_NFT);
        }

        if (_to != address(0) // not a burn
            && erc721.balanceOf(_to) == 0) // Note balanceOf will be 1 after transfer is completed, this prevents an account with multiple NFT's being granted multiple vote weights
        {
            balances[_to] = balances[_to].add(TOKENS_PER_NFT);
            totalSupply = totalSupply.add(TOKENS_PER_NFT);
        }
    }

    function _prependG(string _string) internal returns (string) {
        return string(abi.encodePacked("g", _string));
    }
}
