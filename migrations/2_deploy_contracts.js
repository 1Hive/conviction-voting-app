/* global artifacts */
var ConvictionVotingApp = artifacts.require('ConvictionVotingApp.sol')

module.exports = function(deployer) {
  deployer.deploy(ConvictionVotingApp)
}
