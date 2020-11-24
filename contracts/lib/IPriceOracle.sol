pragma solidity ^0.4.24;

contract IPriceOracle {
    function consult(address tokenIn, uint amountIn, address tokenOut) external view returns (uint amountOut);
}
