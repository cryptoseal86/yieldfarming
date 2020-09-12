$(function() {
    consoleInit();
    start(main);
});

async function main() {
    const poolAddresses = {
      "eth/idol": "0x767696e13ff990d09954c7a36a49e2c4a1c804bd",
      "0918-200": "0xE8fF39F45DA7a0958e0f32a856132B1Af58862Cb",
      "1023-160": "0xAECAEbE186C5c29463ac2A49a7D58E28983Fb77D",
      "0925-200": "0x3dc8A05439C69F456f6d015001Ec967cdC0CDca2",
      "1016-170": "0xc05679F8fFbCa9a578fE6C1A8A9c77CD7718d42e",
      "1002-190": "0x4bD633aA11eDC7472A22eA0FC4855D2126efBB65",
      "1009-180": "0x0DCE1E375FC40A1917408b10FAADE332Ad54E6e5"
    };
    const teamAddress = "0xe462eae2aef5defbcddc43995b7f593e6f0ae22f";

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...\n");

    const poolsData = {};
    const poolNames = Object.keys(poolAddresses);
    for (let i = 0; i < poolNames.length; i++) {
      poolsData[poolNames[i]] = {};
      poolsData[poolNames[i]].contractInstance = new ethers.Contract(poolAddresses[poolNames[i]], BOXEXCHANGE_ABI, App.provider);
      poolsData[poolNames[i]].userBalance = BigInt(await poolsData[poolNames[i]].contractInstance.balanceOf(App.YOUR_ADDRESS));
      poolsData[poolNames[i]].supply = BigInt(await poolsData[poolNames[i]].contractInstance.totalSupply());
      poolsData[poolNames[i]].teamBalance = BigInt(await poolsData[poolNames[i]].contractInstance.balanceOf(teamAddress));
      poolsData[poolNames[i]].reward = poolNames[i] === "eth/idol" ? 400n * e8 : 100n * e8;
      poolsData[poolNames[i]].exchangeData = await poolsData[poolNames[i]].contractInstance.getExchangeData();
    }

    const prices = await lookUpPrices(["lien", "ethereum"]);
    _print("========== PRICES ==========");
    _print(`1 LIEN   = $${prices.lien.usd}`);
    _print("");
    _print("========== APYs ==========");
    _print("");
    for (let i = 0; i < poolNames.length; i++) {
      const exlusiveSupply = (poolsData[poolNames[i]].supply - poolsData[poolNames[i]].teamBalance) / e8;
      const rewardInTokensPerWeek = Number(poolsData[poolNames[i]].reward / e8) * (bigIntPercent(1n, exlusiveSupply) / 100);
      const rewardInDollarsPerWeek = rewardInTokensPerWeek * prices.lien.usd;

      let sharePrice = 0;
      if (poolNames[i] === "eth/idol") {
        const ethPrice = (BigInt(poolsData[poolNames[i]].exchangeData._reserve0)/e8)/(BigInt(poolsData[poolNames[i]].exchangeData._reserve1)/e18);
        const lockedFunds = (BigInt(poolsData[poolNames[i]].exchangeData._reserve0)/e8) + ((BigInt(poolsData[poolNames[i]].exchangeData._reserve1)/e18) * ethPrice);
        sharePrice = Number(lockedFunds) / Number(poolsData[poolNames[i]].supply / e8);
        console.log(lockedFunds, poolsData[poolNames[i]].exchangeData, ethPrice, sharePrice)
      } else {
        const lptPrice = (BigInt(poolsData[poolNames[i]].exchangeData._reserve0)/BigInt(poolsData[poolNames[i]].exchangeData._reserve1));
        const lockedFunds = (BigInt(poolsData[poolNames[i]].exchangeData._reserve0)/e8) + ((BigInt(poolsData[poolNames[i]].exchangeData._reserve1)/e8) * lptPrice);
        sharePrice =  Number(lockedFunds) / Number(poolsData[poolNames[i]].supply / e8);
        console.log(lockedFunds, poolsData[poolNames[i]].exchangeData, lptPrice, sharePrice)
      }
      const yearlyRewardsInDollar = rewardInDollarsPerWeek * 52;
      _print(`${poolNames[i].toUpperCase()}: ${toFixed(yearlyRewardsInDollar/sharePrice*100, 2)}%`)
    }

    _print("")
    _print("========== LIQUIDITY =========");
    _print(`Your pools'shares:`);
    for (let i = 0; i < poolNames.length; i++) {
      const poolShare = bigIntPercent(poolsData[poolNames[i]].userBalance, poolsData[poolNames[i]].supply);
      poolShare !== 0 ? _print(`${poolNames[i]}: ${toFixed(poolShare, 4)}%`) : null;
    }
    _print("");
    _print(`Your pools'shares(excluding lien team):`);
    for (let i = 0; i < poolNames.length; i++) {
      const exlusiveSupply = poolsData[poolNames[i]].supply - poolsData[poolNames[i]].teamBalance;
      const poolShare = bigIntPercent(poolsData[poolNames[i]].userBalance, exlusiveSupply);
      poolShare !== 0 ? _print(`${poolNames[i].toUpperCase()}: ${toFixed(poolShare, 4)}%`) : null;
    }

    hideLoading();
}
