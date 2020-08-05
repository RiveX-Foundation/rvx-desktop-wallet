import React, { Component } from "react";
import { toJS } from "mobx";
import { Modal, Button, Input, Spin } from "antd";
import { inject, observer } from "mobx-react";
import intl from "react-intl-universal";
import { WALLETID } from "../../utils/support";
import {
  createNotification,
  getChainId,
  getGasPrice,
  getNoncem,
  isNullOrEmpty,
} from "../../utils/helper";
import { BigNumber } from "bignumber.js";
import Slider from "react-input-slider";
import "./index.less";
import Web3 from "web3";
const { API_EthGas } = require("../../../../config/common");
import ERC20ABI from "../../ABIs/ERC20.json";
import ATokenABI from "../../ABIs/AToken.json";
import LendingPoolAddressProviderABI from "../../ABIs/AddressProvider.json";
import LendingPoolABI from "../../ABIs/LendingPool.json";
import buttonback from "static/image/icon/back.png";
import Axios from "axios";
import { create } from "lodash";
var Tx = require("ethereumjs-tx");
const ethUtil = require("ethereumjs-util");
const pu = require("promisefy-util");
const WAN_PATH = "m/44'/5718350'/0'/0/0";
//const WAN_PATH = "m/44'/60'/0'/0/";
const { confirm } = Modal;
var web3;
// m/44'/5718350'/0'/0/0

@inject((stores) => ({
  setCurrent: (current) => stores.walletStore.setCurrent(current),
  setWalletEntryNextDirection: (val) =>
    stores.walletStore.setWalletEntryNextDirection(val),
  language: stores.languageIntl.language,
  addrSelectedList: stores.wanAddress.addrSelectedList,
  addrInfo: stores.wanAddress.addrInfo,
  infuraprojectid: stores.walletStore.infuraprojectid,
  aavedeposittoken: stores.walletStore.aavedeposittoken,
  aavedeposittokenamount: stores.walletStore.aavedeposittokenamount,
  setAaveDepositToken: (token) => stores.walletStore.setAaveDepositToken(token),
  selectedwalletlist: stores.walletStore.selectedwalletlist,
  selectedethnetwork: stores.network.selectedethnetwork,
  selectedTokenAsset: stores.walletStore.selectedTokenAsset,
}))
@observer
class AaveWithdraw extends Component {
  state = {
    mobilevalue: "",
    tokenbalance: 0,
    withdrawamount: "",
    tokenInfo: {},
    selectedwallet: "",
    gaspricevalue: 0,
    privatekey: "",
    approval: false,
    loading: false,
    buttondisable: false,
    mingaspricevalue: 1,
    maxgaspricevalue: 150,
    selectedtoken: {},
  };
  onChangeTokenValue = (e) => {
    this.setState({
      withdrawamount: e.target.value,
    });
  };

  async componentDidMount() {
    var selecetedwallet = toJS(this.props.selectedwalletlist);
    let walletlist = selecetedwallet.find(
      (x) => x.publicaddress == localStorage.getItem("selectedwallet")
    );
    walletlist = toJS(walletlist);
    console.log(walletlist);
    this.setState({
      privatekey: walletlist.privatekey,
    });

    web3 = new Web3("https://mainnet.infura.io" + this.props.infuraprojectid);
    this.setState({
      selectedwallet: localStorage
        .getItem("selectedwallet")
        .toString()
        .toLowerCase(),
      withdrawamount: this.props.aavedeposittokenamount,
      selectedtoken: this.props.aavedeposittoken,
    });
    let gasPrices = await this.getCurrentGasPrices();
    this.setState({
      gaspricevalue: gasPrices.medium,
    });
    console.log(this.props.aavedeposittoken);
  }
  getCurrentGasPrices = async () => {
    let response = await Axios.get(API_EthGas);

    let prices = {
      low: parseFloat(response.data.safeLow) / 10,
      medium: parseFloat(response.data.average) / 10,
      high: parseFloat(response.data.fast) / 10,
    };
    return prices;
  };

  getLendingPoolAddressProviderContract = () => {
    const lpAddressProviderAddress =
      "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8"; // mainnet address, for other addresses: https://docs.aave.com/developers/developing-on-aave/deployed-contract-instances
    const lpAddressProviderContract = new web3.eth.Contract(
      LendingPoolAddressProviderABI,
      lpAddressProviderAddress
    );
    return lpAddressProviderContract;
  };

