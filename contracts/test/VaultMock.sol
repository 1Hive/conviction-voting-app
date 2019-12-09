pragma solidity ^0.4.24;


interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


contract VaultMock {

    function transfer(address _token, address _to, uint256 _value) external {
        require(_value > 0, "transfer zero value error");

        if (_token == address(0)) {
            require(_to.send(_value), "send reverted");
        } else {
            require(IERC20(_token).transfer(_to, _value), "token transfer reverted");
        }
    }

    function balance(address _token) public view returns (uint256) {
        if (_token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(_token).balanceOf(address(this));
        }
    }
}