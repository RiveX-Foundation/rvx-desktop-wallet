import { Progress } from "antd";
import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import intl from "react-intl-universal";
import style from "./index.less";

@inject((stores) => ({
  language: stores.languageIntl.language,
}))
@observer
class Loading extends Component {
  state = {
    percent: 0,
  };

  componentDidMount() {
    this.timer = setInterval(() => {
      let currePercent = this.state.percent;
      let tmp = 10 + parseFloat(currePercent);
      if (tmp === 100) {
        tmp = 99.9;
        clearInterval(this.timer);
      }
      this.setState({
        percent: tmp,
      });
    }, 2000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    let { step } = this.props;
    return (
      <div className="steps-content" style={{ backgroundColor: "#1A1B2C" }}>
        <div className="fadeInAnim loginbg">
          <div className="leftpanel" onClick={this.panelClick}>
            <center>
              <div className={style.loadingBg}>
                <div className={style.loadingCont}>
                  <Progress
                    className={style.progressSty}
                    strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }}
                    percent={parseFloat(this.state.percent)}
                  />
                  <div className={style.tipContainer}>
                    <p className={style.tip}>{intl.get("Loading.transData")}</p>
                  </div>
                </div>
              </div>
            </center>
          </div>
        </div>
      </div>
    );
  }
}

export default Loading;
