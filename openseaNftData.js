const { encodeFunctionData, parseAbi } = require("viem");
require("dotenv").config();

//Given an array that looks like this [{},{}], convert to this [[],[]]
const arrayOfObjToarrOfarrays = (arr) => {
    return arr.map(obj => Object.values(obj))
}

//Retrieves all the information necessary to fufill a buy order for an NFT
const retrieveNftInfo = async (chain, nftAddress, tokenId, address) => {
    //retrieve the listing_data which contains the order_hash and protocol_address
    const listing = await fetch(`https://testnets-api.opensea.io/v2/orders/${chain}/seaport/listings?asset_contract_address=${nftAddress}&limit=1&token_ids=${tokenId}&order_by=created_date&order_direction=desc`, {
        headers: {
            "Content-Type": "application/json",
            //'X-API-KEY': process.env.OPENSEA_API_KEY_MAINNET
        },
    });

    const listing_data = await listing.json();
    let data;

    try {
        if (listing_data) {
            //retrieve the basic order parameters using the order hash and protocol address obtained from the listing data
            const response = await fetch("https://testnets-api.opensea.io/v2/listings/fulfillment_data", {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    //   'X-API-KEY': process.env.OPENSEA_API_KEY_MAINNET
                },
                body: JSON.stringify({
                    "listing": {
                        "hash": listing_data.orders[0]?.order_hash,
                        "chain": chain,
                        "protocol_address": listing_data.orders[0]?.protocol_address
                    },
                    "fulfiller": {
                        "address": address
                    }
                })
            });

            data = await response.json();
        }


    } catch (error) {
        console.log(error)
    }

    return data;
}

const constructNftEncodedData = async (data) => {
    //"value" is the cost of the Nft
    const value = data.fulfillment_data.transaction.value;
    //"basicOrderParams" contains a list of all the data we need to fufill an order
    const basicOrderParams = data.fulfillment_data.transaction.input_data.parameters;
    //"to" represents the marketplace address through which we interact to purchase the NFT, specifically Opensea in this instance.
    const to = data.fulfillment_data.transaction.to;

    // Define the contract ABI for interacting with the NFT contract
    const contractABI = parseAbi([
        'function fulfillBasicOrder_efficient_6GL6yc((address,uint256,uint256,address,address,address,uint256,uint256,uint8,uint256,uint256,bytes32,uint256,bytes32,bytes32,uint256,(uint256,address)[],bytes)) external payable returns (bool fulfilled)',
    ]);

    //More on Domains: https://opensea.notion.site/opensea/Seaport-Order-Attributions-ec2d69bf455041a5baa490941aad307f
    const dataSuffix = '00000000360c6ebe';
    //"encodeFunctionData" returns the function selector and arguments in bytes.
    //The data has to be encoded in bytes, so that we can sign the data and send it to the blockchain
    const encodedData = encodeFunctionData({
        abi: contractABI,
        functionName: 'fulfillBasicOrder_efficient_6GL6yc',
        args: [[
            basicOrderParams.considerationToken,
            basicOrderParams.considerationIdentifier,
            basicOrderParams.considerationAmount,
            basicOrderParams.offerer,
            basicOrderParams.zone,
            basicOrderParams.offerToken,
            basicOrderParams.offerIdentifier,
            basicOrderParams.offerAmount,
            basicOrderParams.basicOrderType,
            basicOrderParams.startTime,
            basicOrderParams.endTime,
            basicOrderParams.zoneHash,
            basicOrderParams.salt,
            basicOrderParams.offererConduitKey,
            basicOrderParams.fulfillerConduitKey,
            basicOrderParams.totalOriginalAdditionalRecipients,
            arrayOfObjToarrOfarrays(basicOrderParams.additionalRecipients),
            basicOrderParams.signature
        ]]
    })

    //we append the domain tag to the encoded data.
    //More on Domains: https://opensea.notion.site/opensea/Seaport-Order-Attributions-ec2d69bf455041a5baa490941aad307f
    const encodedDataWithDomainName = encodedData + dataSuffix;

    return encodedDataWithDomainName;

}

const getNftEncodedData = async (chain, nftAddress, tokenId, address) => {

    let result;
    const data = await retrieveNftInfo(chain, nftAddress, tokenId, address);

    if (data && data.fulfillment_data) {
        result = await constructNftEncodedData(data);
    }

    return result;

}

module.exports = { getNftEncodedData }
