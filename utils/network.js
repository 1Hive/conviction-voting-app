require("dotenv").config();

function node_url(networkName) {
  if (networkName) {
    const uri = process.env["ETH_NODE_URI_" + networkName.toUpperCase()];
    if (uri && uri !== "") {
      return uri;
    }
  }

  if (networkName === "localhost") {
    // do not use ETH_NODE_URI
    return "http://localhost:8545";
  }

  let uri = process.env.ETH_NODE_URI;
  if (uri) {
    uri = uri.replace("{{networkName}}", networkName);
  }
  if (!uri || uri === "") {
    // throw new Error(`environment variable "ETH_NODE_URI" not configured `);
    return "";
  }
  if (uri.indexOf("{{") >= 0) {
    throw new Error(
      `invalid uri or network not supported by node provider : ${uri}`
    );
  }
  return uri;
}

function getMnemonic(networkName) {
  if (networkName) {
    const mnemonic = process.env["MNEMONIC_" + networkName.toUpperCase()];
    if (mnemonic && mnemonic !== "") {
      return mnemonic;
    }
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic || mnemonic === "") {
    return "test test test test test test test test test test test junk";
  }
  return mnemonic;
}

function getAccount(networkName) {
  if (networkName) {
    const account = process.env['ACCOUNT_' + networkName.toUpperCase()]
    if (account && account !== '') {
      return [account]
    }
  }

  const account = process.env.ACCOUNT
  if (!account || account === '') {
    return []
  }
  return [account]
}

function accounts(networkName) {
  return { mnemonic: getMnemonic(networkName) };
}

function account(networkName) {
  return getAccount(networkName)
}

module.exports = {
  accounts,
  account,
  node_url,
};