  getLendingPoolCoreAddress = async () => {
    const lpCoreAddress = await this.getLendingPoolAddressProviderContract()
      .methods.getLendingPoolCore()
      .call()
      .catch((e) => {
        throw Error(`Error getting lendingPool address: ${e.message}`);
      });

    console.log("LendingPoolCore address: ", lpCoreAddress);
    return lpCoreAddress;
  };
  withdraw = async () => {
    if (this.state.loading) {
      createNotification("info", "Wait for transaction to be mined!");
      return;
    }
    this.setState({
      loading: true,
    });
    let unit = "ether";
    if (
      this.state.selectedtoken.token == "USDT" ||
      this.state.selectedtoken.token == "USDC"
    ) {
      unit = "mwei";
    }
    //let amount = web3.utils.toWei(this.state.selectedtoken.balance.toString(),unit);
    let amount = web3.utils.toWei(this.state.withdrawamount.toString(), unit);
    const aTokenContract = new web3.eth.Contract(
      ATokenABI,
      this.state.selectedtoken.aContract
    );
    var count = await web3.eth.getTransactionCount(this.state.selectedwallet);
    var dataWithdraw = aTokenContract.methods.redeem(amount).encodeABI();
    var rawTransaction = {
      from: this.state.selectedwallet,
      to: this.state.selectedtoken.aContract, //this.tokencontract,
      nonce: count,
      value: "0x0", //web3.utils.toHex(web3.utils.toWei(this.state.tokenval, 'ether')),
      data: dataWithdraw, //contract.transfer.getData(this.tokencontract, 10, {from: this.props.selectedwallet.publicaddress}),
    };
    console.log(dataWithdraw);
    console.log(amount);
    aTokenContract.methods
      .redeem(amount)
      .estimateGas({
        from: this.state.selectedwallet,
        data: dataWithdraw,
      })
      .then((gasLimit) => {
        var gasPrice = web3.utils.toWei(
          this.state.gaspricevalue.toString(),
          "gwei"
        );
        var limit = Number(gasLimit);
        limit = limit + 50000;
        console.log(limit);
        console.log(this.state.privatekey);
        rawTransaction = {
          from: this.state.selectedwallet,
          nonce: count,
          gasPrice: web3.utils.toHex(gasPrice), //"0x04e3b29200",
          // "gasPrice": gasPrices.high * 100000000,//"0x04e3b29200",
          gas: limit, //"0x7458",
          to: this.state.selectedtoken.aContract, //this.tokencontract,
          value: "0x0", //web3.utils.toHex(web3.utils.toWei(this.state.tokenval, 'ether')),
          data: dataWithdraw, //contract.transfer.getData(this.tokencontract, 10, {from: this.props.selectedwallet.publicaddress}),
          chainId: this.props.selectedethnetwork.chainid,
        };
        console.log(rawTransaction);
        var privKey = new Buffer(this.state.privatekey, "hex");
        var tx =
          this.props.selectedethnetwork.shortcode == "mainnet"
            ? new Tx(rawTransaction)
            : new Tx(rawTransaction, {
                chain: this.props.selectedethnetwork.shortcode,
                hardfork: "istanbul",
              });
        tx.sign(privKey);
        var serializedTx = tx.serialize();
        web3.eth
          .sendSignedTransaction(
            "0x" + serializedTx.toString("hex"),
            (err, hash) => {
              if (!err) {
                //SUCCESS
                console.log(hash);
                createNotification("info", "Transaction submited.");
              } else {
                createNotification(
                  "error",
                  intl.get("Error.TransactionFailed")
                );
                console.log(err);
                this.setState({
                  loading: false,
                });
              }
            }
          )
          .once("confirmation", (confNumber, receipt, latestBlockHash) => {
            console.log("mined");
            console.log(receipt);
            if (receipt.status) {
              createNotification("success", "Succesfully mined!");
            }
            this.setState({
              loading: false,
            });
            this.props.setCurrent("aavedashboard");
          })
          .on("error", (error) => {
            console.log(error);
            createNotification("error", "Transaction failed.");
            this.setState({
              loading: false,
            });
          });
      })
      .catch((e) => {
        createNotification(
          "error",
          "Always failing transaction. Please check your deposit amount!"
        );
        this.setState({
          loading: false,
        });
      });
  };

