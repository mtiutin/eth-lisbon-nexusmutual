const fetch = require('node-fetch');
const { time, expectRevert, ether } = require('@openzeppelin/test-helpers');
const bigDecimal = require('js-big-decimal');
// const web3 = require("web3");
const BN = web3.utils.BN;
const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
chai.use(require('bn-chai')(BN));
chai.use(require('chai-match'));

const hex = string => '0x' + Buffer.from(string).toString('hex');

const Distributor = artifacts.require('Distributor');
const NXMaster = artifacts.require('INXMMaster');
const NXMToken = artifacts.require('INXMToken');
const TokenController = artifacts.require('ITokenController');
const SelfKyc = artifacts.require('SelfKyc');
const wNXM = artifacts.require('wNXM');
const Pool = artifacts.require('IPool');
const UniswapRouter = artifacts.require('IUniswapV2Router01');
const UniswapFactory = artifacts.require('IUniswapV2Factory');
const ERC20Detailed = artifacts.require('IERC20Detailed');
const Gateway2 = artifacts.require('Gateway2');
const Distributor2 = artifacts.require('Distributor2');




function toBN(number) {
    return web3.utils.toBN(number);
}

function printEvents(txResult, strdata){
    console.log(strdata," events:",txResult.logs.length);
    for(var i=0;i<txResult.logs.length;i++){
        let argsLength = Object.keys(txResult.logs[i].args).length;
        console.log("Event ",txResult.logs[i].event, "  length:",argsLength);
        for(var j=0;j<argsLength;j++){
            if(!(typeof txResult.logs[i].args[j] === 'undefined') && txResult.logs[i].args[j].toString().length>0)
                console.log(">",i,">",j," ",txResult.logs[i].args[j].toString());
        }
    }

}


