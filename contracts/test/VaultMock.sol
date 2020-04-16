pragma solidity ^0.4.24;


import "@aragon/os/contracts/lib/token/ERC20.sol";


contract VaultMock {

    function transfer(address _token, address _to, uint256 _value) external {
        require(_value > 0, "transfer zero value error");

        if (_token == address(0)) {
            // solium-disable-next-line security/no-send
            require(_to.send(_value), "send reverted");
        } else {
            require(ERC20(_token).transfer(_to, _value), "token transfer reverted");
        }
    }

    function balance(address _token) public view returns (uint256) {
        if (_token == address(0)) {
            return address(this).balance;
        } else {
            return ERC20(_token).balanceOf(address(this));
        }
    }
}