  getLendingPoolAddress = async () => {
    const lpAddress = await this.getLendingPoolAddressProviderContract()
      .methods.getLendingPool()
      .call()
      .catch((e) => {
        throw Error(`Error getting lendingPool address: ${e.message}`);
      });
    console.log("LendingPool address: ", lpAddress);
    return lpAddress;
  };

  _setCurrentGasPrice = (price) => {
    // console.log(price);
    this.setState({
      gaspricevalue: price,
    });
  };

  _formatWeiWin = (tokentype) => {
    if (tokentype == "eth" || tokentype == "erc20") {
      return "gwei";
    } else if (tokentype == "wan" || tokentype == "wrc20") {
      return "gwin";
    }
  };

  back = () => {
    this.props.setCurrent("aavedashboard");
  };

  render() {
    return (
      <div className="tokentransferconfirmationpanel fadeInAnim">
        <div className="title">
          <span>
            <img onClick={this.back} width="20px" src={buttonback} />
          </span>
          <span style={{ marginLeft: "20px" }}>Aave Withdrawal</span>
        </div>
        <div className="centerpanel">
          <center>
            <div className="subtitle">
              {this.props.aavedeposittoken.token.toString().toUpperCase()}{" "}
              (savings)
            </div>
            <div
              className="panelwrapper borderradiusfull"
              style={{ marginBottom: "10px" }}
            >
              <div className="spacebetween" style={{ marginTop: "10px" }}>
                <div className="panellabel">Balance</div>
                <div className="panelvalue">
                  {parseFloat(this.props.aavedeposittoken.balance.toString())} a
                  {this.props.aavedeposittoken.token.toString().toUpperCase()}
                </div>
              </div>
              <div className="spacebetween" style={{ marginTop: "10px" }}>
                <div className="panellabel">
                  {intl.get("TokenTransferConfirmation.Amount")}
                </div>
                <div className="panelvalue">
                  {" "}
                  <Input
                    value={this.state.withdrawamount}
                    className="inputTransparent gasclass"
                    onChange={this.onChangeTokenValue}
                    placeholder={0}
                  />
                  a{this.props.aavedeposittoken.token.toString().toUpperCase()}
                </div>
              </div>
            </div>
            <div
              className="panelwrapper borderradiusfull"
              style={{ marginBottom: "10px" }}
            >
              <div className="spacebetween">
                <div className="panellabel">
                  {intl.get("Transaction.GasPrice")} (Displaying average gas
                  price from API)
                </div>
                <div className="panelvalue">
                  {this.state.gaspricevalue}{" "}
                  {this._formatWeiWin(this.props.selectedTokenAsset.TokenType)}
                </div>
              </div>
              <div
                className="spacebetween"
                style={{
                  marginTop: "20px",
                  marginRight: "20px",
                  marginLeft: "20px",
                }}
              >
                <Slider
                  axis="x"
                  xstep={1}
                  xmin={this.state.mingaspricevalue}
                  xmax={this.state.maxgaspricevalue}
                  x={this.state.gaspricevalue}
                  onChange={({ x }) => this._setCurrentGasPrice(x)}
                  styles={{
                    track: {
                      backgroundColor: "#000000",
                      height: 5,
                      width: "100%",
                    },
                    active: {
                      backgroundColor: "#5f5cdf",
                      height: 5,
                    },
                    thumb: {
                      width: 15,
                      height: 15,
                      backgroundColor: "#64F4F4",
                    },
                  }}
                />
              </div>
            </div>
            <div
              className="width600 spacebetween"
              style={{ marginBottom: "30px" }}
            ></div>
            {this.state.loading === true && (
              <React.Fragment>
                <div>
                  <Spin tip="Transaction pending..."></Spin>
                </div>
              </React.Fragment>
            )}

            <div>
              <Button className="curvebutton" onClick={this.withdraw}>
                {intl.get("Wallet.Confirm")}
              </Button>
            </div>
          </center>
        </div>
      </div>
    );
  }
}

export default AaveWithdraw;