contract('Buy Protection Distributor', (accounts) => {
 
    let admin   = accounts[0];
    const decimals = toBN(10).pow(toBN(18));
  
    console.log("Test: Admin: "+admin);
    //KOVAN
    const KYC_ADDRESS = '0x74e0BE134744cA896196796A58203D090bc791fE';
    const DISTRIBUTOR_ADDRESS = '0x2a996576CDc0a3EfF3c1dcA853F4C80a81EaCF33';
    const UNISWAP_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    const DAI_ADDRESS = '0x5c422252c6a47cdacf667521566bf7bd5b0d769b';
    const API_REQUEST_ORIGIN = "*";

    let wnxmToken;
    let master;
    let distributor;
    let nxmToken;
    let tokenController;
    let pool1;
    let selfKYC;
    let uniswapRouter;
    // const startDate = 1627383600; // Jul 27 11:00 UTC
    // const startDate = Math.round((new Date().getTime())/1000)+10;


    before(async () => {

        
        //deploy wNXM
        distributor = await Distributor.at(DISTRIBUTOR_ADDRESS);
        master = await NXMaster.at(await distributor.master.call());
        nxmToken = await NXMToken.at(await master.tokenAddress.call());
        await wNXM.new(nxmToken.address).then(instance => wnxmToken = instance);
        tokenController = await TokenController.at(await master.getLatestAddress(hex('TC')));
        pool1 = await Pool.at(await master.getLatestAddress(hex('P1')));
        selfKYC = await SelfKyc.at(KYC_ADDRESS);
        uniswapRouter = await UniswapRouter.at(UNISWAP_ROUTER);

        if(true){
             // let masterAddress = await distributor.master.call();
            let gatewayAddress = await master.getLatestAddress.call(hex("GW"));
            console.log("gateWay address = ",gatewayAddress);
            // let gateway2;
            // await Gateway2.new().then(instance => gateway2 = instance);
            // await gateway2.changeMasterAddress.sendTransaction(master.address);
            // await gateway2.changeDependentContractAddress.sendTransaction();
            // await gateway2.initializeDAI.sendTransaction();

            let distributor2;
            await Distributor2.new(
                gatewayAddress,
                // gateway2.address,
                nxmToken.address,
                master.address,
                toBN(750),
                admin,
                "Distributor2",
                "DSTR2",
                DAI_ADDRESS,
                wnxmToken.address
                ).then(instance => distributor2 = instance);

            await selfKYC.joinMutual.sendTransaction(distributor2.address,{value:toBN('2000000000000000')});

            let isMember = await master.isMember.call(distributor2.address);
            console.log("Distributor 2. isMember = ",isMember); 
            
            distributor = await Distributor2.at(distributor2.address);
        } else{
            distributor = await Distributor.at(DISTRIBUTOR_ADDRESS);
            let gatewayAddress = await distributor.gateway.call();
            console.log("gateWay1 address = ",gatewayAddress);

            let gatewayAddress2 = await master.getLatestAddress.call(hex('GW'));
            console.log("gateWay2 address = ",gatewayAddress2);
        }

        console.log("master:",master.address);
        console.log("nxmToken:",nxmToken.address);
        console.log("wnxmToken:",wnxmToken.address);
        console.log("tokenController:",tokenController.address);
        console.log("pool1:",pool1.address);
        console.log("distributor:",distributor.address);

        console.log('approve NXM...');
        // needs to be done only once! necessary for receiving the locked NXM deposit.
        await distributor.approveNXM(tokenController.address, ether('100000'));
        
        
    });

    it('Create WNXM & Uniswap Pair', async () => {
        // return;
        //mint some NXM:
        //add admin address as a member.required to buy NXM
        // await selfKYC.joinMutual.sendTransaction(admin,{value:toBN('2000000000000000')});
        await selfKYC.joinMutual.sendTransaction(wnxmToken.address,{value:toBN('2000000000000000')});
        // await selfKYC.approveKyc.sendTransaction(wnxmToken.address);
        await pool1.buyNXM.sendTransaction(toBN(0),{from:admin, value:toBN(1).mul(decimals)});

        let balanceNXM = await nxmToken.balanceOf.call(admin);
        console.log("balanceNXM=",balanceNXM.toString());
        //wrap 3/4 into wNXM
        let wrapToBalance = balanceNXM.mul(toBN(3)).div(toBN(4));
        console.log("wrapToBalance=",wrapToBalance.toString());

        await nxmToken.approve.sendTransaction(wnxmToken.address, wrapToBalance, {from:admin});
        let canWrap = await wnxmToken.canWrap.call(admin,wrapToBalance);

        console.log("Can Wrap: ",canWrap[0]," ",canWrap[1]);
        await wnxmToken.wrap.sendTransaction(wrapToBalance);
        let balanceWNXM = await wnxmToken.balanceOf.call(admin);
        console.log("balanceWNXM=",balanceWNXM.toString());


        // balanceNXM = await nxmToken.balanceOf.call(admin);
        // let nxmLiquidityBalance = balanceNXM.div(toBN(2));
        // let wnxmLiquidityBalance = balanceWNXM.div(toBN(2));
        // let deadline = Math.round((new Date().getTime() + (1 * 24 * 60 * 60 * 1000))/1000);

        // await nxmToken.approve.sendTransaction(uniswapRouter.address, nxmLiquidityBalance, {from:admin});
        // await wnxmToken.approve.sendTransaction(uniswapRouter.address, wnxmLiquidityBalance, {from:admin});
        // await selfKYC.joinMutual.sendTransaction(uniswapRouter.address,{value:toBN('2000000000000000')});
        // let factory = await UniswapFactory.at(await uniswapRouter.factory.call());
        // let pairAddress = await factory.getPair.call(nxmToken.address, wnxmToken.address);
        // await selfKYC.joinMutual.sendTransaction(pairAddress,{value:toBN('2000000000000000')});
        // let addLiquidityRes = await uniswapRouter.addLiquidity.sendTransaction(
        //     nxmToken.address,
        //     wnxmToken.address,
        //     nxmLiquidityBalance,
        //     wnxmLiquidityBalance,
        //     toBN(0),
        //     toBN(0),
        //     admin,
        //     deadline
        // );
        // printEvents(addLiquidityRes,"Add liquidity");
    });

    // it('BuyProtection ETH', async () => {
    //     // return;

    //     console.log({
    //         DISTRIBUTOR_ADDRESS,
    //         API_REQUEST_ORIGIN,
    //     });

    //     const headers = {
    //         Origin: API_REQUEST_ORIGIN,
    //     };

    //     // Setup your cover data.
    //     const coverData = {
    //         coverAmount: '1', // ETH in units not wei
    //         currency: 'ETH',
    //         asset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // stands for ETH
    //         period: '111', // days
    //         contractAddress: '0x0000000000000000000000000000000000000005', // the contract you will be buying cover for
    //     };

    //     // URL to request a quote for.
    //     const quoteURL = 'https://api.staging.nexusmutual.io/v1/quote?' +
    //         `coverAmount=${coverData.coverAmount}&currency=${coverData.currency}&period=${coverData.period}&contractAddress=${coverData.contractAddress}`;

    //     console.log(quoteURL);

    //     const quote = await fetch(quoteURL, { headers }).then(r => r.json());
    //     console.log(quote);

    //     // encode the signature result in the data field
    //     const data = web3.eth.abi.encodeParameters(
    //         ['uint', 'uint', 'uint', 'uint', 'uint8', 'bytes32', 'bytes32'],
    //         [quote.price, quote.priceInNXM, quote.expiresAt, quote.generatedAt, quote.v, quote.r, quote.s],
    //     );

        

    //     // add the fee on top of the base price
    //     const feePercentage = await distributor.feePercentage();
    //     const basePrice = new BN(quote.price);
        

    //     const priceWithFee = basePrice.mul(feePercentage).divn(10000).add(basePrice);

    //     // quote-api signed quotes are cover type = 0; only one cover type is supported at this point.
    //     const COVER_TYPE = 0;

    //     const amountInWei = ether(coverData.coverAmount.toString());

    //     console.log({
    //         feePercentage: feePercentage.toString(),
    //         priceWithFee: priceWithFee.toString(),
    //         amountInWei: amountInWei.toString(),
    //         COVER_TYPE,
    //     });

    //     // price is deterministic right now. can set the max price to be equal with the actual price.
    //     const maxPriceWithFee = priceWithFee;
    //     // priceWithFee = 0;

    //     // execute the buy cover operation on behalf of the user.
    //     // console.log("data:");
    //     // console.log(coverData.contractAddress.toString());
    //     // console.log(coverData.asset.toString());
    //     // console.log(amountInWei.toString());
    //     // console.log(coverData.period.toString());
    //     // console.log(COVER_TYPE);
    //     // console.log(maxPriceWithFee.toString());
    //     // console.log(data.toString('hex'));
    //     // console.log(priceWithFee.toString());

    //     const tx = await distributor.buyCover(
    //         coverData.contractAddress,
    //         coverData.asset,
    //         amountInWei,
    //         coverData.period,
    //         COVER_TYPE,
    //         maxPriceWithFee,
    //         data, 
    //         {
    //             value: priceWithFee
    //         });

    //     const coverId = tx.logs[1].args.coverId.toString();
    //     console.log(`Bought cover with ETH successfully. cover id: ${coverId}`);
  
    // });

    // it('BuyProtection with DAI', async () => {
    //     // return;

    //     console.log({
    //         DISTRIBUTOR_ADDRESS,
    //         API_REQUEST_ORIGIN,
    //     });

    //     const headers = {
    //         Origin: API_REQUEST_ORIGIN,
    //     };

    //     // Setup your cover data.
    //     const coverData = {
    //         coverAmount: '1', // ETH in units not wei
    //         currency: 'DAI',
    //         asset: DAI_ADDRESS, // stands for DAI
    //         period: '111', // days
    //         contractAddress: '0x0000000000000000000000000000000000000006', // the contract you will be buying cover for
    //     };

    //     // URL to request a quote for.
    //     const quoteURL = 'https://api.staging.nexusmutual.io/v1/quote?' +
    //         `coverAmount=${coverData.coverAmount}&currency=${coverData.currency}&period=${coverData.period}&contractAddress=${coverData.contractAddress}`;

    //     console.log(quoteURL);

    //     const quote = await fetch(quoteURL, { headers }).then(r => r.json());
    //     console.log(quote);

    //     // encode the signature result in the data field
    //     const data = web3.eth.abi.encodeParameters(
    //         ['uint', 'uint', 'uint', 'uint', 'uint8', 'bytes32', 'bytes32'],
    //         [quote.price, quote.priceInNXM, quote.expiresAt, quote.generatedAt, quote.v, quote.r, quote.s],
    //     );

        

    //     // add the fee on top of the base price
    //     const feePercentage = await distributor.feePercentage();
    //     const basePrice = new BN(quote.price);
        
    //     let priceWithFee = basePrice.mul(feePercentage).divn(10000).add(basePrice);

    //     // quote-api signed quotes are cover type = 0; only one cover type is supported at this point.
    //     const COVER_TYPE = 0;

    //     const amountInWei = ether(coverData.coverAmount.toString());

    //     console.log({
    //         feePercentage: feePercentage.toString(),
    //         priceWithFee: priceWithFee.toString(),
    //         amountInWei: amountInWei.toString(),
    //         COVER_TYPE,
    //     });

    //     // price is deterministic right now. can set the max price to be equal with the actual price.
    //     const maxPriceWithFee = priceWithFee;

    //     // // execute the buy cover operation on behalf of the user.
    //     // console.log("data:");
    //     // console.log(coverData.contractAddress.toString());
    //     // console.log(coverData.asset.toString());
    //     // console.log(amountInWei.toString());
    //     // console.log(coverData.period.toString());
    //     // console.log(COVER_TYPE);
    //     // console.log(maxPriceWithFee.toString());
    //     // console.log(data.toString('hex'));
    //     // console.log(priceWithFee.toString());

    //     let daiToken = await ERC20Detailed.at(DAI_ADDRESS);
    //     console.log("DAI Balance = ",(await daiToken.balanceOf.call(admin)).toString());
    //     console.log("Price with fee: ",maxPriceWithFee.toString());

    //     await daiToken.approve(distributor.address,maxPriceWithFee,{from:admin});

    //     const tx = await distributor.buyCover(
    //         coverData.contractAddress,
    //         coverData.asset,
    //         amountInWei,
    //         coverData.period,
    //         COVER_TYPE,
    //         maxPriceWithFee,
    //         data, 
    //         {
    //             // value: priceWithFee,
    //             from:admin
    //         });

    //     const coverId = tx.logs[1].args.coverId.toString();
    //     console.log(`Bought cover wth DAI successfully. cover id: ${coverId}`);
  
    // });

    it('BuyProtection NXM', async () => {
             

        const headers = {
            Origin: API_REQUEST_ORIGIN,
        };

        // Setup your cover data.
        const coverData = {
            coverAmount: '1', // ETH in units not wei
            currency: 'ETH',
            asset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // stands for DAI
            period: '111', // days
            contractAddress: '0x0000000000000000000000000000000000000005', // the contract you will be buying cover for
        };

        // URL to request a quote for.
        const quoteURL = 'https://api.staging.nexusmutual.io/v1/quote?' +
            `coverAmount=${coverData.coverAmount}&currency=${coverData.currency}&period=${coverData.period}&contractAddress=${coverData.contractAddress}`;

        console.log(quoteURL);

        const quote = await fetch(quoteURL, { headers }).then(r => r.json());
        console.log(quote);

        // encode the signature result in the data field
        const data = web3.eth.abi.encodeParameters(
            ['uint', 'uint', 'uint', 'uint', 'uint8', 'bytes32', 'bytes32'],
            [quote.price, quote.priceInNXM, quote.expiresAt, quote.generatedAt, quote.v, quote.r, quote.s],
        );

        

        // add the fee on top of the base price
        const feePercentage = await distributor.feePercentage();
        const basePrice = new BN(quote.priceInNXM);
        let priceWithFee = basePrice.mul(feePercentage).divn(10000).add(basePrice);

        // quote-api signed quotes are cover type = 0; only one cover type is supported at this point.
        const COVER_TYPE = 0;

        const amountInWei = ether(coverData.coverAmount.toString());

        console.log("WNXMDATA ",{
            feePercentage: feePercentage.toString(),
            priceWithFee: priceWithFee.toString(),
            amountInWei: amountInWei.toString(),
            COVER_TYPE,
        });

        // price is deterministic right now. can set the max price to be equal with the actual price.
        const maxPriceWithFee = priceWithFee;

        // let daiToken = await ERC20Detailed.at(DAI_ADDRESS);
        console.log("NXM Balance = ",(await nxmToken.balanceOf.call(admin)).toString());
        console.log("Price with fee: ",maxPriceWithFee.toString());

        let txNXM;

        if(true){
            //buy with wrapped NXM
            await wnxmToken.approve(distributor.address,maxPriceWithFee,{from:admin});

            txNXM = await distributor.buyCoverWNXM(
                    coverData.contractAddress,
                    coverData.asset,
                    amountInWei,
                    coverData.period,
                    COVER_TYPE,
                    maxPriceWithFee,
                    data, 
                    {
                        // value: priceWithFee,
                        from:admin
                    });
            printEvents(txNXM,"buy wnxm");

        } else {
            //buy with pure NXM
            await nxmToken.approve(distributor.address,maxPriceWithFee,{from:admin});

            // await expectRevert(
            txNXM = await distributor.buyCoverNXM(
                    coverData.contractAddress,
                    coverData.asset,
                    amountInWei,
                    coverData.period,
                    COVER_TYPE,
                    maxPriceWithFee,
                    data, 
                    {
                        // value: priceWithFee,
                        from:admin
                    });
            //     'revert'
            // ); 

        }

        //buy cover with ETH with the same quotation
        
        const basePriceETH = new BN(quote.price);
        

        const priceWithFeeETH = basePriceETH.mul(feePercentage).divn(10000).add(basePriceETH);

        console.log("ETHDATA ", {
            feePercentage: feePercentage.toString(),
            priceWithFee: priceWithFeeETH.toString(),
            amountInWei: amountInWei.toString(),
            COVER_TYPE,
        });

        // price is deterministic right now. can set the max price to be equal with the actual price.
        const maxPriceWithFeeETH = priceWithFeeETH;
       
        // txNXM = await distributor.buyCover(
        //     coverData.contractAddress,
        //     coverData.asset,
        //     amountInWei,
        //     coverData.period,
        //     COVER_TYPE,
        //     maxPriceWithFeeETH,
        //     data, 
        //     {
        //         value: priceWithFeeETH
        //     });


        // const coverId = txNXM.logs[1].args.coverId.toString();
        // console.log(`Bought cover wth DAI successfully. cover id: ${coverId}`);
  
    });
    
   
});
