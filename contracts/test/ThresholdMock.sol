pragma solidity ^0.4.24;

import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "../ConvictionVoting.sol";
import "../IThreshold.sol";

contract ThresholdMock {
    using SafeMath for uint256;

    uint256 constant public ONE_HUNDRED_PERCENT = 1e18;
    string private constant ERROR_AMOUNT_OVER_MAX_RATIO = "CV_AMOUNT_OVER_MAX_RATIO";
    ConvictionVoting convictionVoting;

    constructor(ConvictionVoting _app) {
        convictionVoting = _app;
    }

    /**
     * @dev Formula: ρ * totalStaked / (1 - a) / (β - requestedAmount / total)**2
     * For the Solidity implementation we amplify ρ and β and simplify the formula:
     * weight = ρ * D
     * maxRatio = β * D
     * decay = a * D
     * threshold = weight * totalStaked * D ** 2 * funds ** 2 / (D - decay) / (maxRatio * funds - requestedAmount * D) ** 2
     * @param _requestedAmount Requested amount of tokens on certain proposal
     * @return Threshold a proposal's conviction should surpass in order to be able to
     * executed it.
     */
    function calculateThreshold(uint256 _requestedAmount) public view returns (uint256 _threshold) {
        Vault vault = convictionVoting.vault();
        address requestToken = convictionVoting.requestToken();
        uint256 maxRatio = convictionVoting.maxRatio();
        uint256 D = convictionVoting.D();
        uint256 weight = convictionVoting.weight();
        uint256 decay = convictionVoting.decay();

        uint256 funds = vault.balance(requestToken);
        require(maxRatio.mul(funds) > _requestedAmount.mul(D), ERROR_AMOUNT_OVER_MAX_RATIO);
        // denom = maxRatio * 2 ** 64 / D  - requestedAmount * 2 ** 64 / funds
        uint256 denom = (maxRatio << 64).div(D).sub((_requestedAmount << 64).div(funds));
        // _threshold = (weight * 2 ** 128 / D) / (denom ** 2 / 2 ** 64) * totalStaked * D / 2 ** 128
        _threshold = ((weight << 128).div(D).div(denom.mul(denom) >> 64)).mul(D).div(D.sub(decay)).mul(_totalStaked()) >> 64;
    }

    function _totalStaked() internal view returns (uint256) {
        MiniMeToken stakeToken = convictionVoting.stakeToken();
        uint256 minThresholdStakePercentage = convictionVoting.minThresholdStakePercentage();
        uint256 totalStaked = convictionVoting.totalStaked();

        uint256 minTotalStake = (stakeToken.totalSupply().mul(minThresholdStakePercentage)).div(ONE_HUNDRED_PERCENT);
        return totalStaked < minTotalStake ? minTotalStake : totalStaked;
    }
}