pragma solidity ^0.4.24;

import "../lib/IPriceOracle.sol";

contract PriceOracleMock is IPriceOracle {

    uint256 public requestTokenPriceInStableToken;

    constructor(uint256 _requestTokenPriceInStableToken) public {
        requestTokenPriceInStableToken = _requestTokenPriceInStableToken;
    }

    function consult(address tokenIn, uint256 amountIn, address tokenOut) external view returns (uint256 amountOut) {
        return amountIn / requestTokenPriceInStableToken;
    }
}
