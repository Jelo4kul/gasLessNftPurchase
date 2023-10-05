const { ECDSAProvider } = require('@zerodev/sdk');
const { LocalAccountSigner } = require('@alchemy/aa-core');
const { parseEther } = require('viem');
const { getNftEncodedData } = require('./openseaNftData');

require("dotenv").config();


//***************************************************************//
//***************************************************************//
//************************INITIALIZATIONS************************//
//***************************************************************//
//***************************************************************//


//ZeroDev Project ID
const projectId = process.env.PROJECT_ID_SEPOLIA
//The "owner of the AA wallet, which in this case is a private key"
const owner = LocalAccountSigner.privateKeyToAccountSigner(process.env.PRIVATE_KEY)
//the nft address we wish to interact with
const nftAddress = '0xd71447adc0308ba294e1ab836529a314fb2ff3f2';
//The token identifier of the NFT we would like to acquire
const tokenId = 57;
//The chain the nft contract is deployed to
const chain = 'sepolia';
const openseaMarkeplaceAddress = '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC';

const main = async () => {
    //create the Smart wallet
    let ecdsaProvider = await ECDSAProvider.init({
        projectId,
        owner
    });

    //Get the address of the Smart Wallet
    const address = await ecdsaProvider.getAddress();

    //The data needed to purchase an Nft on opensea
    const openseaData = await getNftEncodedData(chain, nftAddress, tokenId, address)

    if (openseaData) {
        console.log("Sending User Operation...");
        const { hash } = await ecdsaProvider.sendUserOperation({
            //The address of opensea
            target: openseaMarkeplaceAddress,
            value: parseEther('0.02'),
            data: openseaData
        })

        //This will wait for the user operation to be included in a transaction that's been mined.
        await ecdsaProvider.waitForUserOperationTransaction(hash);
    }

}

main().then(() => process.exit(0))



